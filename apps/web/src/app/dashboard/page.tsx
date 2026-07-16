import { ChevronRight, Clock, Lightbulb, MapPin } from "lucide-react";

export default function DashboardPage() {
	return (
		<div className="space-y-10">
			{/* Stats Cards */}
			<section className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{[
					{ label: "Insiden Aktif", value: "18" },
					{ label: "Selesai Hari Ini", value: "20" },
					{ label: "Personel Bertugas", value: "20" },
					{ label: "Personel Tersedia", value: "20" },
				].map((stat, i) => (
					<div
						className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-center gap-2"
						key={stat.label}
					>
						<h3 className="text-sm font-bold text-gray-700">{stat.label}</h3>
						<p className="text-4xl font-bold text-secondary-500">
							{stat.value}
						</p>
					</div>
				))}
			</section>

			{/* Heatmap Section */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-bold text-primary-500">Peta Insiden</h2>
					<ChevronRight className="h-5 w-5 text-secondary-500" />
				</div>
				<div className="h-[300px] w-full rounded-2xl bg-gray-300 flex items-center justify-center">
					<p className="font-bold text-gray-800 text-lg">
						ini peta ada heatmapsnya
					</p>
				</div>
			</section>

			{/* Recent Incidents Section */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-bold text-primary-500">
						Insiden Terbaru
					</h2>
					<ChevronRight className="h-5 w-5 text-secondary-500" />
				</div>
				<div className="flex flex-col gap-4">
					{/* Incident Card 1 */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="font-bold text-primary-500 text-lg">
								Perampokan Bersenjata
							</h3>
							<span className="rounded-full bg-red-200 text-red-700 px-4 py-1 text-xs font-bold">
								Critical
							</span>
						</div>
						<div className="space-y-2 text-sm text-gray-600 font-medium">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-secondary-500" />
								<span>2 jam yang lalu</span>
							</div>
							<div className="flex items-start gap-2">
								<MapPin className="h-4 w-4 text-secondary-500 shrink-0 mt-0.5" />
								<span>
									Jl. Jenderal Sudirman No.Kav. 1, RT.1/RW.3, Gelora, Kecamatan
									Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta
									10270
								</span>
							</div>
						</div>
						<div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex gap-3 text-sm text-blue-600 font-medium">
							<Lightbulb className="h-5 w-5 text-blue-400 shrink-0" />
							<p>
								Telah terjadi aksi perampokan bersenjata di salah satu
								minimarket oleh dua orang tidak dikenal. Pelaku berhasil
								mengancam kasir dan membawa kabur sejumlah uang tunai serta
								barang berharga.
							</p>
						</div>
					</div>

					{/* Incident Card 2 */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="font-bold text-primary-500 text-lg">
								Perampokan Bersenjata
							</h3>
							<span className="rounded-full bg-orange-200 text-orange-700 px-4 py-1 text-xs font-bold">
								Medium
							</span>
						</div>
						<div className="space-y-2 text-sm text-gray-600 font-medium">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-secondary-500" />
								<span>2 jam yang lalu</span>
							</div>
							<div className="flex items-start gap-2">
								<MapPin className="h-4 w-4 text-secondary-500 shrink-0 mt-0.5" />
								<span>
									Jl. Jenderal Sudirman No.Kav. 1, RT.1/RW.3, Gelora, Kecamatan
									Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta
									10270
								</span>
							</div>
						</div>
						<div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex gap-3 text-sm text-blue-600 font-medium">
							<Lightbulb className="h-5 w-5 text-blue-400 shrink-0" />
							<p>
								Telah terjadi aksi perampokan bersenjata di salah satu
								minimarket oleh dua orang tidak dikenal. Pelaku berhasil
								mengancam kasir dan membawa kabur sejumlah uang tunai serta
								barang berharga.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Charts Section */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
				{/* Chart 1 */}
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-bold text-primary-500">Tren Insiden</h2>
						<ChevronRight className="h-5 w-5 text-secondary-500" />
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm min-h-[300px] flex items-center justify-center">
						<div className="w-full h-[250px] bg-gray-50 flex items-center justify-center border border-dashed border-gray-200 rounded">
							<p className="text-gray-400 font-medium text-sm">
								Bar Chart Placeholder
							</p>
						</div>
					</div>
				</div>

				{/* Chart 2 */}
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-bold text-primary-500">
							Komposisi Laporan
						</h2>
						<ChevronRight className="h-5 w-5 text-secondary-500" />
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm min-h-[300px] flex items-center justify-center">
						<div className="w-full h-[250px] bg-gray-50 flex items-center justify-center border border-dashed border-gray-200 rounded">
							<p className="text-gray-400 font-medium text-sm">
								Pie Chart Placeholder
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
