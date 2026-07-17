export const categoryLabels: Record<string, string> = {
	ALTERCATION: "Perkelahian",
	CROWD: "Kerumunan",
	OTHER: "Lainnya",
	SUSPICIOUS_VEHICLE: "Kendaraan Mencurigakan",
	THEFT: "Pencurian",
	TRAFFIC_INCIDENT: "Insiden Lalu Lintas",
};

export const severityLabels: Record<string, string> = {
	CRITICAL: "Kritis",
	HIGH: "Tinggi",
	LOW: "Rendah",
	MEDIUM: "Sedang",
};

export const statusLabels: Record<string, string> = {
	ASSIGNED: "Ditugaskan",
	EN_ROUTE: "Menuju Lokasi",
	ON_SCENE: "Di Lokasi",
	REPORTED: "Dilaporkan",
	RESOLVED: "Selesai",
	VERIFIED: "Terverifikasi",
};

export const severityStyles: Record<string, string> = {
	CRITICAL: "bg-purple-800 text-white",
	HIGH: "bg-red-500 text-white",
	LOW: "bg-yellow-500 text-white",
	MEDIUM: "bg-amber-500 text-white",
};

export function formatIncidentTime(value: Date | string) {
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
