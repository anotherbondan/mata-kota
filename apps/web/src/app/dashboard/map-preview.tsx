"use client";

import { env } from "@mata-kota/env/web";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const JAKARTA_CENTER: [number, number] = [106.8272, -6.1751];
const INCIDENT_MARKERS = [
	{ color: "#dc2626", coordinates: [106.8272, -6.1751] },
	{ color: "#f97316", coordinates: [106.8456, -6.2088] },
	{ color: "#eab308", coordinates: [106.7994, -6.1667] },
] satisfies Array<{ color: string; coordinates: [number, number] }>;
const STATIC_MAP_PATH = INCIDENT_MARKERS.map(
	({ color, coordinates: [longitude, latitude] }) =>
		`pin-s+${color.slice(1)}(${longitude},${latitude})`
).join(",");
const MAPBOX_TOKEN = env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const STATIC_MAP_URL = MAPBOX_TOKEN
	? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${STATIC_MAP_PATH}/106.8272,-6.1751,10,0/1200x600@2x?access_token=${MAPBOX_TOKEN}`
	: null;

export default function DashboardMapPreview() {
	const [hasError, setHasError] = useState(false);
	const [mapReady, setMapReady] = useState(false);
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);

	useEffect(() => {
		const container = mapContainer.current;
		if (!(container && MAPBOX_TOKEN) || map.current) {
			return;
		}

		let mapInstance: mapboxgl.Map;
		let markers: mapboxgl.Marker[] = [];
		let resizeObserver: ResizeObserver;

		try {
			mapboxgl.accessToken = MAPBOX_TOKEN;
			mapInstance = new mapboxgl.Map({
				center: JAKARTA_CENTER,
				container,
				style: "mapbox://styles/mapbox/light-v11",
				zoom: 10,
			});
			map.current = mapInstance;

			mapInstance.addControl(
				new mapboxgl.NavigationControl({ showCompass: false }),
				"top-right"
			);
			markers = INCIDENT_MARKERS.map(({ color, coordinates }) =>
				new mapboxgl.Marker({ color }).setLngLat(coordinates).addTo(mapInstance)
			);

			const handleLoad = () => {
				mapInstance.resize();
				setMapReady(true);
			};
			mapInstance.on("load", handleLoad);

			resizeObserver = new ResizeObserver(() => mapInstance.resize());
			resizeObserver.observe(container);

			return () => {
				resizeObserver.disconnect();
				mapInstance.off("load", handleLoad);
				for (const marker of markers) {
					marker.remove();
				}
				mapInstance.remove();
				map.current = null;
			};
		} catch {
			setMapReady(false);
		}
	}, []);

	return (
		<div
			aria-label="Peta insiden interaktif"
			className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm"
			role="region"
		>
			{STATIC_MAP_URL && !hasError ? (
				<Image
					alt="Peta insiden Jakarta"
					className="object-cover"
					fill
					onError={() => setHasError(true)}
					sizes="(max-width: 768px) 100vw, 1200px"
					src={STATIC_MAP_URL}
					unoptimized
				/>
			) : (
				<div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-gray-600">
					Peta tidak dapat dimuat. Periksa konfigurasi Mapbox.
				</div>
			)}
			<div
				className={`absolute inset-0 z-10 transition-opacity duration-300 ${
					mapReady ? "opacity-100" : "pointer-events-none opacity-0"
				}`}
				ref={mapContainer}
			/>
			<div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5 ring-inset" />
		</div>
	);
}
