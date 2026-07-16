import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowDownUp, ChevronDown, Clock, Filter, MapPin, Search } from "lucide-react";

import { IncidentCard } from "./incident-card";

export default async function HistoryPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	const incidents = [
		{
			id: 1,
			title: "Perampokan Bersenjata",
			date: "12 Agustus 2026",
			address: "Jl. Jenderal Sudirman No.Kav. 1, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270",
			severity: "Critical",
		},
		{
			id: 2,
			title: "Perampokan Bersenjata",
			date: "12 Agustus 2026",
			address: "Jl. Jenderal Sudirman No.Kav. 1, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270",
			severity: "Critical",
		},
		{
			id: 3,
			title: "Perampokan Bersenjata",
			date: "12 Agustus 2026",
			address: "Jl. Jenderal Sudirman No.Kav. 1, RT.1/RW.3, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10270",
			severity: "Critical",
		},
	];

	return (
		<div className="container mx-auto px-6 md:px-12 pt-10 pb-20 flex-col gap-6 items-center min-h-screen bg-white flex">
			<h1 className="text-2xl font-bold text-primary-500">Riwayat Insiden</h1>
			
			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row items-center gap-4">
				<div className="flex gap-3 w-full sm:w-auto ml-0 sm:ml-12">
					<button className="flex items-center gap-2 rounded-full border border-slate-400 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
						Filter
						<Filter className="h-3 w-3" />
					</button>
					<button className="flex items-center gap-2 rounded-full border border-slate-400 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
						Urutkan
						<ArrowDownUp className="h-3 w-3" />
					</button>
				</div>
				<div className="relative flex-1 w-full max-w-3xl">
					<input
						type="text"
						placeholder="Type here"
						className="w-full rounded-full border border-slate-400 py-2 pl-4 pr-10 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
					/>
					<Search className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
				</div>
			</div>

			{/* Incident List */}
			<div className="flex flex-col gap-4 max-w-5xl">
				{incidents.map((incident) => (
					<IncidentCard key={incident.id} incident={incident} />
				))}
			</div>
		</div>
	);
}
