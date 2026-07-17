import { createContext } from "@mata-kota/api/context";
import { createCaller } from "@mata-kota/api/routers/index";
import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import MapPageContent from "./map-content";

export default async function MapPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	const req = new NextRequest("http://localhost", {
		headers: await headers(),
	});
	const ctx = await createContext(req);

	const caller = createCaller(ctx);

	const [initialIncidents, initialReports, initialDevices] = await Promise.all([
		caller.dashboard.incidentMap({ activeOnly: false }),
		caller.dashboard.reportMap(),
		caller.devices.list(),
	]);

	return (
		<MapPageContent
			initialDevices={initialDevices}
			initialIncidents={initialIncidents}
			initialReports={initialReports}
		/>
	);
}
