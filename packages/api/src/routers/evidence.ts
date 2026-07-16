import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router, supervisorProcedure } from "../index";
import { evidenceTypeSchema, idSchema } from "../schemas";

const evidenceInput = z
	.object({
		incidentId: idSchema,
		sourceReportId: idSchema.optional(),
		textSnippet: z.string().trim().max(5000).optional(),
		type: evidenceTypeSchema,
		url: z.url().optional(),
	})
	.refine((value) => value.textSnippet || value.url, {
		message: "Evidence requires a URL or text snippet",
	});

export const evidenceRouter = router({
	add: protectedProcedure
		.input(evidenceInput)
		.mutation(async ({ ctx, input }) => {
			const [incident, sourceReport] = await Promise.all([
				ctx.db.incident.findUnique({
					select: { id: true },
					where: { id: input.incidentId },
				}),
				input.sourceReportId
					? ctx.db.report.findUnique({
							select: { id: true },
							where: { id: input.sourceReportId },
						})
					: Promise.resolve(null),
			]);

			if (!incident) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Incident not found",
				});
			}
			if (input.sourceReportId && !sourceReport) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Source report not found",
				});
			}

			return ctx.db.evidence.create({ data: input });
		}),
	list: protectedProcedure
		.input(z.object({ incidentId: idSchema }))
		.query(({ ctx, input }) =>
			ctx.db.evidence.findMany({
				include: {
					sourceReport: {
						select: { category: true, id: true, reportedAt: true },
					},
				},
				orderBy: { createdAt: "desc" },
				where: { incidentId: input.incidentId },
			})
		),
	remove: supervisorProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ ctx, input }) => {
			const evidence = await ctx.db.evidence.findUnique({
				select: { id: true },
				where: { id: input.id },
			});
			if (!evidence) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Evidence not found",
				});
			}

			return ctx.db.evidence.delete({ where: { id: evidence.id } });
		}),
});
