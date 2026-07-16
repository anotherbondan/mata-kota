import { auth } from "@mata-kota/auth";
import { Bell } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<div className="min-h-screen bg-white">
			<header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-8">
				<Link className="flex items-center gap-2 mr-8" href="/dashboard">
					<img alt="matakota" className="h-8" src="/matakota.svg" />
				</Link>

				<nav className="hidden md:flex flex-1 items-center gap-8 text-sm font-medium text-muted-foreground">
					<Link
						className="text-primary-500 font-bold border-b-2 border-primary-500 pb-[18px] pt-[20px]"
						href="/dashboard"
					>
						Dasbor
					</Link>
					<Link
						className="hover:text-primary-500 transition-colors"
						href="/maps"
					>
						Peta Insiden
					</Link>
					<Link
						className="hover:text-primary-500 transition-colors"
						href="/history"
					>
						Riwayat Insiden
					</Link>
				</nav>

				<div className="flex items-center gap-4 ml-auto">
					<button
						className="text-muted-foreground hover:text-foreground"
						type="button"
					>
						<Bell className="h-5 w-5" />
					</button>
					<div className="flex items-center gap-3">
						<span className="text-sm font-semibold text-secondary-500"></span>
						<div className="h-8 w-8 rounded-full bg-red-400 border-2 border-white shadow-sm" />
					</div>
				</div>
			</header>
			<main className="flex-1 space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
				{children}
			</main>
		</div>
	);
}
