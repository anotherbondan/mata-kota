"use client";

import { Button } from "@mata-kota/ui/components/button";
import { Input } from "@mata-kota/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Check,
	Clock,
	ExternalLink,
	MapPin,
	Navigation,
	Search,
	ShieldCheck,
	Users,
	X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	categoryLabels,
	formatIncidentTime,
	severityLabels,
	severityStyles,
	statusLabels,
} from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

interface IncidentDetailModalProps {
	incidentId: string | null;
	initialView?: "assignment" | "detail" | "dispatch" | "success";
	onClose: () => void;
}

interface DispatchAssignment {
	id: string;
	incident: {
		category: string;
		id: string;
		lat: number;
		lng: number;
		severity: string;
		status: string;
	};
	personnel: { badgeNo: string; id: string; name: string };
}

type ModalView = "assignment" | "detail" | "dispatch" | "success";

const viewTitles: Record<ModalView, string> = {
	assignment: "Penugasan Personel",
	detail: "Detail Insiden",
	dispatch: "Kartu Dispatch",
	success: "Berhasil Diplot",
};

function formatDistance(distanceKm: unknown) {
	return typeof distanceKm === "number"
		? `${distanceKm.toFixed(2)} km`
		: "Lokasi tidak tersedia";
}

export default function IncidentDetailModal(props: IncidentDetailModalProps) {
	if (!props.incidentId) {
		return null;
	}

	return (
		<IncidentDialog
			incidentId={props.incidentId}
			initialView={props.initialView}
			key={props.incidentId}
			onClose={props.onClose}
		/>
	);
}

interface IncidentDialogProps {
	incidentId: string;
	initialView?: ModalView;
	onClose: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Coordinates the three explicit PRD workflow views and their mutation states.
function IncidentDialog({ incidentId, initialView, onClose }: IncidentDialogProps) {
	const queryClient = useQueryClient();
	const [allowBusy, setAllowBusy] = useState(false);
	const [createdAssignments, setCreatedAssignments] = useState<
		DispatchAssignment[]
	>([]);
	const [nearestRequested, setNearestRequested] = useState(false);
	const [overrideReason, setOverrideReason] = useState("");
	const [search, setSearch] = useState("");
	const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<Set<string>>(
		() => new Set()
	);
	const [view, setView] = useState<ModalView>(initialView || "detail");
	const deferredSearch = useDeferredValue(search.trim());

	useEffect(() => {
		if (!incidentId) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [incidentId, onClose]);

	const incident = useQuery({
		...trpc.incidents.byId.queryOptions({ id: incidentId }),
	});
	const personnel = useQuery({
		...trpc.personnel.list.queryOptions({
			limit: 50,
			search: deferredSearch || undefined,
		}),
		enabled: view === "assignment" && !nearestRequested,
	});
	const nearestPersonnel = useQuery({
		...trpc.personnel.nearest.queryOptions({
			incidentId,
			limit: 50,
			search: deferredSearch || undefined,
		}),
		enabled: view === "assignment" && nearestRequested,
	});
	const refreshIncidentData = async () => {
		await queryClient.invalidateQueries();
	};
	const verifyIncident = useMutation({
		...trpc.incidents.verify.mutationOptions(),
		onError: (error) => toast.error(error.message),
		onSuccess: async () => {
			await refreshIncidentData();
			toast.success("Status verifikasi diperbarui");
		},
	});
	const assignPersonnel = useMutation({
		...trpc.assignments.create.mutationOptions(),
		onError: (error) => toast.error(error.message),
		onSuccess: async (created) => {
			setCreatedAssignments(
				created.map((assignment) => ({
					id: assignment.id,
					incident: assignment.incident,
					personnel: assignment.personnel,
				}))
			);
			setView("success");
			await refreshIncidentData();
			toast.success("Personel berhasil ditugaskan");
		},
	});
	const updateOperationalStatus = useMutation({
		...trpc.assignments.updateOperationalStatus.mutationOptions(),
		onError: (error) => toast.error(error.message),
		onSuccess: async (updated) => {
			if (updated) {
				setCreatedAssignments((current) =>
					current.map((assignment) =>
						assignment.id === updated.id
							? { ...assignment, incident: updated.incident }
							: assignment
					)
				);
			}
			await refreshIncidentData();
			toast.success("Status insiden diperbarui");
		},
	});

	const visiblePersonnel = nearestRequested
		? (nearestPersonnel.data ?? [])
		: (personnel.data?.items ?? []);
	const selectedPersonnel = useMemo(
		() =>
			visiblePersonnel.filter((officer) =>
				selectedPersonnelIds.has(officer.id)
			),
		[selectedPersonnelIds, visiblePersonnel]
	);
	const hasBusySelection = selectedPersonnel.some(
		(officer) => officer.currentStatus !== "AVAILABLE"
	);

	const detail = incident.data;
	const canAssign =
		detail?.status === "VERIFIED" || detail?.status === "ASSIGNED";
	const togglePersonnel = (id: string) => {
		setSelectedPersonnelIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else if (next.size < 3) {
				next.add(id);
			}
			return next;
		});
	};

