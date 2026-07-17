import { createPrismaClient } from "@mata-kota/db";
import { env } from "@mata-kota/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

export function createAuth() {
	const prisma = createPrismaClient();

	return betterAuth({
		user: {
			additionalFields: {
				role: {
					type: "string",
					required: true,
					defaultValue: "OPERATOR",
				},
			},
		},
		baseURL: env.BETTER_AUTH_URL,
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [nextCookies()],
		secret: env.BETTER_AUTH_SECRET,

		trustedOrigins: [env.CORS_ORIGIN],
	});
}

export const auth = createAuth();
