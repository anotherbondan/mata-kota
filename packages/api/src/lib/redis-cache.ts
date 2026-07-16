import { env } from "@mata-kota/env/server";
import { createClient } from "redis";

const REDIS_RETRY_DELAY_MS = 30_000;

function reportRedisError(error: unknown) {
	console.warn("Redis cache unavailable; using database fallback", error);
}

function createRedisClient() {
	const client = createClient({
		socket: {
			connectTimeout: 1500,
			reconnectStrategy: false,
		},
		url: env.REDIS_URL,
	});
	client.on("error", reportRedisError);
	return client;
}

type RedisClient = ReturnType<typeof createRedisClient>;

interface RedisGlobalState {
	redisClient?: RedisClient;
	redisConnectPromise?: Promise<RedisClient | null>;
	redisRetryAfter?: number;
}

const globalState = globalThis as typeof globalThis & RedisGlobalState;
const inFlightLoads = new Map<string, Promise<unknown>>();

export const mapCacheKeys = {
	devices: "mata-kota:map:devices:v1",
	incidents: (activeOnly: boolean) =>
		`mata-kota:map:incidents:v1:${activeOnly ? "active" : "all"}`,
};

function getOrCreateRedisClient() {
	if (!globalState.redisClient && env.REDIS_URL) {
		globalState.redisClient = createRedisClient();
	}
	return globalState.redisClient ?? null;
}

function getRedisClient() {
	if (!env.REDIS_URL || (globalState.redisRetryAfter ?? 0) > Date.now()) {
		return null;
	}
	const client = getOrCreateRedisClient();
	if (!client || client.isReady) {
		return client;
	}
	if (globalState.redisConnectPromise) {
		return globalState.redisConnectPromise;
	}

	globalState.redisConnectPromise = client
		.connect()
		.then(() => client)
		.catch((error: unknown) => {
			globalState.redisRetryAfter = Date.now() + REDIS_RETRY_DELAY_MS;
			reportRedisError(error);
			if (client.isOpen) {
				client.destroy();
			}
			globalState.redisClient = undefined;
			return null;
		})
		.finally(() => {
			globalState.redisConnectPromise = undefined;
		});

	return globalState.redisConnectPromise;
}

function loadOnce<T>(key: string, loader: () => Promise<T>) {
	const existing = inFlightLoads.get(key) as Promise<T> | undefined;
	if (existing) {
		return existing;
	}
	const load = loader().finally(() => inFlightLoads.delete(key));
	inFlightLoads.set(key, load);
	return load;
}

export async function withRedisCache<T>(options: {
	key: string;
	loader: () => Promise<T>;
	ttlSeconds: number;
}) {
	const client = await getRedisClient();
	if (client) {
		try {
			const cached = await client.get(options.key);
			if (cached) {
				return JSON.parse(cached) as T;
			}
		} catch (error) {
			reportRedisError(error);
		}
	}

	const value = await loadOnce(options.key, options.loader);
	if (client) {
		try {
			await client.set(options.key, JSON.stringify(value), {
				EX: options.ttlSeconds,
			});
		} catch (error) {
			reportRedisError(error);
		}
	}
	return value;
}

export async function invalidateRedisCache(...keys: string[]) {
	const client = await getRedisClient();
	if (!client || keys.length === 0) {
		return;
	}
	try {
		await client.del(keys);
	} catch (error) {
		reportRedisError(error);
	}
}

export function invalidateIncidentMapCache() {
	return invalidateRedisCache(
		mapCacheKeys.incidents(true),
		mapCacheKeys.incidents(false)
	);
}
