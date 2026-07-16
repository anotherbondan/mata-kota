import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const { procedure: publicProcedure, router } = t;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({
			cause: "No session",
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

export const supervisorProcedure = protectedProcedure.use(
	async ({ ctx, next }) => {
		const currentUser = await ctx.db.user.findUnique({
			select: {
				id: true,
				role: true,
			},
			where: { id: ctx.session.user.id },
		});

		if (currentUser?.role !== "SUPERVISOR") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Supervisor access required",
			});
		}

		return next({
			ctx: {
				...ctx,
				currentUser,
			},
		});
	}
);
