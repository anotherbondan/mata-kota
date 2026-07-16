import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ReportsContent from "./reports-content";

export default async function ReportsPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect("/login");
	}

	return <ReportsContent />;
}
