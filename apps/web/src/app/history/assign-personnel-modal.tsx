"use client";

import { ArrowDownUp, Filter, MapPin, Search, X } from "lucide-react";
import { useState } from "react";

interface AssignPersonnelModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AssignPersonnelModal({ isOpen, onClose }: AssignPersonnelModalProps) {
	if (!isOpen) return null;

	const personnel = Array.from({ length: 8 }).map((_, i) => ({
		id: i,
		name: "Briptu R. Saputra",
		nrp: "01234567",
		distance: "200m dari tempat kejadian",
		status: "Sedia",
	}));

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
				onClick={onClose}
			/>

			{/* Modal Content */}
			<div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				
				{/* Header */}
				<div className="flex items-start justify-between p-8 pb-4">
					<div className="space-y-2">
						<h2 className="text-2xl font-bold text-yellow-500">Pilih Personel</h2>
						<p className="text-slate-600 font-medium">
							Daftar personel aktif yang tersedia. Pilih satu atau beberapa nama untuk ditugaskan
							langsung ke titik lokasi kejadian.
						</p>
					</div>
					<button 
						onClick={onClose}
						className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
					>
						<X className="h-6 w-6" />
					</button>
				</div>

				{/* Toolbar */}
				<div className="flex flex-col sm:flex-row items-center gap-4 px-8 py-2">
					<div className="flex gap-3 w-full sm:w-auto shrink-0">
						<button className="flex items-center gap-2 rounded-full border border-slate-400 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
							Filter
							<Filter className="h-3.5 w-3.5" />
						</button>
						<button className="flex items-center gap-2 rounded-full border border-slate-400 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
							Urutkan
							<ArrowDownUp className="h-3.5 w-3.5" />
						</button>
					</div>
					<div className="relative flex-1 w-full">
						<input
							type="text"
							placeholder="Cari Personel"
							className="w-full rounded-full border border-slate-400 py-2 pl-4 pr-10 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
						/>
						<Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
					</div>
				</div>

				{/* Scrollable Personnel Grid */}
				<div className="flex-1 overflow-y-auto px-8 py-4 min-h-[300px]">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
						{personnel.map((person) => (
							<label 
								key={person.id}
								className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
							>
								<div className="pt-1">
									<input 
										type="checkbox" 
										className="h-5 w-5 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
									/>
								</div>
								<div className="flex-1 space-y-1.5">
									<div className="flex items-start justify-between gap-2">
										<div>
											<h4 className="font-bold text-slate-800 text-sm group-hover:text-slate-900">
												{person.name}
											</h4>
											<p className="text-xs text-slate-500">NRP {person.nrp}</p>
										</div>
										<span className="rounded-full bg-green-100 text-green-700 px-4 py-1 text-[10px] font-bold tracking-wide shrink-0">
											{person.status}
										</span>
									</div>
									<div className="flex items-center gap-1.5 pt-1 text-xs text-slate-500 font-medium">
										<MapPin className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
										<span>{person.distance}</span>
									</div>
								</div>
							</label>
						))}
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-6 px-8 border-t border-slate-100 flex justify-end bg-white rounded-b-3xl">
					<button className="rounded-full bg-[#1e293b] text-white px-8 py-3 text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm">
						Tugaskan
					</button>
				</div>
			</div>
		</div>
	);
}
