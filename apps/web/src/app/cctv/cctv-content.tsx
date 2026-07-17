"use client";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Maximize2,
  ShieldAlert,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

const mockCameras = Array.from({ length: 9 }).map((_, i) => ({
  id: `CAM-0${i + 1}`,
  name: `Inference Point ${i + 1}`,
  url: `/inference_${i + 1}.mp4`,
  status: "ONLINE",
}));

type LogEntry = {
  id: number;
  camId: string;
  timestamp: Date;
  type: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  confidence: number;
};

const initialLogs: LogEntry[] = [
  {
    id: 1,
    camId: "CAM-01",
    timestamp: new Date(Date.now() - 50000),
    type: "INFO",
    message: "Pedestrian tracked",
    confidence: 94,
  },
  {
    id: 2,
    camId: "CAM-02",
    timestamp: new Date(Date.now() - 30000),
    type: "WARNING",
    message: "Unattended baggage detected",
    confidence: 82,
  },
];

export default function CctvContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeCam, setActiveCam] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [boundingBoxVisible, setBoundingBoxVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3x3 Camera Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockCameras.map((cam) => {
            const isAlerting = boundingBoxVisible && activeCam === cam.id;
            return (
              <div
                key={cam.id}
                className={`relative aspect-video w-full rounded-2xl p-0.5 overflow-hidden bg-black border-2 transition-all duration-300 ${
                  isAlerting
                    ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    : "border-slate-200 shadow-md hover:border-slate-300"
                }`}
              >
                <video
                  src={cam.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain opacity-90 mix-blend-lighten"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/5 to-slate-950/30 pointer-events-none" />

                {/* Simulated UI Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {isAlerting ? (
                    <span className="bg-red-600/90 text-white px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                      <div className="size-1.5 bg-white rounded-full animate-pulse" />
                      DETECTED
                    </span>
                  ) : (
                    <span className="bg-emerald-600/80 text-white px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                      <div className="size-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                  <span className="bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 px-2 py-0.5 text-[10px] font-bold rounded shadow-sm">
                    {cam.id}
                  </span>
                </div>

                {/* Simulated Bounding Box */}
                {isAlerting && (
                  <div className="absolute top-[20%] left-[30%] w-[40%] h-[60%] border-2 border-red-500 bg-red-500/10 transition-all duration-300 animate-in fade-in zoom-in-95">
                    <div className="absolute -top-5 left-[-2px] bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5">
                      SUSPICIOUS
                    </div>
                    <div className="absolute top-0 left-0 size-1.5 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 size-1.5 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 size-1.5 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 size-1.5 border-b-2 border-r-2 border-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Side Log Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col h-[calc(100vh-140px)] sticky top-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <ShieldAlert className="size-5 text-indigo-500" />
            Detection Logs
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border animate-in fade-in slide-in-from-right-4 duration-300 ${
                  log.type === "CRITICAL"
                    ? "bg-red-50 border-red-200"
                    : log.type === "WARNING"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {log.type === "CRITICAL" && (
                      <AlertCircle className="size-4 text-red-600" />
                    )}
                    {log.type === "WARNING" && (
                      <AlertCircle className="size-4 text-amber-500" />
                    )}
                    {log.type === "INFO" && (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    )}
                    <span className="text-xs font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                      {log.camId}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">
                    {isMounted
                      ? log.timestamp.toLocaleTimeString()
                      : "--:--:--"}
                  </span>
                </div>
                <p
                  className={`text-sm font-semibold leading-snug ${
                    log.type === "CRITICAL"
                      ? "text-red-900"
                      : log.type === "WARNING"
                        ? "text-amber-900"
                        : "text-slate-800"
                  }`}
                >
                  {log.message}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        log.type === "CRITICAL"
                          ? "bg-red-500"
                          : log.type === "WARNING"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${log.confidence}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {log.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
