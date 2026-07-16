"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Users, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { trpc } from "@/utils/trpc";

interface HrSyncModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface MockOfficer {
	badgeNo: string;
	name: string;
	unitType: string;
}

const mockNames = [
	"Budi Santoso", "Agus Setiawan", "Hendra Pratama", "Rina Wati", 
	"Eko Prasetyo", "Andi Wijaya", "Sri Mulyani", "Iwan Fals",
	"Dwi Cahyono", "Nina Safitri", "Arief Rahman", "Siti Aminah",
	"Rudi Hermawan", "Indra Gunawan", "Fajar Hidayat"
];

const mockUnits = ["SABHARA", "LANTAS", "BRIMOB", "RESERSE"];

function generateMockOfficers(count: number): MockOfficer[] {
	const officers: MockOfficer[] = [];
	for (let i = 0; i < count; i++) {
		const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
		const randomUnit = mockUnits[Math.floor(Math.random() * mockUnits.length)];
		const randomBadge = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 digits
		officers.push({
			badgeNo: randomBadge,
			name: `${randomName} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`,
			unitType: randomUnit,
		});
	}
	return officers;
}

export default function HrSyncModal({ isOpen, onClose }: HrSyncModalProps) {
	const queryClient = useQueryClient();
	const [mockData, setMockData] = useState<MockOfficer[]>([]);
	const [selectedBadges, setSelectedBadges] = useState<Set<string>>(new Set());

	useEffect(() => {
		if (isOpen) {
			const data = generateMockOfficers(15);
			setMockData(data);
			setSelectedBadges(new Set(data.map(d => d.badgeNo)));
		}
	}, [isOpen]);

	const syncMutation = useMutation(
		trpc.personnel.syncExternal.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries();
				onClose();
			},
		})
	);

	if (!isOpen) return null;

	const handleToggleAll = (checked: boolean) => {
		if (checked) {
			setSelectedBadges(new Set(mockData.map((d) => d.badgeNo)));
		} else {
			setSelectedBadges(new Set());
		}
	};

	const handleToggleOne = (badgeNo: string) => {
		const newSelected = new Set(selectedBadges);
		if (newSelected.has(badgeNo)) {
			newSelected.delete(badgeNo);
		} else {
			newSelected.add(badgeNo);
		}
		setSelectedBadges(newSelected);
	};

	const handleSync = () => {
		const toSync = mockData.filter((d) => selectedBadges.has(d.badgeNo));
		syncMutation.mutate(toSync);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
			<div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 p-6">
					<div className="flex items-center gap-3">
						<div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600">
							<Users className="size-5" />
						</div>
						<div>
							<h2 className="text-xl font-bold text-slate-800">
								Sistem SDM Polri (Mock)
							</h2>
							<p className="text-sm text-slate-500">
								Pilih personel untuk disinkronisasi ke Mata Kota
							</p>
						</div>
					</div>
					<button
						className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
						onClick={onClose}
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Body */}
				<div className="overflow-y-auto p-6 bg-slate-50 flex-1">
					<div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
								<tr>
									<th className="px-4 py-3 font-semibold w-12 text-center">
										<input 
											type="checkbox" 
											className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
											checked={selectedBadges.size === mockData.length && mockData.length > 0}
											onChange={(e) => handleToggleAll(e.target.checked)}
										/>
									</th>
									<th className="px-4 py-3 font-semibold">NRP</th>
									<th className="px-4 py-3 font-semibold">Nama</th>
									<th className="px-4 py-3 font-semibold">Unit</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{mockData.map((officer) => (
									<tr key={officer.badgeNo} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-3 text-center">
											<input 
												type="checkbox"
												className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
												checked={selectedBadges.has(officer.badgeNo)}
												onChange={() => handleToggleOne(officer.badgeNo)}
											/>
										</td>
										<td className="px-4 py-3 font-mono text-slate-600">{officer.badgeNo}</td>
										<td className="px-4 py-3 font-medium text-slate-900">{officer.name}</td>
										<td className="px-4 py-3 text-slate-500">{officer.unitType}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-slate-100 p-6 bg-white rounded-b-3xl flex justify-between items-center">
					<p className="text-sm text-slate-500 font-medium">
						{selectedBadges.size} personel terpilih
					</p>
					<div className="flex gap-3">
						<button
							className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
							onClick={onClose}
							disabled={syncMutation.isPending}
						>
							Batal
						</button>
						<button
							className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
							onClick={handleSync}
							disabled={syncMutation.isPending || selectedBadges.size === 0}
						>
							{syncMutation.isPending ? (
								<RefreshCw className="size-4 animate-spin" />
							) : (
								<RefreshCw className="size-4" />
							)}
							{syncMutation.isPending ? "Menyinkronisasi..." : "Sinkronisasi"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
