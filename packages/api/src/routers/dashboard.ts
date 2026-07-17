import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
	getAiHealth,
	getRiskGrid,
	riskGridInputSchema,
} from "../lib/ai-service";

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function startOfJakartaDay(date: Date) {
	const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
	shifted.setUTCHours(0, 0, 0, 0);
	return new Date(shifted.getTime() - JAKARTA_OFFSET_MS);
}

function jakartaDateKey(date: Date) {
	return new Date(date.getTime() + JAKARTA_OFFSET_MS)
		.toISOString()
		.slice(0, 10);
}

export const dashboardRouter = router({
	aiHealth: protectedProcedure.query(() => getAiHealth()),
	incidentMap: protectedProcedure
		.input(
			z
				.object({
					activeOnly: z.boolean().default(true),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const activeOnly = input?.activeOnly !== false;
			const incidents = await ctx.db.incident.findMany({
				orderBy: { createdAt: "desc" },
				select: {
					category: true,
					createdAt: true,
					id: true,
					lat: true,
					lng: true,
					severity: true,
					status: true,
				},
				take: 500,
				where: activeOnly ? { status: { not: "RESOLVED" } } : {},
			});
			return incidents.map((incident) => ({
				...incident,
				createdAt: incident.createdAt.toISOString(),
			}));
		}),
	overview: protectedProcedure.query(async ({ ctx }) => {
		const today = startOfJakartaDay(new Date());
		const [
			activeIncidents,
			resolvedToday,
			personnelOnDuty,
			availablePersonnel,
			responseSamples,
		] = await Promise.all([
			ctx.db.incident.count({ where: { status: { not: "RESOLVED" } } }),
			ctx.db.incident.count({
				where: { status: "RESOLVED", updatedAt: { gte: today } },
			}),
			ctx.db.personnel.count({
				where: { currentStatus: { not: "OFFLINE" } },
			}),
			ctx.db.personnel.count({ where: { currentStatus: "AVAILABLE" } }),
			ctx.db.incident.findMany({
				select: {
					createdAt: true,
					statusLogs: {
						orderBy: { changedAt: "asc" },
						select: { changedAt: true },
						take: 1,
						where: { toStatus: "ON_SCENE" },
					},
				},
				where: { statusLogs: { some: { toStatus: "ON_SCENE" } } },
			}),
		]);
		const responseMinutes = responseSamples.flatMap((incident) => {
			const onSceneAt = incident.statusLogs[0]?.changedAt;
			return onSceneAt
				? [(onSceneAt.getTime() - incident.createdAt.getTime()) / 60_000]
				: [];
		});
		const averageResponseMinutes = responseMinutes.length
			? Math.round(
					(responseMinutes.reduce((sum, minutes) => sum + minutes, 0) /
						responseMinutes.length) *
						10
				) / 10
			: null;

		return {
			activeIncidents,
			availablePersonnel,
			averageResponseMinutes,
			personnelOnDuty,
			resolvedToday,
		};
	}),
	reportComposition: protectedProcedure.query(async ({ ctx }) => {
		const groups = await ctx.db.report.groupBy({
			_count: { _all: true },
			by: ["category"],
			orderBy: { _count: { category: "desc" } },
		});

		return groups.map((group) => ({
			category: group.category,
			count: group._count._all,
		}));
	}),
	reportMap: protectedProcedure.query(async ({ ctx }) => {
		const reports = await ctx.db.report.findMany({
			orderBy: { reportedAt: "desc" },
			select: {
				category: true,
				description: true,
				id: true,
				lat: true,
				lng: true,
				reportedAt: true,
				reporterRef: true,
			},
			take: 500,
		});

		return reports.map((report) => ({
			...report,
			reportedAt: report.reportedAt.toISOString(),
		}));
	}),
	riskGrid: protectedProcedure
		.input(riskGridInputSchema)
		.query(({ input }) => getRiskGrid(input)),
	trend: protectedProcedure
		.input(
			z.object({ days: z.number().int().min(1).max(31).default(7) }).optional()
		)
		.query(async ({ ctx, input }) => {
			const days = input?.days ?? 7;
			const start = startOfJakartaDay(new Date());
			start.setUTCDate(start.getUTCDate() - (days - 1));

			const incidents = await ctx.db.incident.findMany({
				select: { createdAt: true },
				where: { createdAt: { gte: start } },
			});
			const counts = new Map<string, number>();

			for (const incident of incidents) {
				const key = jakartaDateKey(incident.createdAt);
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}

			return Array.from({ length: days }, (_, index) => {
				const date = new Date(start);
				date.setUTCDate(date.getUTCDate() + index);
				const key = jakartaDateKey(date);
				return { count: counts.get(key) ?? 0, date: key };
			});
		}),
});
