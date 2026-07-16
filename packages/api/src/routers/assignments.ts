import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router, supervisorProcedure } from "../index";
import {
	assignmentOperationalStatusSchema,
	idSchema,
	paginationSchema,
} from "../schemas";

const assignmentInclude = {
	incident: {
		select: {
			category: true,
			id: true,
			lat: true,
			lng: true,
			severity: true,
			status: true,
		},
	},
	personnel: {
		select: {
			badgeNo: true,
			currentStatus: true,
			id: true,
			name: true,
			unitType: true,
		},
	},
};

const expectedIncidentStatus = {
	EN_ROUTE: "ASSIGNED",
	ON_SCENE: "EN_ROUTE",
	RESOLVED: "ON_SCENE",
} as const;

export const assignmentsRouter = router({
	byId: protectedProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ ctx, input }) => {
			const assignment = await ctx.db.assignment.findUnique({
				include: assignmentInclude,
				where: { id: input.id },
			});
			if (!assignment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assignment not found",
				});
			}

			return assignment;
		}),
	create: supervisorProcedure
		.input(
			z.object({
				incidentId: idSchema,
				note: z.string().trim().max(500).optional(),
				personnelId: idSchema,
			})
		)
		.mutation(({ ctx, input }) =>
			ctx.db.$transaction(async (transaction) => {
				const [incident, personnel, duplicate] = await Promise.all([
					transaction.incident.findUnique({
						where: { id: input.incidentId },
					}),
					transaction.personnel.findUnique({
						where: { id: input.personnelId },
					}),
					transaction.assignment.findFirst({
						select: { id: true },
						where: {
							incidentId: input.incidentId,
							personnelId: input.personnelId,
						},
					}),
				]);

				if (!incident) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Incident not found",
					});
				}
				if (!personnel) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Personnel not found",
					});
				}
				if (duplicate) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Personnel is already assigned to this incident",
					});
				}
				if (incident.status !== "VERIFIED" && incident.status !== "ASSIGNED") {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "Only verified incidents can be assigned",
					});
				}
				if (personnel.currentStatus !== "AVAILABLE") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Personnel is not available",
					});
				}

				const assignment = await transaction.assignment.create({
					data: {
						dispatchCardSnapshot: {
							createdAt: new Date().toISOString(),
							incident: {
								category: incident.category,
								id: incident.id,
								lat: incident.lat,
								lng: incident.lng,
								severity: incident.severity,
							},
							note: input.note ?? null,
							personnel: {
								badgeNo: personnel.badgeNo,
								id: personnel.id,
								name: personnel.name,
								unitType: personnel.unitType,
							},
						},
						incidentId: incident.id,
						personnelId: personnel.id,
					},
					include: assignmentInclude,
				});

				await transaction.personnel.update({
					data: { currentStatus: "ASSIGNED" },
					where: { id: personnel.id },
				});
				if (incident.status === "VERIFIED") {
					await transaction.incident.update({
						data: { status: "ASSIGNED" },
						where: { id: incident.id },
					});
					await transaction.incidentStatusLog.create({
						data: {
							changedBy: ctx.session.user.id,
							fromStatus: "VERIFIED",
							incidentId: incident.id,
							note: input.note,
							toStatus: "ASSIGNED",
						},
					});
				}

				return assignment;
			})
		),
	list: protectedProcedure
		.input(
			paginationSchema
				.extend({
					incidentId: idSchema.optional(),
					personnelId: idSchema.optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;
			const items = await ctx.db.assignment.findMany({
				cursor: input?.cursor ? { id: input.cursor } : undefined,
				include: assignmentInclude,
				orderBy: { assignedAt: "desc" },
				skip: input?.cursor ? 1 : 0,
				take: limit + 1,
				where: {
					...(input?.incidentId ? { incidentId: input.incidentId } : {}),
					...(input?.personnelId ? { personnelId: input.personnelId } : {}),
				},
			});
			const nextItem = items.length > limit ? items.pop() : undefined;

			return { items, nextCursor: nextItem?.id ?? null };
		}),
	updateOperationalStatus: protectedProcedure
		.input(
			z.object({
				assignmentId: idSchema,
				note: z.string().trim().max(500).optional(),
				status: assignmentOperationalStatusSchema,
			})
		)
		.mutation(({ ctx, input }) =>
			ctx.db.$transaction(async (transaction) => {
				const assignment = await transaction.assignment.findUnique({
					include: { incident: true },
					where: { id: input.assignmentId },
				});
				if (!assignment) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Assignment not found",
					});
				}

				const expected = expectedIncidentStatus[input.status];
				if (
					assignment.incident.status !== expected &&
					assignment.incident.status !== input.status
				) {
					throw new TRPCError({
						code: "CONFLICT",
						message: `Incident must be ${expected} before moving to ${input.status}`,
					});
				}

				const now = new Date();
				let assignmentData:
					| { confirmedEnRouteAt: Date }
					| { onSceneAt: Date }
					| { resolvedAt: Date };
				if (input.status === "EN_ROUTE") {
					assignmentData = { confirmedEnRouteAt: now };
				} else if (input.status === "ON_SCENE") {
					assignmentData = { onSceneAt: now };
				} else {
					assignmentData = { resolvedAt: now };
				}
				await transaction.assignment.update({
					data: assignmentData,
					where: { id: assignment.id },
				});

				if (assignment.incident.status !== input.status) {
					await transaction.incident.update({
						data: { status: input.status },
						where: { id: assignment.incidentId },
					});
					await transaction.incidentStatusLog.create({
						data: {
							changedBy: ctx.session.user.id,
							fromStatus: assignment.incident.status,
							incidentId: assignment.incidentId,
							note: input.note,
							toStatus: input.status,
						},
					});
				}

				if (input.status === "RESOLVED") {
					await transaction.assignment.updateMany({
						data: { resolvedAt: now },
						where: { incidentId: assignment.incidentId, resolvedAt: null },
					});
					await transaction.personnel.updateMany({
						data: { currentStatus: "AVAILABLE" },
						where: {
							assignments: { some: { incidentId: assignment.incidentId } },
						},
					});
				} else {
					await transaction.personnel.update({
						data: { currentStatus: input.status },
						where: { id: assignment.personnelId },
					});
				}

				return transaction.assignment.findUnique({
					include: assignmentInclude,
					where: { id: assignment.id },
				});
			})
		),
});
