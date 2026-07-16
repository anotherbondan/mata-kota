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

						const personnel = await prisma.personnel.findUnique({
							where: { badgeNo: nrp },
						});

						if (!personnel) {
							// If they register but aren't in the personnel system yet, we might want to reject them,
							// but for now we can just throw an error or create a placeholder.
							// Since the plan was to have Operators create personnel, when they register, they must exist!
							throw new APIError("BAD_REQUEST", {
								message: "Personnel record not found for this NRP",
							});
						}

						await prisma.personnel.update({
							where: { badgeNo: nrp },
							data: {
								userId: user.id,
							},
						});
						
						await prisma.user.update({
							where: { id: user.id },
							data: { role: "PERSONNEL" }
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
					const personnel = await prisma.personnel.findUnique({
						select: { id: true },
						where: { badgeNo: nrp },
					});

					if (!personnel) {
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
