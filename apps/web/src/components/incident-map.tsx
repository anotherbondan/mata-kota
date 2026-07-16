"use client";

import { env } from "@mata-kota/env/web";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

export interface IncidentMapItem {
	category: string;
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
const MAPBOX_TOKEN = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function severityWeight(severity: string) {
	if (severity === "CRITICAL") {
		return 4;
	}
	if (severity === "HIGH") {
		return 3;
	}
	if (severity === "MEDIUM") {
		return 2;
	}
	return 1;
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
				id: incident.id,
				severity: incident.severity,
				status: incident.status,
				weight: severityWeight(incident.severity),
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

	incidentsRef.current = incidents;
	onSelectRef.current = onSelectIncident;
	unitsRef.current = units;

	useEffect(() => {
		const container = containerRef.current;
		if (!(container && MAPBOX_TOKEN) || mapRef.current) {
			return;
		}

		mapboxgl.accessToken = MAPBOX_TOKEN;
		const map = new mapboxgl.Map({
			center: JAKARTA_CENTER,
			container,
			style: "mapbox://styles/mapbox/light-v11",
			zoom: 10.5,
		});
		mapRef.current = map;
		map.addControl(
			new mapboxgl.NavigationControl({ showCompass: false }),
			"top-right"
		);

		const handleLoad = () => {
			map.addSource("incidents", {
				cluster: true,
				clusterMaxZoom: 14,
				clusterRadius: 52,
				data: incidentGeoJson(incidentsRef.current),
				type: "geojson",
			});
			map.addLayer({
				filter: ["!", ["has", "point_count"]],
				id: "incident-heat",
				maxzoom: 13,
				paint: {
					"heatmap-color": [
						"interpolate",
						["linear"],
						["heatmap-density"],
						0,
						"rgba(34,197,94,0)",
						0.35,
						"rgba(250,204,21,0.55)",
						0.7,
						"rgba(249,115,22,0.72)",
						1,
						"rgba(220,38,38,0.86)",
					],
					"heatmap-intensity": 0.9,
					"heatmap-radius": 34,
					"heatmap-weight": ["get", "weight"],
				},
				source: "incidents",
				type: "heatmap",
			});
			map.addLayer({
				filter: ["has", "point_count"],
				id: "incident-clusters",
				paint: {
					"circle-color": "#1e293b",
					"circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 2,
				},
				source: "incidents",
				type: "circle",
			});
			map.addLayer({
				filter: ["has", "point_count"],
				id: "incident-cluster-count",
				layout: {
					"text-field": ["get", "point_count_abbreviated"],
					"text-size": 12,
				},
				paint: { "text-color": "#ffffff" },
				source: "incidents",
				type: "symbol",
			});
			map.addLayer({
				filter: ["!", ["has", "point_count"]],
				id: "incident-points",
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

	useEffect(() => {
		if (!isReady) {
			return;
		}
		const map = mapRef.current;
		(
			map?.getSource("incidents") as mapboxgl.GeoJSONSource | undefined
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
			{MAPBOX_TOKEN ? null : (
				<div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-slate-600">
					Tambahkan token Mapbox untuk menampilkan peta insiden.
				</div>
			)}
			<div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
				<span className="flex items-center gap-1.5">
					<span className="size-2.5 rounded-full bg-red-600" /> Insiden
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-2.5 rounded-full bg-blue-600" /> Unit aktif
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-2.5 rounded-full bg-slate-500" /> Lokasi stale
				</span>
			</div>
		</div>
	);
}
