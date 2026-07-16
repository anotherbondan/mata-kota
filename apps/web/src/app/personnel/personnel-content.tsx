"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ChevronDown,
	MapPin,
	Radio,
	Search,
	Shield,
	User,
	Wifi,
	WifiOff,
	RefreshCw
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { trpc } from "@/utils/trpc";
import HrSyncModal from "./hr-sync-modal";

const personnelStatusLabels: Record<string, string> = {
	ASSIGNED: "Ditugaskan",
	AVAILABLE: "Sedia",
	EN_ROUTE: "Menuju Lokasi",
	OFFLINE: "Offline",
	ON_SCENE: "Di Lokasi",
};

const personnelStatusStyles: Record<string, string> = {
	ASSIGNED: "bg-amber-100 text-amber-700",
	AVAILABLE: "bg-emerald-100 text-emerald-700",
	EN_ROUTE: "bg-blue-100 text-blue-700",
	OFFLINE: "bg-slate-100 text-slate-500",
	ON_SCENE: "bg-violet-100 text-violet-700",
};

const bwcStatusStyles: Record<string, { color: string; label: string }> = {
	LIVE: { color: "text-emerald-500", label: "Aktif" },
	OFFLINE: { color: "text-slate-400", label: "Offline" },
	STALE: { color: "text-amber-500", label: "Stale" },
};

export default function PersonnelContent() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("ALL");
	const [unitType, setUnitType] = useState("ALL");
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
	const deferredSearch = useDeferredValue(search.trim());

	const personnel = useQuery(
		trpc.personnel.list.queryOptions({
			limit: 100,
			search: deferredSearch || undefined,
			status:
				status === "ALL"
					? undefined
					: (status as
							| "ASSIGNED"
							| "AVAILABLE"
							| "EN_ROUTE"
							| "OFFLINE"
							| "ON_SCENE"),
			unitType: unitType === "ALL" ? undefined : unitType,
		})
	);

	// Collect unique unit types for the filter
	const unitTypes = useMemo(() => {
		const items = personnel.data?.items ?? [];
		const types = new Set(items.map((p) => p.unitType));
		return [...types].sort();
	}, [personnel.data?.items]);

	const items = personnel.data?.items ?? [];

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			<div className="flex flex-col gap-4 border-slate-200 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex justify-between items-center w-full">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">
							Manajemen Personel
						</h1>
						<p className="mt-1 text-sm text-slate-500">
							{items.length} personel terdaftar
						</p>
					</div>
					<button
						className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 active:scale-[0.97] transition-all"
						onClick={() => setIsSyncModalOpen(true)}
						type="button"
					>
						<RefreshCw className="size-4" />
						Sinkronisasi SDM
					</button>
				</div>
				<div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_160px]">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
						<input
							aria-label="Cari personel"
							className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Cari nama atau NRP"
							value={search}
						/>
					</div>
					<select
						aria-label="Filter status"
						className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
						onChange={(event) => setStatus(event.target.value)}
						value={status}
					>
						<option value="ALL">Semua status</option>
						{Object.entries(personnelStatusLabels).map(
							([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							)
						)}
					</select>
					<select
						aria-label="Filter unit"
						className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
						onChange={(event) => setUnitType(event.target.value)}
						value={unitType}
					>
						<option value="ALL">Semua unit</option>
						{unitTypes.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Personnel Grid */}
			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{personnel.isLoading
					? Array.from({ length: 6 }).map((_, i) => (
							<div
								className="h-48 animate-pulse rounded-2xl bg-slate-100"
								key={`skeleton-${i}`}
							/>
						))
					: null}
				{!personnel.isLoading && items.length === 0 ? (
					<p className="col-span-full py-12 text-center text-sm text-slate-500">
						Tidak ada personel yang sesuai.
					</p>
				) : null}
				{items.map((person) => {
					const isExpanded = expandedId === person.id;
					const bwc = person.bwcDevice;
					const bwcInfo = bwc
						? bwcStatusStyles[bwc.connectionStatus] ??
							bwcStatusStyles.OFFLINE
						: null;

					return (
						<div
							className={`group rounded-2xl border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] ${
								isExpanded
									? "border-primary-200 ring-1 ring-primary-100"
									: "border-slate-100/60"
							}`}
							key={person.id}
						>
							{/* Card Header */}
							<div className="flex items-start gap-4 p-5">
								<div className="grid size-12 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm">
									<User className="size-5" />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="truncate font-bold text-slate-800">
										{person.name}
									</h3>
									<p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
										<Shield className="size-3" />
										{person.badgeNo}
									</p>
									<p className="mt-0.5 text-xs text-slate-400">
										{person.unitType}
									</p>
								</div>
								<span
									className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
										personnelStatusStyles[
											person.currentStatus
										] ?? personnelStatusStyles.OFFLINE
									}`}
								>
									{personnelStatusLabels[
										person.currentStatus
									] ?? person.currentStatus}
								</span>
							</div>

							{/* BWC & Meta */}
							<div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
								<div className="flex items-center gap-3 text-xs">
									{bwcInfo ? (
										<span
											className={`flex items-center gap-1.5 font-medium ${bwcInfo.color}`}
										>
											{bwc?.connectionStatus ===
											"OFFLINE" ? (
												<WifiOff className="size-3.5" />
											) : (
												<Wifi className="size-3.5" />
											)}
											BWC: {bwcInfo.label}
										</span>
									) : (
										<span className="flex items-center gap-1.5 text-slate-400">
											<Radio className="size-3.5" />
											Tidak ada BWC
										</span>
									)}
									{bwc?.lastLat != null &&
									bwc?.lastLng != null ? (
										<span className="flex items-center gap-1 text-slate-400">
											<MapPin className="size-3" />
											{bwc.lastLat.toFixed(3)},{" "}
											{bwc.lastLng.toFixed(3)}
										</span>
									) : null}
								</div>
								<button
									className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
									onClick={() =>
										setExpandedId(
											isExpanded ? null : person.id
										)
									}
									type="button"
								>
									Detail
									<ChevronDown
										className={`size-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
									/>
								</button>
							</div>

							{/* Expanded Detail */}
							{isExpanded ? (
								<div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 animate-in slide-in-from-top-1 fade-in duration-200">
									<h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
										Penugasan Terakhir
									</h4>
									{(person as any)._count?.assignments ===
									0 ? (
										<p className="mt-2 text-xs text-slate-400">
											Belum ada penugasan.
										</p>
									) : (
										<p className="mt-2 text-xs text-slate-500">
											{(person as any)._count
												?.assignments ?? 0}{" "}
											total penugasan
										</p>
									)}
									{bwc ? (
										<>
											<h4 className="mt-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
												BWC Device
											</h4>
											<div className="mt-2 space-y-1 text-xs text-slate-500">
												<p>
													Kode:{" "}
													<span className="font-mono font-medium text-slate-700">
														{bwc.deviceCode}
													</span>
												</p>
												{bwc.lastPingAt ? (
													<p>
														Ping terakhir:{" "}
														{new Intl.DateTimeFormat(
															"id-ID",
															{
																dateStyle:
																	"medium",
																timeStyle:
																	"short",
															}
														).format(
															new Date(
																bwc.lastPingAt
															)
														)}
													</p>
												) : null}
											</div>
										</>
									) : null}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
			
			<HrSyncModal 
				isOpen={isSyncModalOpen} 
				onClose={() => setIsSyncModalOpen(false)} 
			/>
		</main>
	);
}
