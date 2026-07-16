"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Navigation, Plus, X } from "lucide-react";
import { useState } from "react";

import { categoryLabels } from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

interface CreateReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

const CATEGORIES = Object.keys(categoryLabels);

export default function CreateReportDialog({
	isOpen,
	onClose,
}: CreateReportDialogProps) {
	const queryClient = useQueryClient();
	const [category, setCategory] = useState("CROWD");
	const [description, setDescription] = useState("");
	const [reporterRef, setReporterRef] = useState("");
	const [lat, setLat] = useState("-6.1751");
	const [lng, setLng] = useState("106.8272");
	const [isLocating, setIsLocating] = useState(false);

	const createMutation = useMutation(
		trpc.reports.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries();
				resetForm();
				onClose();
			},
		})
	);

	function resetForm() {
		setCategory("CROWD");
		setDescription("");
		setReporterRef("");
		setLat("-6.1751");
		setLng("106.8272");
	}

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const parsedLat = Number.parseFloat(lat);
		const parsedLng = Number.parseFloat(lng);
		if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng) || !description) {
			return;
		}
		
		createMutation.mutate({
			category,
			description,
			lat: parsedLat,
			lng: parsedLng,
			reporterRef: reporterRef || undefined,
		});
	}

	function handleGetLocation() {
		if (!navigator.geolocation) return;
		setIsLocating(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLat(position.coords.latitude.toFixed(5));
				setLng(position.coords.longitude.toFixed(5));
				setIsLocating(false);
			},
			(error) => {
				console.error(error);
				setIsLocating(false);
			},
			{ enableHighAccuracy: true }
		);
	}

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			<div className="relative mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="grid size-10 place-items-center rounded-full bg-primary-100 text-primary-600">
							<Plus className="size-5" />
						</div>
						<h2 className="text-lg font-bold text-slate-800">
							Buat Laporan Manual
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
									{categoryLabels[cat] || cat}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
							Deskripsi
						</label>
						<textarea
							required
							className="w-full h-24 rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none resize-none"
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Jelaskan detail laporan secara lengkap..."
							value={description}
						/>
					</div>

					<div>
						<label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
							Referensi Pelapor (Opsional)
						</label>
						<input
							className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none"
							onChange={(e) => setReporterRef(e.target.value)}
							placeholder="Misal: Nama, No Telp, atau ID Radio"
							type="text"
							value={reporterRef}
						/>
					</div>

					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
								<MapPin className="size-3.5" />
								Lokasi
							</label>
							<button
								type="button"
								onClick={handleGetLocation}
								disabled={isLocating}
								className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
							>
								{isLocating ? (
									<Loader2 className="size-3 animate-spin" />
								) : (
									<Navigation className="size-3" />
								)}
								Dapatkan Lokasi
							</button>
						</div>
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

					{createMutation.isError ? (
						<p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
							Gagal membuat laporan: {createMutation.error?.message}
						</p>
					) : null}

					<button
						className="w-full h-12 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={createMutation.isPending}
						type="submit"
					>
						{createMutation.isPending
							? "Membuat..."
							: "Buat Laporan"}
					</button>
				</form>
			</div>
		</div>
	);
}
