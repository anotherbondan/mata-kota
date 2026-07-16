import { createPrismaClient } from "@mata-kota/db";
import { env } from "@mata-kota/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { authEmailToNrp, NRP_ERROR_MESSAGE } from "./nrp";

export function createAuth() {
	const prisma = createPrismaClient();

	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						const nrp = authEmailToNrp(user.email);

						if (!nrp) {
							throw new APIError("BAD_REQUEST", {
								message: NRP_ERROR_MESSAGE,
							});
						}

						await prisma.policeOfficer.create({
							data: {
								nrp,
								userId: user.id,
							},
						});
					},
				},
			},
		},
		emailAndPassword: {
			enabled: true,
		},
		hooks: {
			before: createAuthMiddleware(async (context) => {
				if (
					context.path !== "/sign-in/email" &&
					context.path !== "/sign-up/email"
				) {
					return;
				}

				const email = context.body?.email;
				const nrp = typeof email === "string" ? authEmailToNrp(email) : null;

				if (!nrp) {
					throw new APIError("BAD_REQUEST", {
						message: NRP_ERROR_MESSAGE,
					});
				}

				if (context.path === "/sign-in/email") {
					const officer = await prisma.policeOfficer.findUnique({
						select: { id: true },
						where: { nrp },
					});

					if (!officer) {
						throw new APIError("UNAUTHORIZED", {
							message: "Invalid NRP or password",
						});
					}
				}
			}),
		},
		plugins: [nextCookies()],
		secret: env.BETTER_AUTH_SECRET,

		trustedOrigins: [env.CORS_ORIGIN],
	});
}

export const auth = createAuth();
