import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import PersonnelContent from "./personnel-content";

export default async function PersonnelPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect("/login");
	}

	return <PersonnelContent />;
}
