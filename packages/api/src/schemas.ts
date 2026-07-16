import { z } from "zod";

export const assignmentOperationalStatusSchema = z.enum([
	"EN_ROUTE",
	"ON_SCENE",
	"RESOLVED",
]);
export const bwcConnectionStatusSchema = z.enum(["LIVE", "STALE", "OFFLINE"]);
export const evidenceTypeSchema = z.enum(["PHOTO", "VIDEO", "TEXT"]);
export const incidentCategorySchema = z.enum([
	"CROWD",
	"ALTERCATION",
	"SUSPICIOUS_VEHICLE",
	"THEFT",
	"TRAFFIC_INCIDENT",
	"OTHER",
]);
export const incidentStatusSchema = z.enum([
	"REPORTED",
	"VERIFIED",
	"ASSIGNED",
	"EN_ROUTE",
	"ON_SCENE",
	"RESOLVED",
]);
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);
export const paginationSchema = z.object({
	cursor: z.string().min(1).optional(),
	limit: z.number().int().min(1).max(100).default(20),
});
export const personnelStatusSchema = z.enum([
	"AVAILABLE",
	"ASSIGNED",
	"EN_ROUTE",
	"ON_SCENE",
	"OFFLINE",
]);
export const severitySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const verificationStatusSchema = z.enum([
	"UNVERIFIED",
	"VERIFIED",
	"FALSE_REPORT",
]);

export const idSchema = z.string().min(1);
