"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const trendData = [
	{ insiden: 95, time: "00:00" },
	{ insiden: 96, time: "04:00" },
	{ insiden: 90, time: "08:00" },
	{ insiden: 55, time: "12:00" },
	{ insiden: 10, time: "16:00" },
	{ insiden: 40, time: "20:00" },
];

const compositionData = [
	{ laporan: 18, name: "Bersenjata" },
	{ laporan: 40, name: "Pencurian" },
	{ laporan: 78, name: "Narkoba/Miras" },
	{ laporan: 68, name: "Gangguan Ketertiban" },
	{ laporan: 22, name: "Kekerasan" },
	{ laporan: 21, name: "Curanmor" },
	{ laporan: 10, name: "Lainnya" },
];

const timeOptions = ["Hari ini", "Minggu ini", "Bulan ini"] as const;

function TimeFilter({ id }: { id: string }) {
	return (
		<div className="mb-6 flex flex-col gap-2">
			<label className="text-xs font-bold text-slate-700" htmlFor={id}>
				Pilih Waktu <span className="text-red-500">*</span>
			</label>
			<select
				className="w-full max-w-xs rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
				defaultValue={timeOptions[0]}
				id={id}
			>
				{timeOptions.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</div>
	);
}

export function TrendChart() {
	return (
		<div className="flex h-full w-full flex-col">
			<TimeFilter id="trend-time-range" />
			<div className="h-[280px] w-full">
				<ResponsiveContainer height="100%" width="100%">
					<AreaChart
						data={trendData}
						margin={{ bottom: 0, left: -20, right: 10, top: 10 }}
					>
						<defs>
							<linearGradient id="colorInsiden" x1="0" x2="0" y1="0" y2="1">
								<stop offset="5%" stopColor="#ff7c7c" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#ff7c7c" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid
							stroke="#e2e8f0"
							strokeDasharray="3 3"
							vertical={false}
						/>
						<XAxis
							axisLine={false}
							dataKey="time"
							dy={10}
							tick={{ fill: "#64748b", fontSize: 10 }}
							tickLine={false}
						/>
						<YAxis
							axisLine={false}
							domain={[0, 100]}
							tick={{ fill: "#64748b", fontSize: 10 }}
							tickLine={false}
							ticks={[0, 20, 40, 60, 80, 100]}
						/>
						<Tooltip
							contentStyle={{
								border: "none",
								borderRadius: "8px",
								boxShadow: "0 4px 15px -3px rgba(0,0,0,0.1)",
							}}
							labelStyle={{ color: "#334155", fontWeight: "bold" }}
						/>
						<Legend
							iconType="circle"
							wrapperStyle={{
								color: "#64748b",
								fontSize: "12px",
								marginTop: "20px",
							}}
						/>
						<Area
							activeDot={{
								fill: "#ff7c7c",
								r: 6,
								stroke: "#fff",
								strokeWidth: 2,
							}}
							dataKey="insiden"
							dot={{ fill: "#fff", r: 4, stroke: "#ff7c7c", strokeWidth: 2 }}
							fill="url(#colorInsiden)"
							fillOpacity={1}
							name="Insiden"
							stroke="#ff7c7c"
							strokeWidth={2}
							type="monotone"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

export function CompositionChart() {
	return (
		<div className="flex h-full w-full flex-col">
			<TimeFilter id="composition-time-range" />
			<div className="h-[280px] w-full">
				<ResponsiveContainer height="100%" width="100%">
					<BarChart
						data={compositionData}
						margin={{ bottom: 25, left: -20, right: 10, top: 10 }}
					>
						<CartesianGrid
							stroke="#e2e8f0"
							strokeDasharray="3 3"
							vertical={false}
						/>
						<XAxis
							axisLine={false}
							dataKey="name"
							dx={-5}
							dy={10}
							tick={{
								angle: -45,
								fill: "#64748b",
								fontSize: 9,
								textAnchor: "end",
							}}
							tickLine={false}
						/>
						<YAxis
							axisLine={false}
							domain={[0, 100]}
							tick={{ fill: "#64748b", fontSize: 10 }}
							tickLine={false}
							ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
						/>
						<Tooltip
							contentStyle={{
								border: "none",
								borderRadius: "8px",
								boxShadow: "0 4px 15px -3px rgba(0,0,0,0.1)",
							}}
							cursor={{ fill: "#f1f5f9" }}
							labelStyle={{ color: "#334155", fontWeight: "bold" }}
						/>
						<Legend
							iconType="square"
							wrapperStyle={{
								color: "#64748b",
								fontSize: "12px",
								marginTop: "15px",
							}}
						/>
						<Bar
							barSize={32}
							dataKey="laporan"
							fill="#334155"
							name="Laporan"
							radius={[2, 2, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
