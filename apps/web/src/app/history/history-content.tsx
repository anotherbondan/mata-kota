"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Lightbulb,
  MapPin,
  Search,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import IncidentDetailModal from "@/components/incident-detail-modal";
import {
  categoryLabels,
  formatIncidentTime,
  severityLabels,
  severityStyles,
  statusLabels,
} from "@/lib/incident-display";
import { trpc } from "@/utils/trpc";

export default function HistoryContent() {
  const { data: session } = authClient.useSession();
  const isOperator = (session?.user as any)?.role === "OPERATOR";
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [severity, setSeverity] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const incidents = useQuery(
    trpc.incidents.list.queryOptions({
      limit: 100,
      severity:
        severity === "ALL"
          ? undefined
          : (severity as "CRITICAL" | "HIGH" | "LOW" | "MEDIUM"),
      status:
        status === "ALL"
          ? undefined
          : (status as
              | "ASSIGNED"
              | "EN_ROUTE"
              | "ON_SCENE"
              | "REPORTED"
              | "RESOLVED"
              | "VERIFIED"),
    }),
  );
  const visibleIncidents = useMemo(
    () =>
      (incidents.data?.items ?? []).filter((incident) => {
        if (!deferredSearch) {
          return true;
        }
        const category = categoryLabels[incident.category] ?? incident.category;
        return (
          incident.id.toLowerCase().includes(deferredSearch) ||
          category.toLowerCase().includes(deferredSearch)
        );
      }),
    [deferredSearch, incidents.data?.items],
  );

  const queryClient = useQueryClient();
  const verifyMutation = useMutation(
    trpc.incidents.verify.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    }),
  );
  const elevateMutation = useMutation(
    trpc.incidents.elevate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    }),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col gap-4 border-slate-200 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Riwayat Insiden
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {visibleIncidents.length} insiden tercatat
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Cari insiden"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kategori atau ID"
              value={search}
            />
          </div>
          <select
            aria-label="Filter keparahan"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            onChange={(event) => setSeverity(event.target.value)}
            value={severity}
          >
            <option value="ALL">Semua tingkat</option>
            <option value="CRITICAL">Kritis</option>
            <option value="HIGH">Tinggi</option>
            <option value="MEDIUM">Sedang</option>
            <option value="LOW">Rendah</option>
          </select>
          <select
            aria-label="Filter status"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="ALL">Semua status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {incidents.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Memuat riwayat...
          </div>
        ) : null}
        {visibleIncidents.length === 0 && !incidents.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Tidak ada insiden yang sesuai.
          </div>
        ) : null}
        {visibleIncidents.map((incident) => {
          const isExpanded = expandedId === incident.id;
          return (
            <div
              key={incident.id}
              className={`overflow-hidden rounded-[20px] border bg-white shadow-sm transition-all hover:shadow-md ${incident.isElevated ? "border-red-400 bg-red-50/20" : "border-slate-200"}`}
            >
              <div
                className="flex w-full flex-col p-5 sm:p-7 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : incident.id)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-900 text-lg">
                    {categoryLabels[incident.category] ?? incident.category}
                  </h2>
                  <div className="flex gap-2">
                    {incident.isElevated && (
                      <span className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold tracking-wide text-white animate-pulse">
                        ESKALASI
                      </span>
                    )}
                    <span
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide ${severityStyles[incident.severity]}`}
                    >
                      {severityLabels[incident.severity] ?? incident.severity}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-col gap-3 text-sm text-slate-600 mb-6">
                  <div className="flex items-start gap-3"></div>
                  <div className="flex items-start gap-3">
                    <div className="text-amber-500 mt-0.5">
                      <Clock className="size-5" />
                    </div>
                    <span className="font-medium">
                      {formatIncidentTime(incident.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-amber-500 mt-0.5">
                      <MapPin className="size-5" />
                    </div>
                    <span className="font-medium leading-relaxed">
                      {incident.city && incident.province
                        ? `${incident.city}, ${incident.province}`
                        : `${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`}
                    </span>
                  </div>
                </div>

                {/* Footer of closed view */}
                {!isExpanded && (
                  <div className="flex justify-end">
                    <button className="flex items-center gap-1.5 text-sm font-semibold text-[#1b3654]">
                      Lihat Selengkapnya
                      <ChevronDown className="size-4 text-amber-500" />
                    </button>
                  </div>
                )}

                {/* Expanded View */}
                {isExpanded && (
                  <div
                    className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Summary Block */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex gap-3 text-slate-600 mb-6">
                      <Lightbulb className="size-5 shrink-0 mt-0.5 text-blue-500" />
                      <p className="text-sm font-medium leading-relaxed">
                        Telah terjadi aksi{" "}
                        {categoryLabels[incident.category]?.toLowerCase() ??
                          "insiden"}{" "}
                        di lokasi ini. Laporan awal masuk pada{" "}
                        {formatIncidentTime(incident.createdAt)}.
                      </p>
                    </div>

                    {/* Evidence */}
                    <h3 className="font-bold text-slate-900 text-base mb-3">
                      Bukti Foto/Video
                    </h3>
                    {incident.evidence && incident.evidence.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-2 mb-6">
                        {incident.evidence.map((ev, i) => (
                          <div
                            key={ev.id}
                            className="h-40 w-64 shrink-0 rounded-2xl border border-amber-200/60 bg-slate-100 overflow-hidden relative"
                          >
                            {ev.url && (
                              <img
                                src={ev.url}
                                alt={`Bukti ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                        Belum ada bukti foto/video yang dilampirkan.
                      </div>
                    )}

                    {/* Verification Status */}
                    {isOperator && (
                      <>
                        <h3 className="font-bold text-slate-900 text-base mb-1">
                          Status Verifikasi
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Pilih status di bawah untuk memperbarui perkembangan
                          investigasi dan keaslian insiden di lokasi.
                        </p>
                        <div className="flex flex-wrap gap-3 mb-8">
                          <button
                        disabled={verifyMutation.isPending}
                        onClick={() =>
                          verifyMutation.mutate({
                            id: incident.id,
                            verificationStatus: "UNVERIFIED",
                          })
                        }
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${incident.verificationStatus === "UNVERIFIED" ? "bg-[#1b3654] text-white border border-[#1b3654]" : "bg-white text-[#1b3654] border border-slate-300 hover:bg-slate-50"}`}
                      >
                        Belum Ditangani
                      </button>
                      <button
                        disabled={verifyMutation.isPending}
                        onClick={() =>
                          verifyMutation.mutate({
                            id: incident.id,
                            verificationStatus: "VERIFIED",
                          })
                        }
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${incident.verificationStatus === "VERIFIED" ? "bg-[#1b3654] text-white border border-[#1b3654]" : "bg-white text-[#1b3654] border border-slate-300 hover:bg-slate-50"}`}
                      >
                        Sudah Ditangani
                      </button>
                      <button
                        disabled={verifyMutation.isPending}
                        onClick={() =>
                          verifyMutation.mutate({
                            id: incident.id,
                            verificationStatus: "FALSE_REPORT",
                          })
                        }
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${incident.verificationStatus === "FALSE_REPORT" ? "bg-[#1b3654] text-white border border-[#1b3654]" : "bg-white text-[#1b3654] border border-slate-300 hover:bg-slate-50"}`}
                      >
                        Laporan Salah
                        </button>
                      </div>
                      </>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-col items-end gap-6">
                      {isOperator && (
                        <div className="flex flex-wrap items-center gap-3 w-full justify-end">
                        <button
                          disabled={elevateMutation.isPending}
                          onClick={() => elevateMutation.mutate({ id: incident.id, isElevated: !incident.isElevated })}
                          className={`rounded-full px-8 py-3 text-sm font-semibold transition-colors ${incident.isElevated ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                        >
                          {incident.isElevated ? "Batalkan Eskalasi" : "Eskalasi Kasus"}
                        </button>
                        <button
                          onClick={() => setSelectedIncidentId(incident.id)}
                          className="rounded-full bg-slate-300/80 px-8 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                        >
                          {["ASSIGNED", "EN_ROUTE", "ON_SCENE"].includes(incident.status) ? "Lihat Penugasan" : "Tugaskan Personel"}
                        </button>
                      </div>
                      )}
                      <button
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#1b3654]"
                        onClick={() => setExpandedId(null)}
                      >
                        Tutup Detail
                        <ChevronUp className="size-4 text-amber-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const selectedIncident = incidents.data?.items.find((i) => i.id === selectedIncidentId);
        const isAssigned = selectedIncident && ["ASSIGNED", "EN_ROUTE", "ON_SCENE"].includes(selectedIncident.status);
        
        return (
          <IncidentDetailModal 
            incidentId={selectedIncidentId} 
            initialView={isAssigned ? "dispatch" : "assignment"}
            onClose={() => setSelectedIncidentId(null)} 
          />
        );
      })()}
    </main>
  );
}
