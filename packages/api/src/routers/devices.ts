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
	list: protectedProcedure
		.input(
			z
				.object({ staleAfterMinutes: z.number().min(1).max(60).default(5) })
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const devices = await ctx.db.bwcDevice.findMany({
				include: {
					personnel: {
						select: {
							badgeNo: true,
							currentStatus: true,
							id: true,
							name: true,
						},
					},
				},
				orderBy: { updatedAt: "desc" },
			});
			const staleBefore = Date.now() - (input?.staleAfterMinutes ?? 5) * 60_000;

			return devices.map((device) => ({
				...device,
				effectiveStatus:
					device.connectionStatus === "LIVE" &&
					(!device.lastPingAt || device.lastPingAt.getTime() < staleBefore)
						? ("STALE" as const)
						: device.connectionStatus,
			}));
		}),
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
	simulateMovement: protectedProcedure.mutation(async ({ ctx }) => {
		const devices = await ctx.db.bwcDevice.findMany({
			select: { id: true, lastLat: true, lastLng: true },
			where: {
				connectionStatus: "LIVE",
				lastLat: { not: null },
				lastLng: { not: null },
			},
		});
		const tick = Math.floor(Date.now() / 10_000);
		const updated = await Promise.all(
			devices.map((device, index) => {
				const direction = (tick + index) % 8;
				const latitudeDelta = Math.sin(direction * (Math.PI / 4)) * 0.000_35;
				const longitudeDelta = Math.cos(direction * (Math.PI / 4)) * 0.000_35;
				return ctx.db.bwcDevice.update({
					data: {
						lastLat: (device.lastLat ?? 0) + latitudeDelta,
						lastLng: (device.lastLng ?? 0) + longitudeDelta,
						lastPingAt: new Date(),
					},
					select: { id: true, lastLat: true, lastLng: true, lastPingAt: true },
					where: { id: device.id },
				});
			})
		);

		return { devices: updated, tick };
	}),
});
