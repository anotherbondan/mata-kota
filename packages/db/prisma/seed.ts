import path from "node:path";

import dotenv from "dotenv";

dotenv.config({
	path: path.resolve(import.meta.dirname, "../../../apps/web/.env"),
});

const { default: db } = await import("../src/index.ts");

const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000);

const personnel = [
	{
		badgeNo: "NRP-01023456",
		deviceCode: "BWC-JKT-001",
		id: "seed-personnel-1",
		lat: -6.1818,
		lng: 106.8223,
		name: "Briptu Raka Saputra",
		pingMinutesAgo: 1,
		status: "AVAILABLE" as const,
		unitType: "Patroli Presisi",
	},
	{
		badgeNo: "NRP-01028741",
		deviceCode: "BWC-JKT-002",
		id: "seed-personnel-2",
		lat: -6.1945,
		lng: 106.8332,
		name: "Bripka Dimas Wijaya",
		pingMinutesAgo: 3,
		status: "AVAILABLE" as const,
		unitType: "Samapta",
	},
	{
		badgeNo: "NRP-01031109",
		deviceCode: "BWC-JKT-003",
		id: "seed-personnel-3",
		lat: -6.1664,
		lng: 106.8098,
		name: "Bripka Arif Hidayat",
		pingMinutesAgo: 2,
		status: "ASSIGNED" as const,
		unitType: "Patroli Kota",
	},
	{
		badgeNo: "NRP-01032987",
		deviceCode: "BWC-JKT-004",
		id: "seed-personnel-4",
		lat: -6.2088,
		lng: 106.8456,
		name: "Bripka M. Yusuf",
		pingMinutesAgo: 11,
		status: "AVAILABLE" as const,
		unitType: "Samapta",
	},
	{
		badgeNo: "NRP-01045612",
		deviceCode: "BWC-JKT-005",
		id: "seed-personnel-5",
		lat: -6.2297,
		lng: 106.8169,
		name: "Bripka M. Helmi",
		pingMinutesAgo: 4,
		status: "AVAILABLE" as const,
		unitType: "Patroli Presisi",
	},
	{
		badgeNo: "NRP-01059982",
		deviceCode: "BWC-JKT-006",
		id: "seed-personnel-6",
		lat: -6.1751,
		lng: 106.8272,
		name: "Aipda Maya Lestari",
		pingMinutesAgo: 0,
		status: "EN_ROUTE" as const,
		unitType: "Sabhara",
	},
	{
		badgeNo: "NRP-01062341",
		deviceCode: "BWC-JKT-007",
		id: "seed-personnel-7",
		lat: -6.1667,
		lng: 106.7994,
		name: "Briptu Nanda Putri",
		pingMinutesAgo: 35,
		status: "OFFLINE" as const,
		unitType: "Samapta",
	},
	{
		badgeNo: "NRP-01074455",
		deviceCode: "BWC-JKT-008",
		id: "seed-personnel-8",
		lat: -6.2115,
		lng: 106.8451,
		name: "Bripda Budi Santoso",
		pingMinutesAgo: 5,
		status: "ON_SCENE" as const,
		unitType: "Patroli Kota",
	},
];

await Promise.all(
	personnel.map((officer) =>
		db.personnel.upsert({
			create: {
				badgeNo: officer.badgeNo,
				currentStatus: officer.status,
				id: officer.id,
				name: officer.name,
				unitType: officer.unitType,
			},
			update: {
				currentStatus: officer.status,
				name: officer.name,
				unitType: officer.unitType,
			},
			where: { id: officer.id },
		})
	)
);

await Promise.all(
	personnel.map((officer) =>
		db.bwcDevice.upsert({
			create: {
				connectionStatus: "LIVE",
				deviceCode: officer.deviceCode,
				id: `seed-device-${officer.id}`,
				lastLat: officer.lat,
				lastLng: officer.lng,
				lastPingAt: minutesAgo(officer.pingMinutesAgo),
				personnelId: officer.id,
			},
			update: {
				connectionStatus: "LIVE",
				lastLat: officer.lat,
				lastLng: officer.lng,
				lastPingAt: minutesAgo(officer.pingMinutesAgo),
			},
			where: { personnelId: officer.id },
		})
	)
);

