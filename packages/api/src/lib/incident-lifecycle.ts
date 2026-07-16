const allowedNextStatus = new Map<string, Set<string>>([
	["REPORTED", new Set(["VERIFIED"])],
	["VERIFIED", new Set(["ASSIGNED"])],
	["ASSIGNED", new Set(["EN_ROUTE"])],
	["EN_ROUTE", new Set(["ON_SCENE"])],
	["ON_SCENE", new Set(["RESOLVED"])],
	["RESOLVED", new Set()],
]);

export function canTransitionIncident(fromStatus: string, toStatus: string) {
	return allowedNextStatus.get(fromStatus)?.has(toStatus) ?? false;
}
