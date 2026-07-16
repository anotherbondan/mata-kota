import assert from "node:assert/strict";
import test from "node:test";

import { canTransitionIncident } from "./incident-lifecycle.ts";

test("allows every sequential incident transition", () => {
	const sequence = [
		"REPORTED",
		"VERIFIED",
		"ASSIGNED",
		"EN_ROUTE",
		"ON_SCENE",
		"RESOLVED",
	];

	for (let index = 0; index < sequence.length - 1; index += 1) {
		assert.equal(
			canTransitionIncident(sequence[index] ?? "", sequence[index + 1] ?? ""),
			true
		);
	}
});

test("rejects skipped and reversed transitions", () => {
	assert.equal(canTransitionIncident("REPORTED", "ASSIGNED"), false);
	assert.equal(canTransitionIncident("ON_SCENE", "EN_ROUTE"), false);
	assert.equal(canTransitionIncident("RESOLVED", "REPORTED"), false);
});
