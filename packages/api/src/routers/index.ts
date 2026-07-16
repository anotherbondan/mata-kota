import { protectedProcedure, publicProcedure, router } from "../index";
import { assignmentsRouter } from "./assignments";
import { dashboardRouter } from "./dashboard";
import { devicesRouter } from "./devices";
import { evidenceRouter } from "./evidence";
import { incidentsRouter } from "./incidents";
import { personnelRouter } from "./personnel";
import { reportsRouter } from "./reports";

export const appRouter = router({
	assignments: assignmentsRouter,
	dashboard: dashboardRouter,
	devices: devicesRouter,
	evidence: evidenceRouter,
	healthCheck: publicProcedure.query(() => "OK"),
	incidents: incidentsRouter,
	me: protectedProcedure.query(({ ctx }) => ({
		user: ctx.session.user,
	})),
	personnel: personnelRouter,
	reports: reportsRouter,
});
export type AppRouter = typeof appRouter;