const incidents = [
	{
		category: "THEFT" as const,
		createdAt: minutesAgo(18),
		id: "seed-incident-1",
		lat: -6.1751,
		lng: 106.8272,
		severity: "CRITICAL" as const,
		status: "REPORTED" as const,
		verificationStatus: "UNVERIFIED" as const,
	},
	{
		category: "ALTERCATION" as const,
		createdAt: minutesAgo(42),
		id: "seed-incident-2",
		lat: -6.2088,
		lng: 106.8456,
		severity: "HIGH" as const,
		status: "VERIFIED" as const,
		verificationStatus: "VERIFIED" as const,
	},
	{
		category: "SUSPICIOUS_VEHICLE" as const,
		createdAt: minutesAgo(85),
		id: "seed-incident-3",
		lat: -6.1667,
		lng: 106.7994,
		severity: "MEDIUM" as const,
		status: "REPORTED" as const,
		verificationStatus: "UNVERIFIED" as const,
	},
	{
		category: "TRAFFIC_INCIDENT" as const,
		createdAt: minutesAgo(150),
		id: "seed-incident-4",
		lat: -6.2297,
		lng: 106.8169,
		severity: "LOW" as const,
		status: "ON_SCENE" as const,
		verificationStatus: "VERIFIED" as const,
	},
];

await Promise.all(
	incidents.map((incident) =>
		db.incident.upsert({
			create: incident,
			update: {
				category: incident.category,
				lat: incident.lat,
				lng: incident.lng,
				severity: incident.severity,
				status: incident.status,
				verificationStatus: incident.verificationStatus,
			},
			where: { id: incident.id },
		})
	)
);

const reports = [
	{
		category: "Pencurian dengan kekerasan",
		description:
			"Dua orang terlihat mengancam petugas minimarket dan meninggalkan lokasi dengan sepeda motor.",
		id: "seed-report-1",
		incidentId: "seed-incident-1",
		lat: -6.1751,
		lng: 106.8272,
		reporterRef: "SPP-2026-0717-001",
	},
	{
		category: "Perkelahian",
		description: "Kerumunan terlibat perkelahian di dekat pintu masuk stasiun.",
		id: "seed-report-2",
		incidentId: "seed-incident-2",
		lat: -6.2088,
		lng: 106.8456,
		reporterRef: "SPP-2026-0717-002",
	},
];

await Promise.all(
	reports.map((report) =>
		db.report.upsert({
			create: {
				category: report.category,
				description: report.description,
				id: report.id,
				lat: report.lat,
				lng: report.lng,
				reportedAt: minutesAgo(20),
				reporterRef: report.reporterRef,
			},
			update: { description: report.description },
			where: { id: report.id },
		})
	)
);

await Promise.all(
	reports.flatMap((report) => [
		db.incidentSource.upsert({
			create: {
				id: `seed-source-${report.id}`,
				incidentId: report.incidentId,
				sourceId: report.id,
				sourceType: "REPORT",
			},
			update: {},
			where: {
				incidentId_sourceType_sourceId: {
					incidentId: report.incidentId,
					sourceId: report.id,
					sourceType: "REPORT",
				},
			},
		}),
		db.evidence.upsert({
			create: {
				id: `seed-evidence-${report.id}`,
				incidentId: report.incidentId,
				sourceReportId: report.id,
				textSnippet: report.description,
				type: "TEXT",
			},
			update: { textSnippet: report.description },
			where: { id: `seed-evidence-${report.id}` },
		}),
	])
);

const operator = await db.user.findFirst({ select: { id: true } });
if (operator) {
	await db.incidentStatusLog.upsert({
		create: {
			changedAt: minutesAgo(138),
			changedBy: operator.id,
			fromStatus: "EN_ROUTE",
			id: "seed-status-on-scene",
			incidentId: "seed-incident-4",
			toStatus: "ON_SCENE",
		},
		update: {},
		where: { id: "seed-status-on-scene" },
	});
}

await db.$disconnect();
