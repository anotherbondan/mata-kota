import { auth } from "@mata-kota/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import CctvContent from "./cctv-content";

export const metadata = {
	title: "CCTV AI | Matakota",
};

export default async function CctvPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user) {
		redirect("/login");
	}

	return <CctvContent />;
}
