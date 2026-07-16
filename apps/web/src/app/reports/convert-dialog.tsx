"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { categoryLabels, severityLabels } from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

interface ConvertDialogProps {
	isOpen: boolean;
	onClose: () => void;
	report: {
		id: string;
		category: string;
		description: string;
	} | null;
}

const CATEGORY_OPTIONS = Object.entries(categoryLabels) as [string, string][];
const SEVERITY_OPTIONS = Object.entries(severityLabels) as [string, string][];

export default function ConvertDialog({
	isOpen,
	onClose,
	report,
}: ConvertDialogProps) {
	const queryClient = useQueryClient();
	const [category, setCategory] = useState("");
	const [severity, setSeverity] = useState("MEDIUM");

	useEffect(() => {
		if (report) {
			setCategory(report.category);
			setSeverity("MEDIUM");
		}
	}, [report]);

	const convertMutation = useMutation(
		trpc.reports.convertToIncident.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries();
				onClose();
			},
		})
	);

	if (!isOpen || !report) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				aria-hidden
				className="absolute inset-0 bg-black/30 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Dialog */}
			<div className="relative z-10 mx-4 w-full max-w-lg rounded-3xl border border-slate-100/60 bg-white p-6 shadow-[0_20px_60px_rgb(0,0,0,0.12)] sm:p-8">
				{/* Close button */}
				<button
					className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
					onClick={onClose}
					type="button"
				>
					<X className="size-5" />
				</button>

				{/* Header */}
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50">
						<AlertTriangle className="size-5 text-amber-600" />
					</div>
					<h2 className="text-lg font-semibold text-slate-900">
						Konversi Laporan ke Insiden
					</h2>
				</div>

				{/* Report description preview */}
				<div className="mt-5 rounded-2xl bg-slate-50 p-4">
					<p className="text-xs font-medium text-slate-500">
						Deskripsi Laporan
					</p>
					<p className="mt-1 text-sm leading-relaxed text-slate-700">
						{report.description}
					</p>
				</div>

				{/* Form */}
				<div className="mt-6 space-y-4">
					{/* Category */}
					<div>
						<label
							className="mb-1.5 block text-sm font-medium text-slate-700"
							htmlFor="convert-category"
						>
							Kategori
						</label>
						<select
							className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
							id="convert-category"
							onChange={(e) => setCategory(e.target.value)}
							value={category}
						>
							{CATEGORY_OPTIONS.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>

					{/* Severity */}
					<div>
						<label
							className="mb-1.5 block text-sm font-medium text-slate-700"
							htmlFor="convert-severity"
						>
							Tingkat Keparahan
						</label>
						<select
							className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
							id="convert-severity"
							onChange={(e) => setSeverity(e.target.value)}
							value={severity}
						>
							{SEVERITY_OPTIONS.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Actions */}
				<div className="mt-8 flex items-center justify-end gap-3">
					<button
						className="h-10 rounded-xl px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
						disabled={convertMutation.isPending}
						onClick={onClose}
						type="button"
					>
						Batal
					</button>
					<button
						className="flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
						disabled={convertMutation.isPending}
						onClick={() =>
							convertMutation.mutate({
								reportId: report.id,
								category: category as
									| "ALTERCATION"
									| "CROWD"
									| "OTHER"
									| "SUSPICIOUS_VEHICLE"
									| "THEFT"
									| "TRAFFIC_INCIDENT",
								severity: severity as
									| "CRITICAL"
									| "HIGH"
									| "LOW"
									| "MEDIUM",
							})
						}
						type="button"
					>
						{convertMutation.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Mengonversi…
							</>
						) : (
							"Konversi"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
