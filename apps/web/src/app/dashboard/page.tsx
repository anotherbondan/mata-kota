"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
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
import CreateIncidentDialog from "./create-incident-dialog";

const POLLING_INTERVAL = 10_000;

export default function DashboardPage() {
	const queryClient = useQueryClient();
	useMockOperationalFeed();
	const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
		null
	);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
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
	const assignments = useQuery({
		...trpc.assignments.list.queryOptions({ limit: 5 }),
		refetchInterval: POLLING_INTERVAL,
	});

	const updateStatus = useMutation(
		trpc.assignments.updateOperationalStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries();
			},
		})
	);

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
			<div className="flex items-end justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">
						Dasbor Operasional
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Situasi insiden dan kesiapan personel terkini.
					</p>
				</div>
				<button
					className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 active:scale-[0.97] transition-all"
					onClick={() => setIsCreateOpen(true)}
					type="button"
				>
					<Plus className="size-4" />
					Buat Insiden
				</button>
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
					<Link
						className="group mb-4 flex w-fit items-center gap-2 px-1"
						href="/maps"
					>
						<h2 className="font-bold text-slate-800 text-lg">Peta Insiden</h2>
						<ChevronRight className="size-4 text-amber-500 transition-transform group-hover:translate-x-0.5" />
					</Link>
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
					<Link
						className="group mb-4 flex w-fit items-center gap-2 px-1"
						href="/history"
					>
						<h2 className="font-bold text-slate-800 text-lg">
							Insiden Terbaru
						</h2>
						<ChevronRight className="size-4 text-amber-500 transition-transform group-hover:translate-x-0.5" />
					</Link>
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
						<h2 className="font-bold text-slate-800 text-lg">
							Tren Insiden 7 Hari
						</h2>
					</div>
					<div className="h-[300px]">
						<TrendChart data={trend.data ?? []} />
					</div>
				</div>
				<div className="rounded-3xl border border-slate-100/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
					<div className="mb-6 flex items-center gap-2">
						<h2 className="font-bold text-slate-800 text-lg">
							Komposisi Laporan
						</h2>
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

			<section className="rounded-3xl border border-slate-100/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-12">
				<div className="mb-6 flex items-center gap-2">
					<h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
						Penugasan Personel
						<ChevronRight className="size-5 text-amber-500" />
					</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-[#1B3654] text-white">
							<tr>
								<th className="px-4 py-3 font-medium rounded-tl-xl">ID Insiden</th>
								<th className="px-4 py-3 font-medium">Personel</th>
								<th className="px-4 py-3 font-medium">Tingkat Risiko</th>
								<th className="px-4 py-3 font-medium">Status</th>
								<th className="px-4 py-3 font-medium">Waktu Respon</th>
								<th className="px-4 py-3 font-medium rounded-tr-xl text-right">Aksi Personel</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{assignments.isLoading ? (
								<tr>
									<td colSpan={6} className="p-4 text-center text-slate-500">Memuat penugasan...</td>
								</tr>
							) : null}
							{(assignments.data?.items ?? []).map((assignment: any) => {
								let responseTime = "-";
								const end = assignment.resolvedAt || assignment.onSceneAt;
								if (end) {
									const diffMs = new Date(end).getTime() - new Date(assignment.assignedAt).getTime();
									responseTime = `${Math.max(1, Math.round(diffMs / 60000))} menit`;
								}
								
								return (
									<tr key={assignment.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-4 text-slate-600 font-mono text-xs uppercase">{assignment.incident.id.split("-").pop() || assignment.incident.id}</td>
										<td className="px-4 py-4 text-slate-600">{assignment.personnel.name}</td>
										<td className={`px-4 py-4 ${severityStyles[assignment.incident.severity]?.split(" ")[1] ?? "text-slate-600"}`}>
											{severityLabels[assignment.incident.severity] ?? assignment.incident.severity}
										</td>
										<td className="px-4 py-4 text-slate-600">
											{assignment.resolvedAt ? "Sudah Ditangani" : statusLabels[assignment.incident.status] ?? "Ditugaskan"}
										</td>
										<td className="px-4 py-4 text-slate-600">{responseTime}</td>
										<td className="px-4 py-4 text-right">
											{!assignment.resolvedAt && (
												<button
													type="button"
													disabled={updateStatus.isPending}
													onClick={() => {
														const nextStatus = assignment.incident.status === "ON_SCENE" ? "RESOLVED" : "ON_SCENE";
														updateStatus.mutate({ assignmentId: assignment.id, status: nextStatus });
													}}
													className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
												>
													{assignment.incident.status === "ON_SCENE" ? "Selesaikan" : "Konfirmasi Tiba"}
												</button>
											)}
										</td>
									</tr>
								);
							})}
							{!assignments.isLoading && (assignments.data?.items?.length ?? 0) === 0 ? (
								<tr>
									<td colSpan={6} className="p-4 text-center text-slate-500">Belum ada penugasan</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			</section>

			<IncidentDetailModal
				incidentId={selectedIncidentId}
				onClose={() => setSelectedIncidentId(null)}
			/>
			
			<CreateIncidentDialog 
				isOpen={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
			/>
		</div>
	);
}
