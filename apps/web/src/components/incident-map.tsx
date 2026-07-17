"use client";

import { X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

import { categoryLabels, formatIncidentTime } from "@/lib/incident-display";

export interface IncidentMapItem {
	category: string;
	heatmapScore?: number;
	id: string;
	lat: number;
	lng: number;
	severity: string;
	status: string;
}

export interface UnitMapItem {
	effectiveStatus: string;
	id: string;
	lastLat: number | null;
	lastLng: number | null;
	personnel: { id: string; name: string };
}

export interface ReportMapItem {
	category: string;
	description: string;
	id: string;
	lat: number;
	lng: number;
	reportedAt: string;
	reporterRef: string | null;
}

interface IncidentMapProps {
	className?: string;
	incidents: IncidentMapItem[];
	onSelectIncident: (id: string) => void;
	reports?: ReportMapItem[];
	units?: UnitMapItem[];
}

const EMPTY_REPORTS: ReportMapItem[] = [];
const EMPTY_UNITS: UnitMapItem[] = [];
const JAKARTA_CENTER: [number, number] = [106.8272, -6.1751];
const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const DEFAULT_COORDINATE_TOLERANCE = 0.000_01;

function stableHash(value: string) {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647;
	}
	return hash;
}

function generatedHeatmapScore(id: string) {
	return stableHash(id) % 101;
}

function heatmapScore(incident: IncidentMapItem) {
	if (typeof incident.heatmapScore !== "number") {
		return generatedHeatmapScore(incident.id);
	}
	return Math.round(Math.min(100, Math.max(0, incident.heatmapScore)));
}

function incidentGeoJson(incidents: IncidentMapItem[]) {
	return {
		features: incidents.map((incident) => ({
			geometry: {
				coordinates: [incident.lng, incident.lat],
				type: "Point" as const,
			},
			properties: {
				category: incident.category,
				heatmapScore: heatmapScore(incident),
				id: incident.id,
				severity: incident.severity,
				status: incident.status,
			},
			type: "Feature" as const,
		})),
		type: "FeatureCollection" as const,
	};
}

function reportCoordinates(report: ReportMapItem): [number, number] {
	const isAtDefaultCoordinate =
		Math.abs(report.lat - JAKARTA_CENTER[1]) <= DEFAULT_COORDINATE_TOLERANCE &&
		Math.abs(report.lng - JAKARTA_CENTER[0]) <= DEFAULT_COORDINATE_TOLERANCE;
	if (!isAtDefaultCoordinate) {
		return [report.lng, report.lat];
	}

	const hash = stableHash(report.id);
	const angle = ((hash % 3600) / 3600) * Math.PI * 2;
	const radius = 0.0007 + ((Math.floor(hash / 3600) % 1000) / 1000) * 0.0018;
	return [
		report.lng + Math.cos(angle) * radius,
		report.lat + Math.sin(angle) * radius,
	];
}

function reportGeoJson(reports: ReportMapItem[]) {
	return {
		features: reports.map((report) => ({
			geometry: {
				coordinates: reportCoordinates(report),
				type: "Point" as const,
			},
			properties: {
				category: report.category,
				id: report.id,
			},
			type: "Feature" as const,
		})),
		type: "FeatureCollection" as const,
	};
}

function setLayerVisibility(
	map: mapboxgl.Map,
	layerId: string,
	isVisible: boolean
) {
	if (!map.getLayer(layerId)) {
		return;
	}
	map.setLayoutProperty(layerId, "visibility", isVisible ? "visible" : "none");
}

function unitGeoJson(units: UnitMapItem[]) {
	return {
		features: units.flatMap((unit) =>
			typeof unit.lastLat === "number" && typeof unit.lastLng === "number"
				? [
						{
							geometry: {
								coordinates: [unit.lastLng, unit.lastLat],
								type: "Point" as const,
							},
							properties: {
								id: unit.id,
								name: unit.personnel.name,
								status: unit.effectiveStatus,
							},
							type: "Feature" as const,
						},
					]
				: []
		),
		type: "FeatureCollection" as const,
	};
}