	return (
		<div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-0 sm:p-4">
			<button
				aria-label="Tutup detail insiden"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<div
				aria-labelledby="incident-dialog-title"
				aria-modal="true"
				className="relative flex h-full max-h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl"
				role="dialog"
			>
				<header className="flex items-center gap-3 border-slate-200 border-b px-4 py-3 sm:px-6">
					{view === "detail" || (view === "assignment" && initialView === "assignment") ? null : (
						<button
							aria-label="Kembali"
							className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
							onClick={() =>
								setView(view === "dispatch" ? "assignment" : "detail")
							}
							type="button"
						>
							<ArrowLeft className="size-5" />
						</button>
					)}
					<div className="min-w-0 flex-1">
						<p className="text-xs font-medium text-slate-500">
							{viewTitles[view]}
						</p>
						<h2
							className="truncate text-lg font-semibold text-slate-900"
							id="incident-dialog-title"
						>
							{detail
								? (categoryLabels[detail.category] ?? detail.category)
								: "Memuat..."}
						</h2>
					</div>
					<button
						aria-label="Tutup"
						className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
						onClick={onClose}
						type="button"
					>
						<X className="size-5" />
					</button>
				</header>

				<div className="flex-1 overflow-y-auto p-4 sm:p-6">
					{incident.isLoading ? (
						<p className="text-sm text-slate-500">Memuat detail...</p>
					) : null}
					{incident.isError ? (
						<p className="text-sm text-red-600">{incident.error.message}</p>
					) : null}

					{detail && view === "detail" ? (
						<div className="space-y-6">
							<div className="flex flex-wrap items-center gap-2">
								<span
									className={`px-2.5 py-1 text-xs font-semibold ${severityStyles[detail.severity]}`}
								>
									{severityLabels[detail.severity] ?? detail.severity}
								</span>
								<span className="bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
									{statusLabels[detail.status] ?? detail.status}
								</span>
								<span className="font-mono text-xs text-slate-500">
									{detail.id}
								</span>
							</div>

							<div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
								<p className="flex items-center gap-2">
									<Clock className="size-4 text-amber-500" />
									{formatIncidentTime(detail.createdAt)}
								</p>
								<p className="flex items-center gap-2">
									<MapPin className="size-4 text-amber-500" />
									{detail.lat.toFixed(5)}, {detail.lng.toFixed(5)}
								</p>
							</div>

							<section>
								<h3 className="mb-3 text-sm font-semibold text-slate-900">
									Ringkasan
								</h3>
								<div className="border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
									{detail.aiSummaries[0]?.summaryText ??
										detail.evidence.find((item) => item.textSnippet)
											?.textSnippet ??
										"Ringkasan belum tersedia untuk insiden ini."}
								</div>
							</section>

							<section>
								<h3 className="mb-3 text-sm font-semibold text-slate-900">
									Bukti Terhubung
								</h3>
								{detail.evidence.length === 0 ? (
									<p className="text-sm text-slate-500">Belum ada bukti.</p>
								) : (
									<div className="divide-y divide-slate-200 border border-slate-200">
										{detail.evidence.map((item) => (
											<div className="p-4" key={item.id}>
												<p className="text-xs font-semibold text-slate-500">
													{item.type}
												</p>
												{item.textSnippet ? (
													<p className="mt-1 text-sm text-slate-700">
														{item.textSnippet}
													</p>
												) : null}
												{item.url ? (
													<a
														className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
														href={item.url}
														rel="noreferrer"
														target="_blank"
													>
														Buka bukti <ExternalLink className="size-3.5" />
													</a>
												) : null}
											</div>
										))}
									</div>
								)}
							</section>

							<section>
								<h3 className="mb-3 text-sm font-semibold text-slate-900">
									Status Verifikasi
								</h3>
								<div className="flex flex-wrap gap-2">
									<Button
										disabled={verifyIncident.isPending}
										onClick={() =>
											verifyIncident.mutate({
												id: detail.id,
												verificationStatus: "UNVERIFIED",
											})
										}
										size="small"
										variant={
											detail.verificationStatus === "UNVERIFIED"
												? "primary"
												: "tertiary"
										}
									>
										Belum Diverifikasi
									</Button>
									<Button
										disabled={verifyIncident.isPending}
										onClick={() =>
											verifyIncident.mutate({
												id: detail.id,
												verificationStatus: "VERIFIED",
											})
										}
										size="small"
										variant={
											detail.verificationStatus === "VERIFIED"
												? "primary"
												: "tertiary"
										}
									>
										<ShieldCheck className="size-4" /> Terverifikasi
									</Button>
									<Button
										disabled={verifyIncident.isPending}
										onClick={() =>
											verifyIncident.mutate({
												id: detail.id,
												verificationStatus: "FALSE_REPORT",
											})
										}
										size="small"
										variant={
											detail.verificationStatus === "FALSE_REPORT"
												? "primary"
												: "tertiary"
										}
									>
										Laporan Salah
									</Button>
								</div>
							</section>

							<section>
								<h3 className="mb-3 text-sm font-semibold text-slate-900">
									Timeline
								</h3>
								<div className="space-y-3 border-slate-200 border-l pl-4">
									{detail.statusLogs.length === 0 ? (
										<p className="text-sm text-slate-500">
											Belum ada perubahan status.
										</p>
									) : null}
									{detail.statusLogs.map((log) => (
										<div key={log.id}>
											<p className="text-sm font-medium text-slate-800">
												{statusLabels[log.toStatus] ?? log.toStatus}
											</p>
											<p className="text-xs text-slate-500">
												{formatIncidentTime(log.changedAt)} oleh {log.user.name}
											</p>
										</div>
									))}
								</div>
							</section>
						</div>
					) : null}

					{view === "assignment" ? (
						<div className="space-y-5">
							<div className="flex flex-col gap-3 sm:flex-row">
								<div className="relative min-w-0 flex-1">
									<Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
									<Input
										aria-label="Cari personel"
										className="h-10 rounded-md border-slate-300 pl-10"
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Cari nama atau NRP"
										value={search}
									/>
								</div>
								<Button
									onClick={() => setNearestRequested((requested) => !requested)}
									variant={nearestRequested ? "primary" : "tertiary"}
								>
									<Navigation className="size-4" />
									{nearestRequested ? "Urutan Default" : "Filter Terdekat"}
								</Button>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								{/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Personnel rows expose status, freshness, distance, and selection in one scan target. */}
								{visiblePersonnel.map((officer) => {
									const isSelected = selectedPersonnelIds.has(officer.id);
									const nearest = "distanceKm" in officer ? officer : null;
									return (
										<button
											aria-pressed={isSelected}
											className={`flex min-h-28 items-start gap-3 border p-4 text-left ${
												isSelected
													? "border-primary-500 bg-primary-50"
													: "border-slate-200 bg-white hover:border-slate-400"
											}`}
											key={officer.id}
											onClick={() => togglePersonnel(officer.id)}
											type="button"
										>
											<span
												className={`mt-0.5 grid size-5 shrink-0 place-items-center border ${isSelected ? "border-primary-500 bg-primary-500 text-white" : "border-slate-300"}`}
											>
												{isSelected ? <Check className="size-3.5" /> : null}
											</span>
											<span className="min-w-0 flex-1">
												<span className="flex items-start justify-between gap-2">
													<span>
														<span className="block font-medium text-slate-900">
															{officer.name}
														</span>
														<span className="block text-xs text-slate-500">
															{officer.badgeNo}
														</span>
													</span>
													<span
														className={`px-2 py-1 text-[10px] font-semibold ${officer.currentStatus === "AVAILABLE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
													>
														{officer.currentStatus}
													</span>
												</span>
												{nearest ? (
													<span className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
														<MapPin className="size-3.5 text-amber-500" />
														{formatDistance(nearest.distanceKm)}
														{"isLocationStale" in nearest &&
														nearest.isLocationStale
															? " (stale)"
															: ""}
													</span>
												) : null}
											</span>
										</button>
									);
								})}
							</div>

							{hasBusySelection ? (
								<div className="space-y-3 border border-amber-300 bg-amber-50 p-4">
									<label className="flex items-center gap-2 text-sm font-medium text-amber-900">
										<input
											checked={allowBusy}
											onChange={(event) => setAllowBusy(event.target.checked)}
											type="checkbox"
										/>
										Override personel yang sedang bertugas
									</label>
									{allowBusy ? (
										<textarea
											aria-label="Alasan override"
											className="min-h-20 w-full rounded-xl border border-amber-300 bg-white p-3 text-sm outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50"
											onChange={(event) =>
												setOverrideReason(event.target.value)
											}
											placeholder="Alasan override"
											value={overrideReason}
										/>
									) : null}
								</div>
							) : null}
						</div>
					) : null}

					{view === "dispatch" ? (
						<div className="space-y-4">
							{createdAssignments.map((assignment) => (
								<section
									className="border border-slate-300 bg-slate-50 p-5"
									key={assignment.id}
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="text-xs font-semibold uppercase text-slate-500">
												Kartu Dispatch
											</p>
											<h3 className="mt-1 text-lg font-semibold text-slate-900">
												{assignment.personnel.name}
											</h3>
											<p className="text-sm text-slate-500">
												{assignment.personnel.badgeNo}
											</p>
										</div>
										<span
											className={`px-2.5 py-1 text-xs font-semibold ${severityStyles[assignment.incident.severity]}`}
										>
											{severityLabels[assignment.incident.severity]}
										</span>
									</div>
									<div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
										<p>
											Insiden: {categoryLabels[assignment.incident.category]}
										</p>
										<p>ID: {assignment.incident.id}</p>
										<p>Lat: {assignment.incident.lat.toFixed(5)}</p>
										<p>Lng: {assignment.incident.lng.toFixed(5)}</p>
									</div>
									<div className="mt-5 flex justify-end">
										{assignment.incident.status === "ASSIGNED" ? (
											<Button
												disabled={updateOperationalStatus.isPending}
												onClick={() =>
													updateOperationalStatus.mutate({
														assignmentId: assignment.id,
														status: "EN_ROUTE",
													})
												}
											>
												<Navigation className="size-4" /> Konfirmasi Menuju Lokasi
											</Button>
										) : assignment.incident.status === "EN_ROUTE" ? (
											<Button
												disabled={updateOperationalStatus.isPending}
												onClick={() =>
													updateOperationalStatus.mutate({
														assignmentId: assignment.id,
														status: "ON_SCENE",
													})
												}
											>
												<Navigation className="size-4" /> Konfirmasi Tiba di Lokasi
											</Button>
										) : null}
									</div>
								</section>
							))}
						</div>
					) : null}

					{view === "success" ? (
						<div className="flex flex-col items-center justify-center py-10 text-center px-4">
							<img src="/matako-success.png" alt="Berhasil Diplot" className="w-56 h-56 object-contain mb-6 drop-shadow-sm" />
							<h2 className="text-3xl font-bold text-emerald-600 mb-3">Personel Berhasil Diplot!</h2>
							<p className="text-slate-500 mb-10 max-w-sm font-medium">
								Personel terpilih sudah sukses dimasukkan ke dalam daftar penanganan insiden ini.
							</p>
							<div className="flex w-full max-w-md gap-4">
								<button
									className="flex-1 rounded-full bg-slate-300/80 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
									onClick={() => (initialView === "assignment" ? onClose() : setView("detail"))}
									type="button"
								>
									{initialView === "assignment" ? "Tutup" : "Kembali"}
								</button>
								<button
									className="flex-1 rounded-full bg-[#1b3654] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#13273e]"
									onClick={() => setView("dispatch")}
									type="button"
								>
									Lihat Daftar Penugasan
								</button>
							</div>
						</div>
					) : null}
				</div>

				{view !== "success" ? (
					<footer className="flex flex-wrap items-center justify-end gap-2 border-slate-200 border-t bg-white px-4 py-3 sm:px-6">
					{view === "detail" ? (
						<Button disabled={!canAssign} onClick={() => setView("assignment")}>
							<Users className="size-4" /> Tugaskan Personel Terdekat
						</Button>
					) : null}
					{view === "assignment" ? (
						<Button
							disabled={
								selectedPersonnelIds.size === 0 ||
								assignPersonnel.isPending ||
								(hasBusySelection &&
									(!allowBusy || overrideReason.trim().length === 0))
							}
							onClick={() =>
								assignPersonnel.mutate({
									allowBusy,
									incidentId,
									overrideReason: overrideReason || undefined,
									personnelIds: [...selectedPersonnelIds],
								})
							}
						>
							<Users className="size-4" /> Tugaskan{" "}
							{selectedPersonnelIds.size || ""}
						</Button>
					) : null}
					{view === "dispatch" ? (
						<Button onClick={onClose}>Kembali ke Peta</Button>
					) : null}
					</footer>
				) : null}
			</div>
		</div>
	);
}
