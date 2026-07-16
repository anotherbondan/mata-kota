import { auth } from "@mata-kota/auth";
import db from "@mata-kota/db";
import type { NextRequest } from "next/server";

export async function createContext(req: NextRequest) {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return {
		db,
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
