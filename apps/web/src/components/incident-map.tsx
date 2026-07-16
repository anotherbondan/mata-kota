"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

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

interface IncidentMapProps {
	className?: string;
	incidents: IncidentMapItem[];
	onSelectIncident: (id: string) => void;
	units?: UnitMapItem[];
}

const EMPTY_UNITS: UnitMapItem[] = [];
const JAKARTA_CENTER: [number, number] = [106.8272, -6.1751];
const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

function generatedHeatmapScore(id: string) {
	let hash = 0;
	for (let index = 0; index < id.length; index += 1) {
		hash = (hash * 31 + id.charCodeAt(index)) % 2_147_483_647;
	}
	return hash % 101;
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
	className = "h-[360px]",
	incidents,
	onSelectIncident,
	units = EMPTY_UNITS,
}: IncidentMapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const incidentsRef = useRef(incidents);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const onSelectRef = useRef(onSelectIncident);
	const unitsRef = useRef(units);
	const [isReady, setIsReady] = useState(false);
	const [layerMode, setLayerMode] = useState<"heatmap" | "pin">("pin");
	const [showModeSwitcher, setShowModeSwitcher] = useState(false);

	incidentsRef.current = incidents;
	onSelectRef.current = onSelectIncident;
	unitsRef.current = units;

	const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

	// Calculate counts for legend
	const criticalCount = incidents.filter(
		(i) => i.severity === "CRITICAL"
	).length;
	const highCount = incidents.filter((i) => i.severity === "HIGH").length;
	const mediumCount = incidents.filter((i) => i.severity === "MEDIUM").length;
	const lowCount = incidents.filter((i) => i.severity === "LOW").length;

	useEffect(() => {
		const container = containerRef.current;
		if (!container || mapRef.current || !MAPBOX_TOKEN) {
			return;
		}

		mapboxgl.accessToken = MAPBOX_TOKEN;

		const map = new mapboxgl.Map({
			center: JAKARTA_CENTER,
			container,
			style: MAPBOX_STYLE,
			zoom: 10.5,
		});
		mapRef.current = map;
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
			const id = event.features?.[0]?.properties?.id;
			if (typeof id === "string") {
				onSelectRef.current(id);
			}
		});
		map.on("click", "incident-clusters", (event) => {
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

		const resizeObserver = new ResizeObserver(() => map.resize());
		resizeObserver.observe(container);

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
		if (map.getLayer("incident-heat")) {
			map.setLayoutProperty(
				"incident-heat",
				"visibility",
				isHeatmap ? "visible" : "none"
			);
		}
		if (map.getLayer("incident-clusters")) {
			map.setLayoutProperty(
				"incident-clusters",
				"visibility",
				isHeatmap ? "none" : "visible"
			);
		}
		if (map.getLayer("incident-cluster-count")) {
			map.setLayoutProperty(
				"incident-cluster-count",
				"visibility",
				isHeatmap ? "none" : "visible"
			);
		}
		if (map.getLayer("incident-points")) {
			map.setLayoutProperty(
				"incident-points",
				"visibility",
				isHeatmap ? "none" : "visible"
			);
		}
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
		(map?.getSource("units") as mapboxgl.GeoJSONSource | undefined)?.setData(
			unitGeoJson(units)
		);
	}, [incidents, isReady, units]);

	return (
		<div
			aria-label="Peta insiden interaktif"
			className={`relative overflow-hidden border border-slate-200 bg-slate-100 ${className}`}
			role="region"
		>
			<div className="absolute inset-0" ref={containerRef} />
			
			{!MAPBOX_TOKEN ? (
				<div className="absolute inset-0 z-50 grid place-items-center bg-white/80 px-6 text-center text-sm font-semibold text-slate-800">
					Token Mapbox tidak ditemukan atau tidak valid. Silakan periksa file .env Anda.
				</div>
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
			</div>
		</div>
	);
}
