import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	server: {
		AI_SERVICE_URL: z.url().default("http://localhost:8000"),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CLOUDINARY_API_KEY: z.string().optional(),
		CLOUDINARY_API_SECRET: z.string().optional(),
		CLOUDINARY_CLOUD_NAME: z.string().optional(),
		CORS_ORIGIN: z.url(),
		DATABASE_URL: z.string().min(1),
		MAPBOX_ACCESS_TOKEN: z.string().optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		REDIS_URL: z
			.string()
			.regex(/^rediss?:\/\//, "REDIS_URL must use redis:// or rediss://")
			.optional(),
		SOCKET_IO_PATH: z.string().default("/api/socket"),
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
