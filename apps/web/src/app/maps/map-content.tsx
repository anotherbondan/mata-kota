"use client";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@mata-kota/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import { Clock, Filter, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import IncidentDetailModal from "@/components/incident-detail-modal";
import IncidentMap from "@/components/incident-map";
import { useMockOperationalFeed } from "@/hooks/use-mock-operational-feed";
import {
  categoryLabels,
  formatIncidentTime,
  severityLabels,
  severityStyles,
  statusLabels,
} from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

const POLLING_INTERVAL = 10_000;

type RouterOutput = inferRouterOutputs<AppRouter>;
type IncidentsOutput = RouterOutput["dashboard"]["incidentMap"];
type ReportsOutput = RouterOutput["dashboard"]["reportMap"];
type DevicesOutput = RouterOutput["devices"]["list"];

export default function MapPageContent({
  initialIncidents,
  initialReports,
  initialDevices,
}: {
  initialIncidents?: IncidentsOutput;
  initialReports?: ReportsOutput;
  initialDevices?: DevicesOutput;
}) {
  // useMockOperationalFeed(); // Disabled to stop creating case each 10 seconds
  const [category, setCategory] = useState("ALL");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [severity, setSeverity] = useState("ALL");
  const [timeRange, setTimeRange] = useState("current");
  const incidents = useQuery({
    ...trpc.dashboard.incidentMap.queryOptions({ activeOnly: false }),
    initialData: initialIncidents,
    refetchInterval: POLLING_INTERVAL,
  });
  const reports = useQuery({
    ...trpc.dashboard.reportMap.queryOptions(),
    initialData: initialReports,
    refetchInterval: POLLING_INTERVAL,
  });
  const latest = useQuery({
    ...trpc.incidents.list.queryOptions({ limit: 8 }),
    refetchInterval: POLLING_INTERVAL,
  });
  const devices = useQuery({
    ...trpc.devices.list.queryOptions(),
    initialData: initialDevices,
    refetchInterval: POLLING_INTERVAL,
  });
  
  const riskGrid = useQuery({
    ...trpc.dashboard.riskGrid.queryOptions({ 
      version: timeRange as "current" | "last_week" | "last_month" | "6_months_ago"
    }),
    refetchInterval: POLLING_INTERVAL,
  });

  const filteredIncidents = useMemo(() => {
    let hours = 24;
    if (timeRange === "last_week") hours = 168;
    if (timeRange === "last_month") hours = 720;
    if (timeRange === "6_months_ago") hours = 4320;
    const minimumTime = Date.now() - hours * 60 * 60 * 1000;
    return (incidents.data ?? []).filter(
      (incident) =>
        (category === "ALL" || incident.category === category) &&
        (severity === "ALL" || incident.severity === severity) &&
        new Date(incident.createdAt).getTime() >= minimumTime,
    );
  }, [category, incidents.data, severity, timeRange]);

  const filteredReports = useMemo(() => {
    let hours = 24;
    if (timeRange === "last_week") hours = 168;
    if (timeRange === "last_month") hours = 720;
    if (timeRange === "6_months_ago") hours = 4320;
    const minimumTime = Date.now() - hours * 60 * 60 * 1000;
    return (reports.data ?? []).filter(
      (report) =>
        (category === "ALL" || report.category === category) &&
        new Date(report.reportedAt).getTime() >= minimumTime,
    );
  }, [category, reports.data, timeRange]);

  return (
    <main className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 lg:h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
      <section className="flex flex-col h-[65vh] min-h-[500px] lg:h-full lg:min-h-0 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-w-0 border border-slate-100/60 bg-white">
        <div className="flex flex-col gap-3 border-slate-200 border-b p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="size-4" /> Filter Peta
          </div>
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              aria-label="Filter kategori"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="ALL">Semua kategori</option>
              {Object.entries(categoryLabels)
                .sort(([a], [b]) => (a === "OTHER" ? 1 : b === "OTHER" ? -1 : 0))
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
            <select
              aria-label="Filter tingkat keparahan"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              onChange={(event) => setSeverity(event.target.value)}
              value={severity}
            >
              <option value="ALL">Semua keparahan</option>
              <option value="CRITICAL">Kritis</option>
              <option value="HIGH">Tinggi</option>
              <option value="MEDIUM">Sedang</option>
              <option value="LOW">Rendah</option>
            </select>
            <select
              aria-label="Filter waktu"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              onChange={(event) => setTimeRange(event.target.value)}
              value={timeRange}
            >
              <option value="current">24 jam terakhir</option>
              <option value="last_week">1 minggu lalu</option>
              <option value="last_month">1 bulan lalu</option>
              <option value="6_months_ago">6 bulan lalu</option>
            </select>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {filteredIncidents.length + (riskGrid.data?.length ?? 0)} insiden / {filteredReports.length} laporan
          </span>
        </div>
        <IncidentMap
          className="flex-1 !h-auto !min-h-0 border-none rounded-b-3xl"
          incidents={[
            ...filteredIncidents,
            ...(riskGrid.data ?? []).map((cell, i) => ({
              id: `ai-pred-${i}-${cell.grid_lat}-${cell.grid_lng}`,
              lat: cell.grid_lat,
              lng: cell.grid_lng,
              category: "OTHER",
              severity: cell.risk_score >= 85 ? "CRITICAL" : cell.risk_score >= 65 ? "HIGH" : cell.risk_score >= 40 ? "MEDIUM" : "LOW",
              status: "REPORTED",
              heatmapScore: cell.risk_score
            }))
          ]}
          reports={filteredReports}
          units={devices.data ?? []}
          riskGrid={riskGrid.data ?? []}
          onSelectIncident={(id) => {
            setSelectedIncidentId(id);
          }}
        />
      </section>

      <aside className="min-h-0 border rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-slate-100/60 bg-white lg:flex lg:flex-col overflow-hidden">
        <div className="border-slate-200 border-b p-4">
          <h1 className="font-semibold text-slate-900">Insiden Terbaru</h1>
        </div>
        <div className="divide-y divide-slate-100 lg:flex-1 lg:overflow-y-auto">
          {latest.isLoading ? (
            <p className="p-4 text-sm text-slate-500">Memuat insiden...</p>
          ) : null}
          {latest.data?.items.map((incident) => (
            <button
              className="block w-full p-4 text-left transition-colors hover:bg-slate-50"
              key={incident.id}
              onClick={() => setSelectedIncidentId(incident.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">
                  {categoryLabels[incident.category] ?? incident.category}
                </p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wider ${severityStyles[incident.severity]}`}
                >
                  {severityLabels[incident.severity]}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                  <Clock className="size-3.5 text-slate-400" />
                  {formatIncidentTime(incident.createdAt)}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-slate-400" />
                  {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                </p>
                <p className="mt-1 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 self-start">
                  {statusLabels[incident.status] ?? incident.status}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <IncidentDetailModal
        incidentId={selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
      />
    </main>
  );
}
