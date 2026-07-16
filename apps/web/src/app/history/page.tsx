import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import HistoryContent from "./history-content";

export default async function HistoryPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect("/login");
	}

	return <HistoryContent />;
}
