"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { useState } from "react";

import IncidentDetailModal from "@/components/incident-detail-modal";
import IncidentMap from "@/components/incident-map";
import { useMockOperationalFeed } from "@/hooks/use-mock-operational-feed";
import {
	categoryLabels,
	formatIncidentTime,
	severityLabels,
	severityStyles,
	statusLabels,
} from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

import { CompositionChart, TrendChart } from "./dashboard-charts";

const POLLING_INTERVAL = 10_000;

export default function DashboardPage() {
	useMockOperationalFeed();
	const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
		null
	);
	const overview = useQuery({
		...trpc.dashboard.overview.queryOptions(),
		refetchInterval: POLLING_INTERVAL,
	});
	const incidents = useQuery({
		...trpc.incidents.list.queryOptions({ limit: 6 }),
		refetchInterval: POLLING_INTERVAL,
	});
	const mapIncidents = useQuery({
		...trpc.dashboard.incidentMap.queryOptions({ activeOnly: false }),
		refetchInterval: POLLING_INTERVAL,
	});
	const devices = useQuery({
		...trpc.devices.list.queryOptions(),
		refetchInterval: POLLING_INTERVAL,
	});
	const trend = useQuery(trpc.dashboard.trend.queryOptions({ days: 7 }));
	const composition = useQuery(trpc.dashboard.reportComposition.queryOptions());

	const stats = [
		{
			label: "Insiden Aktif",
			value: overview.data?.activeIncidents ?? "-",
		},
		{
			label: "Selesai Hari Ini",
			value: overview.data?.resolvedToday ?? "-",
		},
		{
			label: "Respons Rata-rata",
			value:
				overview.data?.averageResponseMinutes === null ||
				overview.data?.averageResponseMinutes === undefined
					? "-"
					: `${overview.data.averageResponseMinutes} mnt`,
		},
		{
			label: "Personel Tersedia",
			value: overview.data?.availablePersonnel ?? "-",
		},
	];

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold text-slate-900">
					Dasbor Operasional
				</h1>
				<p className="mt-1 text-sm text-slate-500">
					Situasi insiden dan kesiapan personel terkini.
				</p>
			</div>

	<section
				aria-label="Ringkasan operasional"
				className="grid grid-cols-2 gap-4 lg:grid-cols-4"
			>
				{stats.map((stat) => (
					<div
						className="rounded-3xl border border-slate-100/60 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
						key={stat.label}
					>
						<p className="text-xs font-semibold text-slate-500 sm:text-sm">
							{stat.label}
						</p>
						<p className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl tracking-tight">
							{stat.value}
						</p>
					</div>
				))}
			</section>

			<section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
				<div className="min-w-0 flex flex-col h-full">
					<div className="mb-4 flex items-center gap-2 px-1">
						<h2 className="font-bold text-slate-800 text-lg">Peta Insiden</h2>
						<ChevronRight className="size-4 text-amber-500" />
					</div>
					<div className="flex-1 rounded-3xl border border-slate-100/60 bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
						<IncidentMap
							className="h-full min-h-[420px] rounded-2xl"
							incidents={mapIncidents.data ?? []}
							onSelectIncident={setSelectedIncidentId}
							units={devices.data ?? []}
						/>
					</div>
				</div>

				<div className="min-w-0 flex flex-col h-full">
					<div className="mb-4 flex items-center gap-2 px-1">
						<h2 className="font-bold text-slate-800 text-lg">Insiden Terbaru</h2>
						<ChevronRight className="size-4 text-amber-500" />
					</div>
					<div className="flex-1 max-h-[440px] divide-y divide-slate-100 overflow-y-auto rounded-3xl border border-slate-100/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
						{incidents.isLoading ? (
							<p className="p-5 text-sm text-slate-500">Memuat insiden...</p>
						) : null}
						{incidents.data?.items.length === 0 ? (
							<p className="p-5 text-sm text-slate-500">Belum ada insiden.</p>
						) : null}
						{incidents.data?.items.map((incident) => (
							<button
								className="block w-full p-4 text-left hover:bg-slate-50"
								key={incident.id}
								onClick={() => setSelectedIncidentId(incident.id)}
								type="button"
							>
								<div className="flex items-start justify-between gap-3">
									<p className="font-medium text-slate-900">
										{categoryLabels[incident.category] ?? incident.category}
									</p>
									<span
										className={`px-2 py-1 text-[11px] font-semibold ${severityStyles[incident.severity]}`}
									>
										{severityLabels[incident.severity] ?? incident.severity}
									</span>
								</div>
								<div className="mt-3 space-y-1.5 text-xs text-slate-500">
									<p className="flex items-center gap-2">
										<Clock className="size-3.5 text-amber-500" />
										{formatIncidentTime(incident.createdAt)}
									</p>
									<p className="flex items-center gap-2">
										<MapPin className="size-3.5 text-amber-500" />
										{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
									</p>
									<p>{statusLabels[incident.status] ?? incident.status}</p>
								</div>
							</button>
						))}
					</div>
				</div>
			</section>

			<section className="grid gap-6 lg:grid-cols-2 pb-12">
				<div className="rounded-3xl border border-slate-100/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
					<div className="mb-6 flex items-center gap-2">
						<h2 className="font-bold text-slate-800 text-lg">Tren Insiden 7 Hari</h2>
					</div>
					<div className="h-[300px]">
						<TrendChart data={trend.data ?? []} />
					</div>
				</div>
				<div className="rounded-3xl border border-slate-100/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
					<div className="mb-6 flex items-center gap-2">
						<h2 className="font-bold text-slate-800 text-lg">Komposisi Laporan</h2>
					</div>
					<div className="h-[300px]">
						<CompositionChart
							data={(composition.data ?? []).map((item) => ({
								category: categoryLabels[item.category] ?? item.category,
								count: item.count,
							}))}
						/>
					</div>
				</div>
			</section>

			<IncidentDetailModal
				incidentId={selectedIncidentId}
				onClose={() => setSelectedIncidentId(null)}
			/>
		</div>
	);
}
