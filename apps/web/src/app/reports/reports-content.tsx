"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Clock,
	ImageIcon,
	Loader2,
	MapPin,
	Plus,
	Search,
	ShieldAlert,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { categoryLabels, formatIncidentTime } from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

import ConvertDialog from "./convert-dialog";
import CreateReportDialog from "./create-report-dialog";

const CATEGORY_OPTIONS = Object.entries(categoryLabels) as [string, string][];

interface ReportItem {
	id: string;
	category: string;
	description: string;
	reportedAt: Date | string;
	lat: number;
	lng: number;
	mediaUrl?: string | null;
}

export default function ReportsContent() {
	const queryClient = useQueryClient();
	const [category, setCategory] = useState("ALL");
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim());
	const [convertTarget, setConvertTarget] = useState<{
		id: string;
		category: string;
		description: string;
	} | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	const reports = useQuery(
		trpc.reports.list.queryOptions({
			limit: 50,
			category:
				category === "ALL"
					? undefined
					: (category as
							| "ALTERCATION"
							| "CROWD"
							| "OTHER"
							| "SUSPICIOUS_VEHICLE"
							| "THEFT"
							| "TRAFFIC_INCIDENT"),
			search: deferredSearch || undefined,
		})
	);

	const simulateMutation = useMutation(
		trpc.reports.simulateFeed.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries(),
		})
	);

	const visibleReports = useMemo(() => {
		const items = (reports.data?.items ?? []) as ReportItem[];
		if (!deferredSearch) {
			return items;
		}
		const q = deferredSearch.toLowerCase();
		return items.filter((r) => r.description.toLowerCase().includes(q));
	}, [deferredSearch, reports.data?.items]);

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			{/* Header */}
			<div className="flex flex-col gap-4 border-slate-200 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">
						Laporan
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						{visibleReports.length} laporan ditemukan
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 hover:shadow-md"
						onClick={() => setIsCreateOpen(true)}
						type="button"
					>
						<Plus className="size-4" />
						Buat Laporan
					</button>
					<button
						className="flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
						disabled={simulateMutation.isPending}
						onClick={() => simulateMutation.mutate()}
						type="button"
					>
						{simulateMutation.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Plus className="size-4" />
						)}
						Simulasi
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="mt-5 grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
					<input
						aria-label="Cari laporan"
						className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari berdasarkan deskripsi…"
						value={search}
					/>
				</div>
				<select
					aria-label="Filter kategori"
					className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
					onChange={(e) => setCategory(e.target.value)}
					value={category}
				>
					<option value="ALL">Semua kategori</option>
					{CATEGORY_OPTIONS.map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</div>

			{/* Report cards */}
			<div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
				{reports.isLoading ? (
					<div className="flex items-center gap-2 p-5 text-sm text-slate-500">
						<Loader2 className="size-4 animate-spin" />
						Memuat laporan…
					</div>
				) : null}

				{visibleReports.length === 0 && !reports.isLoading ? (
					<p className="p-5 text-sm text-slate-500">
						Tidak ada laporan yang sesuai.
					</p>
				) : null}

				{visibleReports.map((report) => (
					<div
						className="group grid gap-4 p-4 transition-colors hover:bg-slate-50/80 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
						key={report.id}
					>
						{/* Content */}
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
									{categoryLabels[report.category] ??
										report.category}
								</span>
								{report.mediaUrl ? (
									<span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
										<ImageIcon className="size-3" />
										Media
									</span>
								) : null}
							</div>

							<p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-700">
								{report.description}
							</p>

							<div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:gap-5">
								<span className="flex items-center gap-1.5">
									<Clock className="size-3.5 text-amber-500" />
									{formatIncidentTime(report.reportedAt)}
								</span>
								<span className="flex items-center gap-1.5">
									<MapPin className="size-3.5 text-amber-500" />
									{report.lat.toFixed(4)},{" "}
									{report.lng.toFixed(4)}
								</span>
							</div>
						</div>

						{/* Action */}
						<div className="flex items-start">
							<button
								className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 hover:shadow-md"
								onClick={() =>
									setConvertTarget({
										id: report.id,
										category: report.category,
										description: report.description,
									})
								}
								type="button"
							>
								<ShieldAlert className="size-3.5" />
								Jadikan Insiden
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Convert dialog */}
			<ConvertDialog
				isOpen={!!convertTarget}
				onClose={() => setConvertTarget(null)}
				report={convertTarget}
			/>

			<CreateReportDialog
				isOpen={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
			/>
		</main>
	);
}
