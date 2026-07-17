import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { operatorProcedure, protectedProcedure, router } from "../index";
import {
	idSchema,
	incidentCategorySchema,
	latitudeSchema,
	longitudeSchema,
	paginationSchema,
	severitySchema,
} from "../schemas";

const reportDetailInclude = {
	evidence: {
		include: {
			incident: {
				select: { category: true, id: true, severity: true, status: true },
			},
		},
		orderBy: { createdAt: "desc" as const },
	},
};

export const reportsRouter = router({
	byId: protectedProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ ctx, input }) => {
			const report = await ctx.db.report.findUnique({
				include: reportDetailInclude,
				where: { id: input.id },
			});

			if (!report) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
			}

			return report;
		}),
	convertToIncident: operatorProcedure
		.input(
			z.object({
				category: incidentCategorySchema,
				reportId: idSchema,
				severity: severitySchema.default("LOW"),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const incident = await ctx.db.$transaction(async (transaction) => {
				const report = await transaction.report.findUnique({
					where: { id: input.reportId },
				});

				if (!report) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Report not found",
					});
				}

				const existingSource = await transaction.incidentSource.findFirst({
					select: { incidentId: true },
					where: { sourceId: report.id, sourceType: "REPORT" },
				});
				if (existingSource) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Report is already linked to an incident",
					});
				}

				return transaction.incident.create({
					data: {
						category: input.category,
						...(report.mediaUrl
							? {
									evidence: {
										create: {
											sourceReportId: report.id,
											type: "PHOTO",
											url: report.mediaUrl,
										},
									},
								}
							: {}),
						lat: report.lat,
						lng: report.lng,
						severity: input.severity,
						sources: {
							create: { sourceId: report.id, sourceType: "REPORT" },
						},
						statusLogs: {
							create: {
								changedBy: ctx.session.user.id,
								note: `Created from report ${report.id}`,
								toStatus: "REPORTED",
							},
						},
					},
					include: {
						evidence: true,
						sources: true,
						statusLogs: true,
					},
				});
			});
			return incident;
		}),
	create: operatorProcedure
		.input(
			z.object({
				category: z.string().trim().min(2).max(100),
				description: z.string().trim().min(5).max(5000),
				lat: latitudeSchema,
				lng: longitudeSchema,
				mediaUrl: z.url().optional(),
				reportedAt: z.coerce.date().default(() => new Date()),
				reporterRef: z.string().trim().max(100).optional(),
			})
		)
		.mutation(({ ctx, input }) => ctx.db.report.create({ data: input })),
	delete: operatorProcedure
		.input(z.object({ id: idSchema }))
		.mutation(({ ctx, input }) =>
			ctx.db.$transaction(async (transaction) => {
				const linkedIncident = await transaction.incidentSource.findFirst({
					select: { incidentId: true },
					where: { sourceId: input.id, sourceType: "REPORT" },
				});
				if (linkedIncident) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "A report linked to an incident cannot be deleted",
					});
				}

				const report = await transaction.report.findUnique({
					select: { id: true },
					where: { id: input.id },
				});
				if (!report) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Report not found",
					});
				}

				return transaction.report.delete({ where: { id: report.id } });
			})
		),
	list: protectedProcedure
		.input(
			paginationSchema
				.extend({
					category: z.string().trim().min(1).optional(),
					from: z.coerce.date().optional(),
					search: z.string().trim().min(1).max(100).optional(),
					to: z.coerce.date().optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;

			const user = ctx.session.user as any;
			const regionFilter = user.role === "SUPERVISOR" && user.region ? (
				user.supervisorLevel === "POLRES" ? { city: user.region } : 
				user.supervisorLevel === "POLDA" ? { province: user.region } : {}
			) : {};

			const items = await ctx.db.report.findMany({
				cursor: input?.cursor ? { id: input.cursor } : undefined,
				orderBy: { reportedAt: "desc" },
				skip: input?.cursor ? 1 : 0,
				take: limit + 1,
				where: {
					...regionFilter,
					...(input?.category
						? { category: { equals: input.category, mode: "insensitive" } }
						: {}),
					...(input?.from || input?.to
						? {
								reportedAt: {
									...(input.from ? { gte: input.from } : {}),
									...(input.to ? { lte: input.to } : {}),
								},
							}
						: {}),
					...(input?.search
						? {
								OR: [
									{ category: { contains: input.search, mode: "insensitive" } },
									{
										description: {
											contains: input.search,
											mode: "insensitive",
										},
									},
									{
										reporterRef: {
											contains: input.search,
											mode: "insensitive",
										},
									},
								],
							}
						: {}),
				},
			});
			const nextItem = items.length > limit ? items.pop() : undefined;

			return { items, nextCursor: nextItem?.id ?? null };
		}),
	simulateFeed: operatorProcedure.mutation(async ({ ctx }) => {
		const result = await ctx.db.$transaction(async (transaction) => {
			const minuteBucket = Math.floor(Date.now() / 60_000);
			const reporterRef = `MOCK-FEED-${minuteBucket}`;
			const existing = await transaction.report.findFirst({
				select: { id: true },
				where: { reporterRef },
			});
			if (existing) {
				const source = await transaction.incidentSource.findFirst({
					select: { incidentId: true },
					where: { sourceId: existing.id, sourceType: "REPORT" },
				});
				return { created: false, incidentId: source?.incidentId ?? null };
			}

			const scenarios = [
				{
					category: "THEFT" as const,
					description:
						"Laporan warga mengenai dugaan pencurian di area pertokoan.",
					lat: -6.1751,
					lng: 106.8272,
					severity: "HIGH" as const,
				},
				{
					category: "ALTERCATION" as const,
					description: "Keributan kelompok terpantau di ruang publik.",
					lat: -6.2088,
					lng: 106.8456,
					severity: "MEDIUM" as const,
				},
				{
					category: "TRAFFIC_INCIDENT" as const,
					description: "Laporan kecelakaan lalu lintas dengan hambatan jalur.",
					lat: -6.1667,
					lng: 106.7994,
					severity: "LOW" as const,
				},
			] as const;
			const scenario = scenarios[minuteBucket % scenarios.length];
			if (!scenario) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Mock scenario unavailable",
				});
			}
			const report = await transaction.report.create({
				data: {
					category: scenario.category,
					description: scenario.description,
					lat: scenario.lat,
					lng: scenario.lng,
					city: "Jakarta Pusat",
					province: "DKI Jakarta",
					reportedAt: new Date(),
					reporterRef,
				},
			});
			const incident = await transaction.incident.create({
				data: {
					category: scenario.category,
					evidence: {
						create: {
							sourceReportId: report.id,
							textSnippet: scenario.description,
							type: "TEXT",
						},
					},
					lat: scenario.lat,
					lng: scenario.lng,
					city: "Jakarta Pusat",
					province: "DKI Jakarta",
					severity: scenario.severity,
					sources: { create: { sourceId: report.id, sourceType: "REPORT" } },
					statusLogs: {
						create: {
							changedBy: ctx.session.user.id,
							note: "Simulated feed",
							toStatus: "REPORTED",
						},
					},
				},
				select: { id: true },
			});

			return { created: true, incidentId: incident.id };
		});
		return result;
	}),
});
