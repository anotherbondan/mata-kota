"use client";
import { useQuery } from "@tanstack/react-query";

import type { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function Dashboard({
	session,
}: {
	session: typeof authClient.$Infer.Session;
}) {
	const currentUser = useQuery(trpc.me.queryOptions());

	return (
		<p>API: Ready for {currentUser.data?.user.name ?? session.user.name}</p>
	);
}
