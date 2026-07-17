import { env } from "@mata-kota/env/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const AI_REQUEST_TIMEOUT_MS = 5000;
const LEADING_SLASH_PATTERN = /^\//;

const aiHealthSchema = z.object({
	cache_freshness: z.string().nullable(),
	cache_ready: z.boolean().optional(),
	model_error: z.string().nullable().optional(),
	model_version: z.string().nullable(),
	ready: z.boolean().optional(),
	status: z.enum(["ok", "degraded"]),
});

const riskCellSchema = z.object({
	day_type: z.enum(["weekday", "weekend"]),
	grid_lat: z.number().min(-90).max(90),
	grid_lng: z.number().min(-180).max(180),
	hour_bucket: z.string().min(1),
	risk_score: z.number().min(0).max(100),
});

export const riskGridInputSchema = z
	.object({
		dayType: z.enum(["weekday", "weekend"]).optional(),
		hourBucket: z.string().min(1).max(16).optional(),
		version: z.enum(["current", "last_week", "last_month", "6_months_ago"]).optional(),
	})
	.optional()
	.default({});

function aiServiceUrl(pathname: string) {
	const baseUrl = env.AI_SERVICE_URL.endsWith("/")
		? env.AI_SERVICE_URL
		: `${env.AI_SERVICE_URL}/`;
	return new URL(pathname.replace(LEADING_SLASH_PATTERN, ""), baseUrl);
}

function aiGatewayError(message: string, cause: unknown) {
	return new TRPCError({
		cause,
		code: "BAD_GATEWAY",
		message,
	});
}

async function responseDetail(response: Response) {
	try {
		const payload = (await response.json()) as { detail?: unknown };
		return typeof payload.detail === "string" ? payload.detail : null;
	} catch {
		return null;
	}
}

async function requestAi<T>(pathname: string, schema: z.ZodType<T>) {
	let response: Response;

	try {
		response = await fetch(aiServiceUrl(pathname), {
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
		});
	} catch (cause) {
		throw aiGatewayError("AI service is unavailable", cause);
	}

	if (!response.ok) {
		const detail = await responseDetail(response);
		throw new TRPCError({
			code: response.status === 422 ? "BAD_REQUEST" : "BAD_GATEWAY",
			message:
				detail ?? `AI service request failed with status ${response.status}`,
		});
	}

	let payload: unknown;
	try {
		payload = await response.json();
	} catch (cause) {
		throw aiGatewayError("AI service returned invalid JSON", cause);
	}

	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		throw new TRPCError({
			cause: parsed.error,
			code: "BAD_GATEWAY",
			message: "AI service response did not match the expected contract",
		});
	}

	return parsed.data;
}

export function getAiHealth() {
	return requestAi("/health", aiHealthSchema);
}

export function getRiskGrid(input: z.infer<typeof riskGridInputSchema>) {
	const searchParams = new URLSearchParams();
	if (input.dayType) {
		searchParams.set("day_type", input.dayType);
	}
	if (input.hourBucket) {
		searchParams.set("hour_bucket", input.hourBucket);
	}
	if (input.version) {
		searchParams.set("version", input.version);
	}
	const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

	return requestAi(`/risk-score/batch${query}`, z.array(riskCellSchema));
}
