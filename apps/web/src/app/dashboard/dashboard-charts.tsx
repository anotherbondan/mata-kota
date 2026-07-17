"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const COMPOSITION_COLORS = [
	"#3b82f6", // blue
	"#10b981", // emerald
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#0ea5e9", // sky
	"#64748b", // slate
];

interface TrendChartProps {
	data: Array<{ count: number; date: string }>;
}

interface CompositionChartProps {
	data: Array<{ category: string; count: number }>;
}

export function TrendChart({ data }: TrendChartProps) {
	const chartData = data.map((item) => ({
		...item,
		label: new Intl.DateTimeFormat("id-ID", {
			day: "2-digit",
			month: "short",
		}).format(new Date(`${item.date}T00:00:00+07:00`)),
	}));

	return (
		<div className="h-[260px] w-full">
			<ResponsiveContainer height="100%" width="100%">
				<AreaChart
					data={chartData}
					margin={{ bottom: 0, left: -24, right: 8, top: 8 }}
				>
					<CartesianGrid
						stroke="#e2e8f0"
						strokeDasharray="3 3"
						vertical={false}
					/>
					<XAxis
						axisLine={false}
						dataKey="label"
						tick={{ fill: "#64748b", fontSize: 11 }}
						tickLine={false}
					/>
					<YAxis
						allowDecimals={false}
						axisLine={false}
						tick={{ fill: "#64748b", fontSize: 11 }}
						tickLine={false}
					/>
					<Tooltip
						contentStyle={{ borderColor: "#e2e8f0", borderRadius: 6 }}
						formatter={(value) => [value, "Insiden"]}
					/>
					<Area
						dataKey="count"
						fill="#fecaca"
						fillOpacity={0.7}
						stroke="#dc2626"
						strokeWidth={2}
						type="monotone"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

export function CompositionChart({ data }: CompositionChartProps) {
	return (
		<div className="h-[260px] w-full">
			<ResponsiveContainer height="100%" width="100%">
				<BarChart
					data={data}
					layout="vertical"
					margin={{ bottom: 0, left: 16, right: 16, top: 8 }}
				>
					<CartesianGrid
						horizontal={false}
						stroke="#e2e8f0"
						strokeDasharray="3 3"
					/>
					<XAxis
						allowDecimals={false}
						axisLine={false}
						tick={{ fill: "#64748b", fontSize: 11 }}
						tickLine={false}
						type="number"
					/>
					<YAxis
						axisLine={false}
						dataKey="category"
						tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
						tickLine={false}
						type="category"
						width={160}
					/>
					<Tooltip
						contentStyle={{ borderColor: "#e2e8f0", borderRadius: 6, fontSize: "12px" }}
						formatter={(value) => [value, "Laporan"]}
						cursor={{ fill: "#f8fafc" }}
					/>
					<Bar dataKey="count" radius={[0, 4, 4, 0]}>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
