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
				className="grid grid-cols-2 gap-3 lg:grid-cols-4"
			>
				{stats.map((stat) => (
					<div
						className="border border-slate-200 bg-white p-4 sm:p-5"
						key={stat.label}
					>
						<p className="text-xs font-medium text-slate-500 sm:text-sm">
							{stat.label}
						</p>
						<p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
							{stat.value}
						</p>
					</div>
				))}
			</section>

			<section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
				<div className="min-w-0">
					<div className="mb-3 flex items-center gap-2">
						<h2 className="font-semibold text-slate-900">Peta Insiden</h2>
						<ChevronRight className="size-4 text-amber-500" />
					</div>
					<IncidentMap
						className="h-[420px]"
						incidents={mapIncidents.data ?? []}
						onSelectIncident={setSelectedIncidentId}
						units={devices.data ?? []}
					/>
				</div>

				<div className="min-w-0">
					<div className="mb-3 flex items-center gap-2">
						<h2 className="font-semibold text-slate-900">Insiden Terbaru</h2>
						<ChevronRight className="size-4 text-amber-500" />
					</div>
					<div className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto border border-slate-200 bg-white">
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

			<section className="grid gap-6 lg:grid-cols-2">
				<div className="border border-slate-200 bg-white p-4 sm:p-5">
					<h2 className="mb-4 font-semibold text-slate-900">
						Tren Insiden 7 Hari
					</h2>
					<TrendChart data={trend.data ?? []} />
				</div>
				<div className="border border-slate-200 bg-white p-4 sm:p-5">
					<h2 className="mb-4 font-semibold text-slate-900">
						Komposisi Laporan
					</h2>
					<CompositionChart
						data={(composition.data ?? []).map((item) => ({
							category: categoryLabels[item.category] ?? item.category,
							count: item.count,
						}))}
					/>
				</div>
			</section>

			<IncidentDetailModal
				incidentId={selectedIncidentId}
				onClose={() => setSelectedIncidentId(null)}
			/>
		</div>
	);
}
