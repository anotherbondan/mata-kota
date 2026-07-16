import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowDownUp, ChevronDown, Clock, Filter, MapPin, Search } from "lucide-react";

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
		<div className="container mx-auto px-6 md:px-12 py-10 max-w-7xl space-y-8 min-h-screen bg-white">
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
					<div
						key={incident.id}
						className="rounded-xl border border-gray-200 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
					>
						<div className="flex items-start justify-between mb-4">
							<h3 className="font-bold text-slate-800 text-lg">
								{incident.title}
							</h3>
							<span className="rounded-full bg-red-200 text-red-700 px-4 py-1 text-xs font-bold shrink-0">
								{incident.severity}
							</span>
						</div>
						<div className="space-y-3 text-sm text-slate-600 font-medium">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-primary-400" />
								<span>{incident.date}</span>
							</div>
							<div className="flex items-start gap-2 max-w-3xl">
								<MapPin className="h-4 w-4 text-primary-400 shrink-0 mt-0.5" />
								<span className="leading-relaxed">
									{incident.address}
								</span>
							</div>
						</div>
						<div className="mt-4 flex justify-end">
							<button className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
								Lihat Selengkapnya
								<ChevronDown className="h-3 w-3 text-primary-400" />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
