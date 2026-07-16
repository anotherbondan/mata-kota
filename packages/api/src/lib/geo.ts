const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
	return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number }
) {
	const latitudeDelta = toRadians(to.lat - from.lat);
	const longitudeDelta = toRadians(to.lng - from.lng);
	const fromLatitude = toRadians(from.lat);
	const toLatitude = toRadians(to.lat);
	const haversine =
		Math.sin(latitudeDelta / 2) ** 2 +
		Math.cos(fromLatitude) *
			Math.cos(toLatitude) *
			Math.sin(longitudeDelta / 2) ** 2;

	return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}
