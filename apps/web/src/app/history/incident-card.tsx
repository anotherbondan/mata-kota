"use client";

import { ChevronDown, ChevronUp, Clock, Lightbulb, MapPin, User } from "lucide-react";
import { useState } from "react";
import { AssignPersonnelModal } from "./assign-personnel-modal";

interface IncidentCardProps {
	incident: {
		id: number;
		title: string;
		date: string;
		address: string;
		severity: string;
	};
}

export function IncidentCard({ incident }: IncidentCardProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
			{/* Header */}
			<div className="flex items-start justify-between mb-5">
				<h3 className="font-extrabold text-slate-800 text-xl tracking-tight">
					{incident.title}
				</h3>
				<span className="rounded-full bg-red-200/60 text-red-700 px-4 py-1.5 text-xs font-bold shrink-0">
					{incident.severity}
				</span>
			</div>

			{/* Basic Info */}
			<div className="space-y-3.5 text-sm text-slate-600 font-medium">
				{isExpanded && (
					<div className="flex items-center gap-3">
						<User className="h-4 w-4 text-yellow-500" />
						<span>Briptu R. Saputra</span>
					</div>
				)}
				<div className="flex items-center gap-3">
					<Clock className="h-4 w-4 text-yellow-500" />
					<span>{incident.date}</span>
				</div>
				<div className="flex items-start gap-3 max-w-3xl">
					<MapPin className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
					<span className="leading-relaxed text-slate-500">
						{incident.address}
					</span>
				</div>
			</div>

			{/* Expanded Content */}
			{isExpanded && (
				<div className="mt-8 space-y-8 animate-in fade-in duration-300">
					{/* Description Box */}
					<div className="rounded-xl border border-blue-200 bg-[#f4f7fe] p-5 flex gap-4 text-sm text-[#4361ee] font-medium leading-relaxed">
						<Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
						<p>
							Telah terjadi aksi perampokan bersenjata di salah satu minimarket
							oleh dua orang tidak dikenal. Pelaku berhasil mengancam kasir dan
							membawa kabur sejumlah uang tunai serta barang berharga.
						</p>
					</div>

					{/* Photo/Video Evidence */}
					<div className="space-y-4">
						<h4 className="font-bold text-slate-800 text-base">Bukti Foto/Video</h4>
						<div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
							{/* Placeholder images */}
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-36 w-56 shrink-0 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden relative group cursor-pointer"
								>
									<img
										src="/matako-auth.png"
										alt={`Bukti ${i}`}
										className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
									/>
									<div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl pointer-events-none" />
								</div>
							))}
						</div>
					</div>

					{/* Verification Status */}
					<div className="space-y-3">
						<h4 className="font-bold text-slate-800 text-base">Status Verifikasi</h4>
						<p className="text-sm text-slate-500 font-medium">
							Pilih status di bawah untuk memperbarui perkembangan investigasi dan
							keaslian insiden di lokasi.
						</p>
						<div className="flex flex-wrap gap-3 pt-2">
							<button className="rounded-full bg-[#1e293b] text-white px-5 py-2.5 text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm">
								Belum Diverifikasi
							</button>
							<button className="rounded-full border border-slate-300 bg-white text-slate-600 px-5 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
								Sudah Diverifikasi
							</button>
							<button className="rounded-full border border-slate-300 bg-white text-slate-600 px-5 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
								Laporan Salah
							</button>
						</div>
					</div>

					{/* Assign Personnel Action */}
					<div className="flex justify-end pt-2">
						<button 
							onClick={() => setIsModalOpen(true)}
							className="rounded-full bg-[#1e293b] text-white px-6 py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
						>
							Tugaskan Personel
						</button>
					</div>
				</div>
			)}

			{/* Toggle Button - Pushed to bottom right */}
			<div className="mt-6 flex justify-end">
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors group"
				>
					{isExpanded ? "Tutup Selengkapnya" : "Lihat Selengkapnya"}
					{isExpanded ? (
						<ChevronUp className="h-4 w-4 text-yellow-500 group-hover:-translate-y-0.5 transition-transform" />
					) : (
						<ChevronDown className="h-4 w-4 text-yellow-500 group-hover:translate-y-0.5 transition-transform" />
					)}
				</button>
			</div>

			<AssignPersonnelModal 
				isOpen={isModalOpen} 
				onClose={() => setIsModalOpen(false)} 
			/>
		</div>
	);
}
