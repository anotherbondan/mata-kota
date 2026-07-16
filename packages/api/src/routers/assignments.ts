import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { invalidateIncidentMapCache } from "../lib/redis-cache";
import {
	assignmentOperationalStatusSchema,
	idSchema,
	paginationSchema,
} from "../schemas";

const assignmentInclude = {
	assignedByUser: { select: { id: true, name: true } },
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

const dispatchAssignmentSelect = {
	id: true,
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
		select: { badgeNo: true, id: true, name: true },
	},
} as const;

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
	create: protectedProcedure
		.input(
			z
				.object({
					allowBusy: z.boolean().default(false),
					incidentId: idSchema,
					note: z.string().trim().max(500).optional(),
					overrideReason: z.string().trim().max(500).optional(),
					personnelIds: z.array(idSchema).min(1).max(3),
				})
				.refine((value) => !value.allowBusy || Boolean(value.overrideReason), {
					message: "An override reason is required for busy personnel",
					path: ["overrideReason"],
				})
		)
		.mutation(async ({ ctx, input }) => {
			const createdAssignments = await ctx.db.$transaction(
				async (transaction) => {
					const uniquePersonnelIds = [...new Set(input.personnelIds)];
					const [incident, personnel, duplicates] = await Promise.all([
						transaction.incident.findUnique({
							where: { id: input.incidentId },
						}),
						transaction.personnel.findMany({
							where: { id: { in: uniquePersonnelIds } },
						}),
						transaction.assignment.findMany({
							select: { personnelId: true },
							where: {
								incidentId: input.incidentId,
								personnelId: { in: uniquePersonnelIds },
							},
						}),
					]);

					if (!incident) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Incident not found",
						});
					}
					if (personnel.length !== uniquePersonnelIds.length) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "One or more personnel records were not found",
						});
					}
					if (duplicates.length > 0) {
						throw new TRPCError({
							code: "CONFLICT",
							message:
								"One or more personnel are already assigned to this incident",
						});
					}
					if (
						incident.status !== "VERIFIED" &&
						incident.status !== "ASSIGNED"
					) {
						throw new TRPCError({
							code: "PRECONDITION_FAILED",
							message: "Only verified incidents can be assigned",
						});
					}
					const offlinePersonnel = personnel.find(
						(officer) => officer.currentStatus === "OFFLINE"
					);
					if (offlinePersonnel) {
						throw new TRPCError({
							code: "CONFLICT",
							message: `${offlinePersonnel.name} is offline`,
						});
					}
					const busyPersonnel = personnel.filter(
						(officer) => officer.currentStatus !== "AVAILABLE"
					);
					if (busyPersonnel.length > 0 && !input.allowBusy) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "Busy personnel require an explicit override",
						});
					}

					const assignments = await Promise.all(
						personnel.map((officer) =>
							transaction.assignment.create({
								data: {
									assignedBy: ctx.session.user.id,
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
										overrideReason: input.overrideReason ?? null,
										personnel: {
											badgeNo: officer.badgeNo,
											id: officer.id,
											name: officer.name,
											unitType: officer.unitType,
										},
									},
									incidentId: incident.id,
									personnelId: officer.id,
								},
								select: dispatchAssignmentSelect,
							})
						)
					);

					await transaction.personnel.updateMany({
						data: { currentStatus: "ASSIGNED" },
						where: { id: { in: uniquePersonnelIds } },
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
								note: input.overrideReason ?? input.note,
								toStatus: "ASSIGNED",
							},
						});
					}

					return assignments;
				}
			);
			await invalidateIncidentMapCache();
			return createdAssignments;
		}),
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
			const isPersonnel = ctx.session.user.role === "PERSONNEL";

			const items = await ctx.db.assignment.findMany({
				cursor: input?.cursor ? { id: input.cursor } : undefined,
				include: assignmentInclude,
				orderBy: { assignedAt: "desc" },
				skip: input?.cursor ? 1 : 0,
				take: limit + 1,
				where: {
					...(input?.incidentId ? { incidentId: input.incidentId } : {}),
					...(input?.personnelId ? { personnelId: input.personnelId } : {}),
					...(isPersonnel ? { personnel: { userId: ctx.session.user.id } } : {}),
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
		.mutation(async ({ ctx, input }) => {
			const updatedAssignment = await ctx.db.$transaction(
				async (transaction) => {
					const assignment = await transaction.assignment.findUnique({
						include: { incident: true, personnel: true },
						where: { id: input.assignmentId },
					});
					if (!assignment) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Assignment not found",
						});
					}

					if (
						ctx.session.user.role === "PERSONNEL" &&
						assignment.personnel.userId !== ctx.session.user.id
					) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "You can only update your own assignments",
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
						select: dispatchAssignmentSelect,
						where: { id: assignment.id },
					});
				}
			);
			await invalidateIncidentMapCache();
			return updatedAssignment;
		}),
});
