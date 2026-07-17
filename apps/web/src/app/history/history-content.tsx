"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clock, Lightbulb, MapPin, Search } from "lucide-react";
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
							className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
						>
							<div
								className="flex w-full flex-col p-5 sm:p-7 cursor-pointer"
								onClick={() => setExpandedId(isExpanded ? null : incident.id)}
							>
								{/* Header */}
								<div className="flex items-center justify-between mb-4">
									<h2 className="font-bold text-slate-900 text-lg">
										{categoryLabels[incident.category] ?? incident.category}
									</h2>
									<span className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide ${
										incident.severity === "CRITICAL" || incident.severity === "HIGH" ? "bg-red-200 text-red-700" :
										incident.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" :
										"bg-emerald-100 text-emerald-700"
									}`}>
										{severityLabels[incident.severity] ?? incident.severity}
									</span>
								</div>

								{/* Metadata */}
								<div className="flex flex-col gap-3 text-sm text-slate-600 mb-6">
									<div className="flex items-start gap-3"> 
									</div>
									<div className="flex items-start gap-3">
										<div className="text-amber-500 mt-0.5"><Clock className="size-5" /></div>
										<span className="font-medium">{formatIncidentTime(incident.createdAt)}</span>
									</div>
									<div className="flex items-start gap-3">
										<div className="text-amber-500 mt-0.5"><MapPin className="size-5" /></div>
										<span className="font-medium leading-relaxed">
											{incident.city && incident.province 
												? `${incident.city}, ${incident.province}` 
												: `${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`}
										</span>
									</div>
								</div>

								{/* Footer of closed view */}
								{!isExpanded && (
									<div className="flex justify-end">
										<button className="flex items-center gap-1.5 text-sm font-semibold text-[#1b3654]">
											Lihat Selengkapnya
											<ChevronDown className="size-4 text-amber-500" />
										</button>
									</div>
								)}

								{/* Expanded View */}
								{isExpanded && (
									<div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
										{/* Summary Block */}
										<div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex gap-3 text-slate-600 mb-6">
											<Lightbulb className="size-5 shrink-0 mt-0.5 text-blue-500" />
											<p className="text-sm font-medium leading-relaxed">
												Telah terjadi aksi {categoryLabels[incident.category]?.toLowerCase() ?? "insiden"} di lokasi ini. 
												Laporan awal masuk pada {formatIncidentTime(incident.createdAt)}.
											</p>
										</div>

										{/* Evidence */}
										<h3 className="font-bold text-slate-900 text-base mb-3">Bukti Foto/Video</h3>
										<div className="flex gap-4 overflow-x-auto pb-2 mb-6">
											{[1, 2, 3].map((i) => (
												<div key={i} className="h-40 w-64 shrink-0 rounded-2xl border border-amber-200/60 bg-slate-100 overflow-hidden relative">
													<img 
														src={`https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=400&q=80`} 
														alt={`Bukti ${i}`}
														className="w-full h-full object-cover"
													/>
												</div>
											))}
										</div>

										{/* Verification Status */}
										<h3 className="font-bold text-slate-900 text-base mb-1">Status Verifikasi</h3>
										<p className="text-sm text-slate-600 mb-4">
											Pilih status di bawah untuk memperbarui perkembangan investigasi dan keaslian insiden di lokasi.
										</p>
										<div className="flex flex-wrap gap-3 mb-8">
											<button className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${incident.verificationStatus === 'UNVERIFIED' ? 'bg-[#1b3654] text-white border border-[#1b3654]' : 'bg-white text-[#1b3654] border border-slate-300'}`}>
												Belum Ditangani
											</button>
											<button className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${incident.verificationStatus === 'VERIFIED' ? 'bg-[#1b3654] text-white border border-[#1b3654]' : 'bg-white text-[#1b3654] border border-slate-300'}`}>
												Sudah Ditangani
											</button>
											<button className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${incident.verificationStatus === 'FALSE_REPORT' ? 'bg-[#1b3654] text-white border border-[#1b3654]' : 'bg-white text-[#1b3654] border border-slate-300'}`}>
												Laporan Salah
											</button>
										</div>

										{/* Footer Actions */}
										<div className="flex flex-col items-end gap-6">
											<div className="flex flex-wrap items-center gap-3 w-full justify-end">
												<button 
													onClick={() => setSelectedIncidentId(incident.id)}
													className="rounded-full bg-slate-300/80 px-8 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
												>
													Tugaskan Personel
												</button>
												<button 
													onClick={() => setSelectedIncidentId(incident.id)}
													className="rounded-full bg-[#1b3654] px-10 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#13273e]"
												>
													Simpan
												</button>
											</div>
											<button 
												className="flex items-center gap-1.5 text-sm font-semibold text-[#1b3654]"
												onClick={() => setExpandedId(null)}
											>
												Lihat Selengkapnya
												<ChevronUp className="size-4 text-amber-500" />
											</button>
										</div>
									</div>
								)}
							</div>
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
