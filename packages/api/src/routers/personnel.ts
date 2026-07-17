import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router, supervisorProcedure } from "../index";
import { haversineDistanceKm } from "../lib/geo";
import { idSchema, paginationSchema, personnelStatusSchema } from "../schemas";

export const personnelRouter = router({
	byId: protectedProcedure
		.input(z.object({ id: idSchema }))
		.query(async ({ ctx, input }) => {
			const personnel = await ctx.db.personnel.findUnique({
				include: {
					assignments: {
						include: {
							incident: {
								select: {
									category: true,
									id: true,
									severity: true,
									status: true,
								},
							},
						},
						orderBy: { assignedAt: "desc" },
						take: 20,
					},
					bwcDevice: true,
				},
				where: { id: input.id },
			});

			if (!personnel) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Personnel not found",
				});
			}

			return personnel;
		}),
	create: supervisorProcedure
		.input(
			z.object({
				badgeNo: z.string().trim().min(3).max(50),
				name: z.string().trim().min(2).max(150),
				unitType: z.string().trim().min(2).max(100),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const duplicate = await ctx.db.personnel.findUnique({
				select: { id: true },
				where: { badgeNo: input.badgeNo },
			});
			if (duplicate) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Badge number already exists",
				});
			}

			return ctx.db.personnel.create({ data: input });
		}),
	delete: supervisorProcedure
		.input(z.object({ id: idSchema }))
		.mutation(async ({ ctx, input }) => {
			const personnel = await ctx.db.personnel.findUnique({
				select: { _count: { select: { assignments: true } }, id: true },
				where: { id: input.id },
			});
			if (!personnel) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Personnel not found",
				});
			}
			if (personnel._count.assignments > 0) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Personnel with assignment history cannot be deleted",
				});
			}

			return ctx.db.personnel.delete({ where: { id: personnel.id } });
		}),
	list: protectedProcedure
		.input(
			paginationSchema
				.extend({
					search: z.string().trim().min(1).max(100).optional(),
					status: personnelStatusSchema.optional(),
					unitType: z.string().trim().min(1).max(100).optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 20;
			const items = await ctx.db.personnel.findMany({
				cursor: input?.cursor ? { id: input.cursor } : undefined,
				include: {
					_count: { select: { assignments: true } },
					bwcDevice: true,
				},
				orderBy: { name: "asc" },
				skip: input?.cursor ? 1 : 0,
				take: limit + 1,
				where: {
					...(input?.search
						? {
								OR: [
									{ badgeNo: { contains: input.search, mode: "insensitive" } },
									{ name: { contains: input.search, mode: "insensitive" } },
								],
							}
						: {}),
					...(input?.status ? { currentStatus: input.status } : {}),
					...(input?.unitType
						? { unitType: { equals: input.unitType, mode: "insensitive" } }
						: {}),
				},
			});
			const nextItem = items.length > limit ? items.pop() : undefined;

			return { items, nextCursor: nextItem?.id ?? null };
		}),
	nearest: protectedProcedure
		.input(
			z.object({
				incidentId: idSchema,
				limit: z.number().int().min(1).max(100).default(50),
				search: z.string().trim().max(100).optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const incident = await ctx.db.incident.findUnique({
				select: { id: true, lat: true, lng: true },
				where: { id: input.incidentId },
			});
			if (!incident) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Incident not found",
				});
			}

			const personnel = await ctx.db.personnel.findMany({
				include: {
					_count: { select: { assignments: true } },
					bwcDevice: true,
				},
				take: input.limit,
				where: {
					currentStatus: { not: "OFFLINE" },
					...(input.search
						? {
								OR: [
									{
										badgeNo: {
											contains: input.search,
											mode: "insensitive" as const,
										},
									},
									{
										name: {
											contains: input.search,
											mode: "insensitive" as const,
										},
									},
								],
							}
						: {}),
				},
			});
			const staleBefore = Date.now() - 5 * 60_000;

			return personnel
				.map((officer) => {
					const { lastLat, lastLng, lastPingAt } = officer.bwcDevice ?? {};
					const distanceKm =
						typeof lastLat === "number" && typeof lastLng === "number"
							? haversineDistanceKm(
									{ lat: incident.lat, lng: incident.lng },
									{ lat: lastLat, lng: lastLng }
								)
							: null;

					return {
						...officer,
						distanceKm,
						isLocationStale: !lastPingAt || lastPingAt.getTime() < staleBefore,
					};
				})
				.sort((left, right) => {
					if (left.distanceKm === null) {
						return 1;
					}
					if (right.distanceKm === null) {
						return -1;
					}
					return left.distanceKm - right.distanceKm;
				});
		}),
	update: supervisorProcedure
		.input(
			z.object({
				badgeNo: z.string().trim().min(3).max(50).optional(),
				id: idSchema,
				name: z.string().trim().min(2).max(150).optional(),
				unitType: z.string().trim().min(2).max(100).optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const personnel = await ctx.db.personnel.findUnique({
				select: { id: true },
				where: { id },
			});
			if (!personnel) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Personnel not found",
				});
			}

			return ctx.db.personnel.update({ data, where: { id } });
		}),
	updateStatus: supervisorProcedure
		.input(z.object({ id: idSchema, status: personnelStatusSchema }))
		.mutation(async ({ ctx, input }) => {
			const personnel = await ctx.db.personnel.findUnique({
				select: { id: true },
				where: { id: input.id },
			});
			if (!personnel) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Personnel not found",
				});
			}

			return ctx.db.personnel.update({
				data: { currentStatus: input.status },
				where: { id: personnel.id },
			});
		}),
	syncExternal: supervisorProcedure
		.input(
			z.array(
				z.object({
					badgeNo: z.string().trim().min(3).max(50),
					name: z.string().trim().min(2).max(150),
					unitType: z.string().trim().min(2).max(100),
				})
			)
		)
		.mutation(async ({ ctx, input }) => {
			if (input.length === 0) return { count: 0 };

			// Get all existing badge numbers in the input to filter out duplicates
			const inputBadgeNos = input.map((i) => i.badgeNo);
			const existing = await ctx.db.personnel.findMany({
				where: { badgeNo: { in: inputBadgeNos } },
				select: { badgeNo: true },
			});
			const existingBadges = new Set(existing.map((e) => e.badgeNo));
			const newOfficers = input.filter((i) => !existingBadges.has(i.badgeNo));

			if (newOfficers.length === 0) return { count: 0 };

			const created = [];
			for (const officer of newOfficers) {
				const personnel = await ctx.db.personnel.create({
					data: {
						badgeNo: officer.badgeNo,
						name: officer.name,
						unitType: officer.unitType,
					},
				});
				created.push(personnel);
			}

			return { count: created.length };
		}),
});
