"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, X } from "lucide-react";
import { useState } from "react";

import { categoryLabels, severityLabels } from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

interface CreateIncidentDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

const CATEGORIES = Object.keys(categoryLabels);
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function CreateIncidentDialog({
	isOpen,
	onClose,
}: CreateIncidentDialogProps) {
	const queryClient = useQueryClient();
	const [category, setCategory] = useState("CROWD");
	const [severity, setSeverity] = useState("LOW");
	const [lat, setLat] = useState("-6.1751");
	const [lng, setLng] = useState("106.8272");

	const createMutation = useMutation(
		trpc.incidents.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries();
				resetForm();
				onClose();
			},
		})
	);

	function resetForm() {
		setCategory("CROWD");
		setSeverity("LOW");
		setLat("-6.1751");
		setLng("106.8272");
	}

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const parsedLat = Number.parseFloat(lat);
		const parsedLng = Number.parseFloat(lng);
		if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
			return;
		}
		createMutation.mutate({
			category: category as any,
			lat: parsedLat,
			lng: parsedLng,
			severity: severity as any,
		});
	}

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="relative mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="grid size-10 place-items-center rounded-full bg-primary-100 text-primary-600">
							<Plus className="size-5" />
						</div>
						<h2 className="text-lg font-bold text-slate-800">
							Buat Insiden Baru
						</h2>
					</div>
					<button
						className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
						onClick={onClose}
						type="button"
					>
						<X className="size-4" />
					</button>
				</div>

				<form className="space-y-5" onSubmit={handleSubmit}>
					{/* Category */}
					<div>
						<label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
							Kategori
						</label>
						<select
							className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none"
							onChange={(e) => setCategory(e.target.value)}
							value={category}
						>
							{CATEGORIES.map((cat) => (
								<option key={cat} value={cat}>
									{categoryLabels[cat]}
								</option>
							))}
						</select>
					</div>

					{/* Severity */}
					<div>
						<label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
							Tingkat Keparahan
						</label>
						<div className="grid grid-cols-4 gap-2">
							{SEVERITIES.map((sev) => (
								<button
									className={`h-10 rounded-xl text-xs font-bold transition-all ${
										severity === sev
											? sev === "CRITICAL"
												? "bg-red-600 text-white shadow-md"
												: sev === "HIGH"
													? "bg-orange-500 text-white shadow-md"
													: sev === "MEDIUM"
														? "bg-amber-500 text-white shadow-md"
														: "bg-emerald-500 text-white shadow-md"
											: "bg-slate-100 text-slate-600 hover:bg-slate-200"
									}`}
									key={sev}
									onClick={() => setSeverity(sev)}
									type="button"
								>
									{severityLabels[sev]}
								</button>
							))}
						</div>
					</div>

					{/* Location */}
					<div>
						<label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
							<MapPin className="size-3.5" />
							Lokasi
						</label>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-[10px] text-slate-400 mb-1">
									Latitude
								</label>
								<input
									className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none"
									onChange={(e) => setLat(e.target.value)}
									placeholder="-6.1751"
									type="text"
									value={lat}
								/>
							</div>
							<div>
								<label className="block text-[10px] text-slate-400 mb-1">
									Longitude
								</label>
								<input
									className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none"
									onChange={(e) => setLng(e.target.value)}
									placeholder="106.8272"
									type="text"
									value={lng}
								/>
							</div>
						</div>
					</div>

					{/* Error */}
					{createMutation.isError ? (
						<p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
							Gagal membuat insiden. Silakan coba lagi.
						</p>
					) : null}

					{/* Submit */}
					<button
						className="w-full h-12 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={createMutation.isPending}
						type="submit"
					>
						{createMutation.isPending
							? "Membuat..."
							: "Buat Insiden"}
					</button>
				</form>
			</div>
		</div>
	);
}
