"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import IncidentDetailModal from "@/components/incident-detail-modal";
import {
	categoryLabels,
	formatIncidentTime,
	severityLabels,
	severityStyles,
	statusLabels,
} from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

export default function HistoryContent() {
	const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
		null
	);
	const [severity, setSeverity] = useState("ALL");
	const [status, setStatus] = useState("ALL");
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim().toLowerCase());
	const incidents = useQuery(
		trpc.incidents.list.queryOptions({
			limit: 100,
			severity:
				severity === "ALL"
					? undefined
					: (severity as "CRITICAL" | "HIGH" | "LOW" | "MEDIUM"),
			status:
				status === "ALL"
					? undefined
					: (status as
							| "ASSIGNED"
							| "EN_ROUTE"
							| "ON_SCENE"
							| "REPORTED"
							| "RESOLVED"
							| "VERIFIED"),
		})
	);
	const visibleIncidents = useMemo(
		() =>
			(incidents.data?.items ?? []).filter((incident) => {
				if (!deferredSearch) {
					return true;
				}
				const category = categoryLabels[incident.category] ?? incident.category;
				return (
					incident.id.toLowerCase().includes(deferredSearch) ||
					category.toLowerCase().includes(deferredSearch)
				);
			}),
		[deferredSearch, incidents.data?.items]
	);

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="flex flex-col gap-4 border-slate-200 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">
						Riwayat Insiden
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{visibleIncidents.length} insiden tercatat
					</p>
				</div>
				<div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_170px]">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
						<input
							aria-label="Cari insiden"
							className="h-10 w-full border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Cari kategori atau ID"
							value={search}
						/>
					</div>
					<select
						aria-label="Filter keparahan"
						className="h-10 border border-slate-300 bg-white px-3 text-sm"
						onChange={(event) => setSeverity(event.target.value)}
						value={severity}
					>
						<option value="ALL">Semua tingkat</option>
						<option value="CRITICAL">Kritis</option>
						<option value="HIGH">Tinggi</option>
						<option value="MEDIUM">Sedang</option>
						<option value="LOW">Rendah</option>
					</select>
					<select
						aria-label="Filter status"
						className="h-10 border border-slate-300 bg-white px-3 text-sm"
						onChange={(event) => setStatus(event.target.value)}
						value={status}
					>
						<option value="ALL">Semua status</option>
						{Object.entries(statusLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="mt-5 divide-y divide-slate-200 border border-slate-200 bg-white">
				{incidents.isLoading ? (
					<p className="p-5 text-sm text-slate-500">Memuat riwayat...</p>
				) : null}
				{visibleIncidents.length === 0 && !incidents.isLoading ? (
					<p className="p-5 text-sm text-slate-500">
						Tidak ada insiden yang sesuai.
					</p>
				) : null}
				{visibleIncidents.map((incident) => (
					<button
						className="grid w-full gap-4 p-4 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
						key={incident.id}
						onClick={() => setSelectedIncidentId(incident.id)}
						type="button"
					>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-semibold text-slate-900">
									{categoryLabels[incident.category] ?? incident.category}
								</h2>
								<span
									className={`px-2 py-1 text-[10px] font-semibold ${severityStyles[incident.severity]}`}
								>
									{severityLabels[incident.severity]}
								</span>
								<span className="bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
									{statusLabels[incident.status]}
								</span>
							</div>
							<div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:gap-5">
								<span className="flex items-center gap-1.5">
									<Clock className="size-3.5 text-amber-500" />
									{formatIncidentTime(incident.createdAt)}
								</span>
								<span className="flex items-center gap-1.5">
									<MapPin className="size-3.5 text-amber-500" />
									{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
								</span>
							</div>
						</div>
						<span className="font-mono text-xs text-slate-400">
							{incident.id}
						</span>
					</button>
				))}
			</div>

			<IncidentDetailModal
				incidentId={selectedIncidentId}
				onClose={() => setSelectedIncidentId(null)}
			/>
		</main>
	);
}
