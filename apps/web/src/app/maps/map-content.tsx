import { Search } from "lucide-react";

export default function MapPageContent() {
	return (
		<div className="min-h-screen ">
			<div className="relative w-full h-full rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden shadow-sm flex items-center justify-center">
				{/* Map Placeholder */}
				<div className="text-center space-y-4">
					<div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-500 mb-2">
						<Search className="h-10 w-10" />
					</div>
					<h2 className="text-xl font-bold text-gray-700">
						Integrasi Peta (Mapbox/Google Maps)
					</h2>
					<p className="text-gray-500 max-w-md mx-auto">
						Area ini disiapkan untuk integrasi dengan library peta seperti
						Mapbox GL JS atau Google Maps API untuk menampilkan persebaran
						insiden secara real-time.
					</p>
				</div>

				{/* Floating Map Controls Placeholder */}
				<div className="absolute right-6 top-6 flex flex-col gap-2">
					<div className="bg-white rounded-lg shadow-md p-1 border border-gray-200 flex flex-col">
						<button
							className="p-2 hover:bg-gray-50 text-gray-700 border-b border-gray-100 font-bold"
							type="button"
						>
							+
						</button>
						<button
							className="p-2 hover:bg-gray-50 text-gray-700 font-bold"
							type="button"
						>
							-
						</button>
					</div>
				</div>

				{/* Legend Placeholder */}
				<div className="absolute left-6 bottom-6 bg-white rounded-xl shadow-md border border-gray-200 p-4 w-48 space-y-3">
					<h4 className="font-bold text-sm text-gray-700">Tingkat Keparahan</h4>
					<div className="space-y-2 text-sm text-gray-600">
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-red-500" /> Critical
						</div>
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-orange-400" /> Medium
						</div>
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-yellow-400" /> Low
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