export default function IncidentMap({
	className,
	incidents,
	onSelectIncident,
	reports = EMPTY_REPORTS,
	units = EMPTY_UNITS,
}: IncidentMapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const incidentsRef = useRef(incidents);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const onSelectRef = useRef(onSelectIncident);
	const reportsRef = useRef(reports);
	const unitsRef = useRef(units);
	const [isReady, setIsReady] = useState(false);
	const [layerMode, setLayerMode] = useState<"heatmap" | "pin">("pin");
	const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
	const [showModeSwitcher, setShowModeSwitcher] = useState(false);

	incidentsRef.current = incidents;
	onSelectRef.current = onSelectIncident;
	reportsRef.current = reports;
	unitsRef.current = units;
	const selectedReport = reports.find(
		(report) => report.id === selectedReportId
	);

	// Calculate counts for legend
	const criticalCount = incidents.filter(
		(i) => i.severity === "CRITICAL"
	).length;
	const highCount = incidents.filter((i) => i.severity === "HIGH").length;
	const mediumCount = incidents.filter((i) => i.severity === "MEDIUM").length;
	const lowCount = incidents.filter((i) => i.severity === "LOW").length;

	useEffect(() => {
		const container = containerRef.current;

		if (!container || mapRef.current) {
			return;
		}

		if (!MAPBOX_TOKEN) {
			console.error(
				"NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing. Add it to .env.local and restart the development server."
			);
			return;
		}

		if (!mapboxgl.supported()) {
			console.error(
				"Mapbox GL is not supported. Check WebGL and browser hardware acceleration."
			);
			return;
		}

		const containerRect = container.getBoundingClientRect();
		if (containerRect.width === 0 || containerRect.height === 0) {
			console.error("Mapbox container has zero size.", {
				height: containerRect.height,
				width: containerRect.width,
			});
		}

		mapboxgl.accessToken = MAPBOX_TOKEN;

		const map = new mapboxgl.Map({
			center: JAKARTA_CENTER,
			container,
			style: MAPBOX_STYLE,
			zoom: 10.5,
		});
		mapRef.current = map;

		map.on("error", (event) => {
			console.error("Mapbox error:", event.error);
		});

		map.addControl(
			new mapboxgl.NavigationControl({ showCompass: false }),
			"top-right"
		);

		const handleLoad = () => {
			const incidentData = incidentGeoJson(incidentsRef.current);

			map.addSource("incidents", {
				cluster: true,
				clusterMaxZoom: 14,
				clusterRadius: 52,
				data: incidentData,
				type: "geojson",
			});
			map.addSource("incident-heat-source", {
				data: incidentData,
				type: "geojson",
			});
			map.addSource("reports", {
				data: reportGeoJson(reportsRef.current),
				type: "geojson",
			});

			map.addLayer({
				id: "incident-heat",
				layout: { visibility: "none" },
				maxzoom: 15,
				paint: {
					"heatmap-color": [
						"interpolate",
						["linear"],
						["heatmap-density"],
						0,
						"rgba(250,204,21,0)",
						0.12,
						"rgba(250,204,21,0.58)",
						0.45,
						"rgba(249,115,22,0.72)",
						0.72,
						"rgba(239,68,68,0.82)",
						1,
						"rgba(185,28,28,0.94)",
					],
					"heatmap-intensity": [
						"interpolate",
						["linear"],
						["zoom"],
						9,
						0.8,
						14,
						1.6,
					],
					"heatmap-opacity": 0.9,
					"heatmap-radius": [
						"interpolate",
						["linear"],
						["zoom"],
						9,
						22,
						14,
						52,
					],
					"heatmap-weight": [
						"interpolate",
						["linear"],
						["get", "heatmapScore"],
						0,
						0.12,
						100,
						1,
					],
				},
				source: "incident-heat-source",
				type: "heatmap",
			});

			// Cluster circles (Pin Mode)
			map.addLayer({
				filter: ["has", "point_count"],
				id: "incident-clusters",
				layout: { visibility: "visible" },
				paint: {
					"circle-color": "#1e293b",
					"circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 2,
				},
				source: "incidents",
				type: "circle",
			});

			// Cluster text (Pin Mode)
			map.addLayer({
				filter: ["has", "point_count"],
				id: "incident-cluster-count",
				layout: {
					"text-field": "{point_count_abbreviated}",
					"text-size": 12,
					visibility: "visible",
				},
				paint: { "text-color": "#ffffff" },
				source: "incidents",
				type: "symbol",
			});

			// Unclustered points (Pin Mode)
			map.addLayer({
				filter: ["!", ["has", "point_count"]],
				id: "incident-points",
				layout: { visibility: "visible" },
				paint: {
					"circle-color": [
						"match",
						["get", "severity"],
						"CRITICAL",
						"#dc2626",
						"HIGH",
						"#f97316",
						"MEDIUM",
						"#eab308",
						"#16a34a",
					],
					"circle-radius": 8,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 2,
				},
				source: "incidents",
				type: "circle",
			});

			map.addLayer({
				id: "report-points",
				paint: {
					"circle-color": "#0f766e",
					"circle-radius": 9,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 2,
				},
				source: "reports",
				type: "circle",
			});

			map.addLayer({
				id: "report-labels",
				layout: {
					"text-field": "L",
					"text-size": 10,
				},
				paint: { "text-color": "#ffffff" },
				source: "reports",
				type: "symbol",
			});

			map.addSource("units", {
				data: unitGeoJson(unitsRef.current),
				type: "geojson",
			});

			map.addLayer({
				id: "patrol-units",
				paint: {
					"circle-color": [
						"match",
						["get", "status"],
						"LIVE",
						"#2563eb",
						"STALE",
						"#64748b",
						"#94a3b8",
					],
					"circle-radius": 6,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 2,
				},
				source: "units",
				type: "circle",
			});
			setIsReady(true);
		};

		map.on("load", handleLoad);
		map.on("click", "incident-points", (event) => {
			if (
				map.queryRenderedFeatures(event.point, { layers: ["report-points"] })
					.length > 0
			) {
				return;
			}
			const id = event.features?.[0]?.properties?.id;
			if (typeof id === "string") {
				onSelectRef.current(id);
			}
		});
		map.on("click", "incident-clusters", (event) => {
			if (
				map.queryRenderedFeatures(event.point, { layers: ["report-points"] })
					.length > 0
			) {
				return;
			}
			const feature = event.features?.[0];
			const clusterId = feature?.properties?.cluster_id;
			if (
				!feature ||
				typeof clusterId !== "number" ||
				feature.geometry.type !== "Point"
			) {
				return;
			}
			const coordinates = feature.geometry.coordinates as [number, number];
			const source = map.getSource("incidents") as mapboxgl.GeoJSONSource;
			source.getClusterExpansionZoom(clusterId, (error, zoom) => {
				if (error || zoom === null || zoom === undefined) {
					return;
				}
				map.easeTo({
					center: coordinates,
					zoom,
				});
			});
		});
		map.on("mouseenter", "incident-points", () => {
			map.getCanvas().style.cursor = "pointer";
		});
		map.on("mouseleave", "incident-points", () => {
			map.getCanvas().style.cursor = "";
		});
		map.on("click", "report-points", (event) => {
			const id = event.features?.[0]?.properties?.id;
			if (typeof id === "string") {
				setSelectedReportId(id);
			}
		});
		map.on("mouseenter", "report-points", () => {
			map.getCanvas().style.cursor = "pointer";
		});
		map.on("mouseleave", "report-points", () => {
			map.getCanvas().style.cursor = "";
		});

		const resizeObserver = new ResizeObserver(() => map.resize());
		resizeObserver.observe(container);

		// Try to get user location
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					if (mapRef.current) {
						mapRef.current.flyTo({
							center: [position.coords.longitude, position.coords.latitude],
							essential: true,
							zoom: 12,
						});
					}
				},
				(error) => {
					console.warn("Geolocation denied or failed:", error);
				},
				{ timeout: 10_000 }
			);
		}

		return () => {
			resizeObserver.disconnect();
			map.remove();
			mapRef.current = null;
		};
	}, []);

	// Sync Layer Visibility based on layerMode state
	useEffect(() => {
		if (!(mapRef.current && isReady)) {
			return;
		}
		const map = mapRef.current;

		const isHeatmap = layerMode === "heatmap";
		setLayerVisibility(map, "incident-heat", isHeatmap);
		setLayerVisibility(map, "incident-clusters", !isHeatmap);
		setLayerVisibility(map, "incident-cluster-count", !isHeatmap);
		setLayerVisibility(map, "incident-points", !isHeatmap);
	}, [layerMode, isReady]);

	useEffect(() => {
		if (!isReady) {
			return;
		}
		const map = mapRef.current;
		(
			map?.getSource("incidents") as mapboxgl.GeoJSONSource | undefined
		)?.setData(incidentGeoJson(incidents));
		(
			map?.getSource("incident-heat-source") as
				| mapboxgl.GeoJSONSource
				| undefined
		)?.setData(incidentGeoJson(incidents));
		(map?.getSource("reports") as mapboxgl.GeoJSONSource | undefined)?.setData(
			reportGeoJson(reports)
		);
		(map?.getSource("units") as mapboxgl.GeoJSONSource | undefined)?.setData(
			unitGeoJson(units)
		);
	}, [incidents, isReady, reports, units]);

	return (
		<div
			aria-label="Peta insiden interaktif"
			className={`relative h-[360px] min-h-[360px] w-full overflow-hidden border border-slate-200 bg-slate-100 ${className ?? ""}`}
			role="region"
		>
			<div className="absolute inset-0 h-full w-full" ref={containerRef} />

			{MAPBOX_TOKEN ? null : (
				<div className="absolute inset-0 z-50 grid place-items-center bg-white/80 px-6 text-center text-sm font-semibold text-slate-800">
					Token Mapbox tidak ditemukan atau tidak valid. Silakan periksa file
					.env Anda.
				</div>
			)}

			{selectedReport ? (
				<aside
					aria-label="Detail laporan"
					className="absolute left-4 top-4 z-20 w-[min(20rem,calc(100%-2rem))] rounded-lg border border-teal-100 bg-white p-4 shadow-xl"
				>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-[11px] font-bold uppercase text-teal-700">
								Laporan Masuk
							</p>
							<h3 className="mt-1 text-sm font-bold text-slate-900">
								{categoryLabels[selectedReport.category] ??
									selectedReport.category}
							</h3>
						</div>
						<button
							aria-label="Tutup detail laporan"
							className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
							onClick={() => setSelectedReportId(null)}
							title="Tutup detail laporan"
							type="button"
						>
							<X aria-hidden="true" className="size-4" />
						</button>
					</div>
					<p className="mt-3 line-clamp-3 text-sm text-slate-600">
						{selectedReport.description}
					</p>
					<div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
						<p>{formatIncidentTime(selectedReport.reportedAt)}</p>
						<p>
							{selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}
						</p>
						{selectedReport.reporterRef ? (
							<p className="break-words">
								Referensi: {selectedReport.reporterRef}
							</p>
						) : null}
					</div>
				</aside>
			) : null}

			{/* Mode Switcher Overlay (Bottom Left) */}
			<div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2">
				{showModeSwitcher ? (
					<div className="flex gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
						<button
							className={`relative w-20 h-20 rounded-xl overflow-hidden shadow-lg border-2 transition-all ${layerMode === "heatmap" ? "border-amber-500 scale-105" : "border-white hover:border-amber-300"}`}
							onClick={() => {
								setLayerMode("heatmap");
								setShowModeSwitcher(false);
							}}
							type="button"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-700 opacity-90" />
							<span className="relative z-10 flex items-center justify-center h-full w-full bg-black/30 text-white text-[10px] font-bold text-center leading-tight">
								Mode:
								<br />
								Heatmaps
							</span>
						</button>
						<button
							className={`relative w-20 h-20 rounded-xl overflow-hidden shadow-lg border-2 transition-all ${layerMode === "pin" ? "border-amber-500 scale-105" : "border-white hover:border-amber-300"}`}
							onClick={() => {
								setLayerMode("pin");
								setShowModeSwitcher(false);
							}}
							type="button"
						>
							<div className="absolute inset-0 bg-slate-200" />
							<div className="absolute inset-0 flex items-center justify-center">
								<span className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-sm" />
								<span className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-sm -ml-1" />
							</div>
							<span className="relative z-10 flex items-center justify-center h-full w-full bg-black/30 text-white text-[10px] font-bold text-center leading-tight">
								Mode:
								<br />
								Pin Map
							</span>
						</button>
					</div>
				) : null}
				<button
					className="w-20 h-20 rounded-xl overflow-hidden shadow-lg border-2 border-white bg-slate-800 text-white flex flex-col items-center justify-center hover:bg-slate-700 transition-colors"
					onClick={() => setShowModeSwitcher((isOpen) => !isOpen)}
					type="button"
				>
					<span className="text-xs font-bold leading-tight">
						Ganti
						<br />
						Mode
					</span>
				</button>
			</div>

			{/* Legend Overlay (Bottom Right) */}
			<div className="absolute bottom-4 right-4 z-10 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-56 animate-in slide-in-from-right-2 fade-in duration-300">
				{layerMode === "heatmap" ? (
					<>
						<h3 className="mb-3 text-sm font-bold text-slate-800">
							Skor Kerawanan
						</h3>
						<div className="h-3 w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-700" />
						<div className="mt-1 flex justify-between text-[10px] font-medium text-slate-600">
							<span>0 (Rendah)</span>
							<span>50</span>
							<span>100 (Tinggi)</span>
						</div>
					</>
				) : (
					<>
						<div className="flex justify-between items-center mb-3">
							<h3 className="font-bold text-slate-800 text-sm">
								Insiden Wilayah
							</h3>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs font-medium text-slate-600">
								<div className="flex items-center gap-2">
									<span className="w-3 h-3 rounded-full bg-red-600 shadow-sm" />
									<span>Risiko Tinggi</span>
								</div>
								<span className="text-slate-800 font-bold">
									{criticalCount + highCount} daerah
								</span>
							</div>
							<div className="flex items-center justify-between text-xs font-medium text-slate-600">
								<div className="flex items-center gap-2">
									<span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
									<span>Risiko Sedang</span>
								</div>
								<span className="text-slate-800 font-bold">
									{mediumCount} daerah
								</span>
							</div>
							<div className="flex items-center justify-between text-xs font-medium text-slate-600">
								<div className="flex items-center gap-2">
									<span className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
									<span>Risiko Rendah</span>
								</div>
								<span className="text-slate-800 font-bold">
									{lowCount} daerah
								</span>
							</div>
						</div>
					</>
				)}
				<div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-600">
					<div className="flex items-center gap-2">
						<span className="grid size-4 place-items-center rounded-full bg-teal-700 text-[9px] font-bold text-white shadow-sm">
							L
						</span>
						<span>Laporan</span>
					</div>
					<span className="font-bold text-slate-800">{reports.length}</span>
				</div>
			</div>
		</div>
	);
}