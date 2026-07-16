"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clock, MapPin, Search } from "lucide-react";
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
	const [expandedId, setExpandedId] = useState<string | null>(null);
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
							className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Cari kategori atau ID"
							value={search}
						/>
					</div>
					<select
						aria-label="Filter keparahan"
						className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
						className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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

			<div className="mt-5 flex flex-col gap-3">
				{incidents.isLoading ? (
					<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
						Memuat riwayat...
					</div>
				) : null}
				{visibleIncidents.length === 0 && !incidents.isLoading ? (
					<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
						Tidak ada insiden yang sesuai.
					</div>
				) : null}
				{visibleIncidents.map((incident) => {
					const isExpanded = expandedId === incident.id;
					return (
						<div
							key={incident.id}
							className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
						>
							<button
								className="flex w-full items-center justify-between p-4 text-left sm:p-5"
								onClick={() => setExpandedId(isExpanded ? null : incident.id)}
								type="button"
							>
								<div className="flex flex-wrap items-center gap-3">
									<h2 className="font-bold text-slate-900">
										{categoryLabels[incident.category] ?? incident.category}
									</h2>
									<span
										className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${severityStyles[incident.severity]}`}
									>
										{severityLabels[incident.severity]}
									</span>
									<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold tracking-wide text-slate-600">
										{statusLabels[incident.status]}
									</span>
								</div>
								<div className="flex items-center gap-4">
									<span className="hidden text-xs font-semibold text-slate-400 sm:block">
										{incident.id.split("-").pop()}
									</span>
									<div className="grid size-8 place-items-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-slate-100">
										{isExpanded ? (
											<ChevronUp className="size-4" />
										) : (
											<ChevronDown className="size-4" />
										)}
									</div>
								</div>
							</button>

							{isExpanded && (
								<div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 animate-in slide-in-from-top-2 fade-in duration-200">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-6">
											<span className="flex items-center gap-2">
												<div className="grid size-7 place-items-center rounded-full bg-amber-100 text-amber-600">
													<Clock className="size-3.5" />
												</div>
												{formatIncidentTime(incident.createdAt)}
											</span>
											<span className="flex items-center gap-2">
												<div className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-600">
													<MapPin className="size-3.5" />
												</div>
												{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
											</span>
										</div>
										<button
											onClick={() => setSelectedIncidentId(incident.id)}
											className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
										>
											Lihat Detail
										</button>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<IncidentDetailModal
				incidentId={selectedIncidentId}
				onClose={() => setSelectedIncidentId(null)}
			/>
		</main>
	);
}
