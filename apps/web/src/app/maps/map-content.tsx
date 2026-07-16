"use client";

import { env } from "@mata-kota/env/web";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

export default function MapPageContent() {
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const [lng, setLng] = useState(106.8272); // Jakarta Longitude
	const [lat, setLat] = useState(-6.1751); // Jakarta Latitude
	const [zoom, setZoom] = useState(11);

	useEffect(() => {
		if (map.current || !mapContainer.current) return; // initialize map only once
		const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!token) {
			console.error("Mapbox access token is missing");
			return;
		}

		mapboxgl.accessToken = token;
		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: "mapbox://styles/mapbox/light-v11",
			center: [lng, lat],
			zoom: zoom,
		});

		// Add navigation controls (zoom in/out)
		map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

		map.current.on("move", () => {
			if (!map.current) return;
			setLng(Number(map.current.getCenter().lng.toFixed(4)));
			setLat(Number(map.current.getCenter().lat.toFixed(4)));
			setZoom(Number(map.current.getZoom().toFixed(2)));
		});
	}, [lng, lat, zoom]);

	return (
		<div className="min-h-screen">
			<div className="relative w-full h-[calc(100vh-80px)] rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden shadow-sm">
				{/* Map Container */}
				<div ref={mapContainer} className="w-full h-full" />

				{/* Legend */}
				<div className="absolute left-6 bottom-6 bg-white rounded-xl shadow-md border border-gray-200 p-4 w-48 space-y-3 z-10">
					<h4 className="font-bold text-sm text-gray-700">Tingkat Keparahan</h4>
					<div className="space-y-2 text-sm text-gray-600">
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-red-500" /> Critical
						</div>
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-orange-400" /> Medium
						</div>
						<div className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-yellow-400" /> Low
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
