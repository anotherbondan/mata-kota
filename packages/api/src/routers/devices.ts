import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router, supervisorProcedure } from "../index";
import {
	bwcConnectionStatusSchema,
	idSchema,
	latitudeSchema,
	longitudeSchema,
} from "../schemas";

export const devicesRouter = router({
	heartbeat: protectedProcedure
		.input(
			z.object({
				deviceCode: z.string().trim().min(3).max(100),
				lat: latitudeSchema,
				lng: longitudeSchema,
				status: bwcConnectionStatusSchema.default("LIVE"),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const device = await ctx.db.bwcDevice.findUnique({
				select: { id: true },
				where: { deviceCode: input.deviceCode },
			});
			if (!device) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
			}

			return ctx.db.bwcDevice.update({
				data: {
					connectionStatus: input.status,
					lastLat: input.lat,
					lastLng: input.lng,
					lastPingAt: new Date(),
				},
				where: { id: device.id },
			});
		}),
	list: protectedProcedure.query(({ ctx }) =>
		ctx.db.bwcDevice.findMany({
			include: {
				personnel: {
					select: { badgeNo: true, currentStatus: true, id: true, name: true },
				},
			},
			orderBy: { updatedAt: "desc" },
		})
	),
	register: supervisorProcedure
		.input(
			z.object({
				deviceCode: z.string().trim().min(3).max(100),
				personnelId: idSchema,
			})
		)
		.mutation(async ({ ctx, input }) => {
			const personnel = await ctx.db.personnel.findUnique({
				select: { id: true },
				where: { id: input.personnelId },
			});
			if (!personnel) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Personnel not found",
				});
			}

			return ctx.db.bwcDevice.upsert({
				create: input,
				update: { deviceCode: input.deviceCode },
				where: { personnelId: personnel.id },
			});
		}),
	setConnectionStatus: supervisorProcedure
		.input(z.object({ id: idSchema, status: bwcConnectionStatusSchema }))
		.mutation(async ({ ctx, input }) => {
			const device = await ctx.db.bwcDevice.findUnique({
				select: { id: true },
				where: { id: input.id },
			});
			if (!device) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
			}

			return ctx.db.bwcDevice.update({
				data: { connectionStatus: input.status },
				where: { id: device.id },
			});
		}),
});
