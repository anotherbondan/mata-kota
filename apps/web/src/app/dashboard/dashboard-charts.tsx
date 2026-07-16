"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

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
					margin={{ bottom: 0, left: 12, right: 8, top: 8 }}
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
						tick={{ fill: "#475569", fontSize: 10 }}
						tickLine={false}
						type="category"
						width={100}
					/>
					<Tooltip
						contentStyle={{ borderColor: "#e2e8f0", borderRadius: 6 }}
						formatter={(value) => [value, "Laporan"]}
					/>
					<Bar dataKey="count" fill="#334155" radius={[0, 3, 3, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
