import assert from "node:assert/strict";
import test from "node:test";

import { haversineDistanceKm } from "./geo.ts";

test("returns zero for the same coordinate", () => {
	assert.equal(
		haversineDistanceKm(
			{ lat: -6.1751, lng: 106.8272 },
			{ lat: -6.1751, lng: 106.8272 }
		),
		0
	);
});

test("ranks a nearby Jakarta unit within the expected distance", () => {
	const distance = haversineDistanceKm(
		{ lat: -6.1751, lng: 106.8272 },
		{ lat: -6.1818, lng: 106.8223 }
	);

	assert.ok(distance > 0.8 && distance < 1.1);
});

test("computes a demo-sized active unit pool within one second", () => {
	const startedAt = performance.now();
	for (let index = 0; index < 10_000; index += 1) {
		haversineDistanceKm(
			{ lat: -6.1751, lng: 106.8272 },
			{ lat: -6.1818 + index / 10_000_000, lng: 106.8223 }
		);
	}

	assert.ok(performance.now() - startedAt < 1000);
});
