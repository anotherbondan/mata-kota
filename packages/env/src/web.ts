import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	client: {
		NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
		NEXT_PUBLIC_MOCK_FEEDS_ENABLED: z.enum(["true", "false"]).default("true"),
		NEXT_PUBLIC_SOCKET_IO_PATH: z.string().default("/api/socket"),
	},
	emptyStringAsUndefined: true,
	runtimeEnv: {
		NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
			process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
		NEXT_PUBLIC_MOCK_FEEDS_ENABLED: process.env.NEXT_PUBLIC_MOCK_FEEDS_ENABLED,
		NEXT_PUBLIC_SOCKET_IO_PATH: process.env.NEXT_PUBLIC_SOCKET_IO_PATH,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
