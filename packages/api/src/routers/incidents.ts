import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router, supervisorProcedure } from "../index";
import { canTransitionIncident } from "../lib/incident-lifecycle";
import {
	idSchema,
	incidentCategorySchema,
	incidentStatusSchema,
	latitudeSchema,
	longitudeSchema,
	paginationSchema,
	severitySchema,
	verificationStatusSchema,
} from "../schemas";

const incidentDetailInclude = {
	aiSummaries: { orderBy: { generatedAt: "desc" as const }, take: 1 },
	assignments: {
		include: {
			personnel: {
				select: { badgeNo: true, currentStatus: true, id: true, name: true },
			},
		},
		orderBy: { assignedAt: "desc" as const },
	},
	evidence: {
		include: {
			sourceReport: {
				select: { category: true, id: true, reportedAt: true },
			},
		},
		orderBy: { createdAt: "desc" as const },
	},
	sources: { orderBy: { matchedAt: "desc" as const } },
	statusLogs: {
		include: { user: { select: { id: true, name: true } } },
		orderBy: { changedAt: "asc" as const },
	},
};

export const incidentsRouter = router({
	byId: protectedProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ ctx, input }) => {
			const incident = await ctx.db.incident.findUnique({
				include: incidentDetailInclude,
				where: { id: input.id },
			});

			if (!incident) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Incident not found",
				});
			}

			return incident;
		}),
	create: protectedProcedure
		.input(
			z.object({
				category: incidentCategorySchema,
				lat: latitudeSchema,
				lng: longitudeSchema,
				severity: severitySchema.default("LOW"),
				verificationStatus: verificationStatusSchema.default("UNVERIFIED"),
			})
		)
		.mutation(({ ctx, input }) =>
			ctx.db.incident.create({
				data: {
					...input,
					statusLogs: {
						create: {
							changedBy: ctx.session.user.id,
							toStatus: "REPORTED",
						},
					},
				},
				include: incidentDetailInclude,
			})
		),
	list: protectedProcedure
		.input(
			paginationSchema
				.extend({
					category: incidentCategorySchema.optional(),
					from: z.coerce.date().optional(),
					severity: severitySchema.optional(),
					status: incidentStatusSchema.optional(),
					to: z.coerce.date().optional(),
					verificationStatus: verificationStatusSchema.optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;
			const items = await ctx.db.incident.findMany({
				cursor: input?.cursor ? { id: input.cursor } : undefined,
				include: {
					_count: {
						select: { assignments: true, evidence: true, sources: true },
					},
				},
				orderBy: { createdAt: "desc" },
				skip: input?.cursor ? 1 : 0,
				take: limit + 1,
				where: {
					...(input?.category ? { category: input.category } : {}),
					...(input?.from || input?.to
						? {
								createdAt: {
									...(input.from ? { gte: input.from } : {}),
									...(input.to ? { lte: input.to } : {}),
								},
							}
						: {}),
					...(input?.severity ? { severity: input.severity } : {}),
					...(input?.status ? { status: input.status } : {}),
					...(input?.verificationStatus
						? { verificationStatus: input.verificationStatus }
						: {}),
				},
			});
			const nextItem = items.length > limit ? items.pop() : undefined;

			return { items, nextCursor: nextItem?.id ?? null };
		}),
	transitionStatus: protectedProcedure
		.input(
			z.object({
				id: idSchema,
				note: z.string().trim().max(500).optional(),
				status: incidentStatusSchema,
			})
		)
		.mutation(({ ctx, input }) =>
			ctx.db.$transaction(async (transaction) => {
				const incident = await transaction.incident.findUnique({
					select: { id: true, status: true },
					where: { id: input.id },
				});

				if (!incident) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Incident not found",
					});
				}

				if (!canTransitionIncident(incident.status, input.status)) {
					throw new TRPCError({
						code: "CONFLICT",
						message: `Cannot transition incident from ${incident.status} to ${input.status}`,
					});
				}

				await transaction.incident.update({
					data: { status: input.status },
					where: { id: incident.id },
				});
				await transaction.incidentStatusLog.create({
					data: {
						changedBy: ctx.session.user.id,
						fromStatus: incident.status,
						incidentId: incident.id,
						note: input.note,
						toStatus: input.status,
					},
				});

				return transaction.incident.findUnique({
					include: incidentDetailInclude,
					where: { id: incident.id },
				});
			})
		),
	updateDetails: supervisorProcedure
		.input(
			z.object({
				category: incidentCategorySchema.optional(),
				id: idSchema,
				lat: latitudeSchema.optional(),
				lng: longitudeSchema.optional(),
				severity: severitySchema.optional(),
				verificationStatus: verificationStatusSchema.optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const exists = await ctx.db.incident.findUnique({
				select: { id: true },
				where: { id },
			});

			if (!exists) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Incident not found",
				});
			}

			return ctx.db.incident.update({
				data,
				include: incidentDetailInclude,
				where: { id },
			});
		}),
	verify: protectedProcedure
		.input(
			z.object({
				id: idSchema,
				note: z.string().trim().max(500).optional(),
				verificationStatus: verificationStatusSchema,
			})
		)
		.mutation(({ ctx, input }) =>
			ctx.db.$transaction(async (transaction) => {
				const incident = await transaction.incident.findUnique({
					select: { id: true, status: true },
					where: { id: input.id },
				});
				if (!incident) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Incident not found",
					});
				}

				const shouldAdvance =
					input.verificationStatus === "VERIFIED" &&
					incident.status === "REPORTED";
				await transaction.incident.update({
					data: {
						...(shouldAdvance ? { status: "VERIFIED" as const } : {}),
						verificationStatus: input.verificationStatus,
					},
					where: { id: incident.id },
				});
				if (shouldAdvance) {
					await transaction.incidentStatusLog.create({
						data: {
							changedBy: ctx.session.user.id,
							fromStatus: incident.status,
							incidentId: incident.id,
							note: input.note,
							toStatus: "VERIFIED",
						},
					});
				}

				return transaction.incident.findUnique({
					include: incidentDetailInclude,
					where: { id: incident.id },
				});
			})
		),
});
