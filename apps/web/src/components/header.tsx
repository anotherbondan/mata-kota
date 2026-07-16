"use client";

import { Bell, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import UserMenu from "./user-menu";

const navigation = [
	{ href: "/dashboard", label: "Dasbor" },
	{ href: "/maps", label: "Peta Insiden" },
	{ href: "/history", label: "Riwayat Insiden" },
] as const;

export default function Header() {
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	if (pathname === "/login") {
		return null;
	}

	return (
		<header className="sticky top-0 z-50 border-gray-200 border-b bg-white">
			<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
				<Link aria-label="Matakota dashboard" href="/dashboard">
					<Image
						alt="Matakota"
						className="h-7 w-auto sm:h-8"
						height={48}
						priority
						src="/matakota.svg"
						width={182}
					/>
				</Link>

				<nav className="ml-8 hidden h-full items-center gap-8 md:flex">
					{navigation.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								className={`flex h-full items-center border-b-2 text-sm transition-colors ${
									isActive
										? "border-primary-500 font-semibold text-primary-500"
										: "border-transparent text-slate-500 hover:text-slate-900"
								}`}
								href={item.href}
								key={item.href}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="ml-auto flex items-center gap-2 sm:gap-4">
					<button
						aria-label="Buka notifikasi"
						className="grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
						title="Notifikasi"
						type="button"
					>
						<Bell className="size-5" />
					</button>
					<div className="hidden sm:block">
						<UserMenu />
					</div>
					<button
						aria-expanded={isMenuOpen}
						aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
						className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
						onClick={() => setIsMenuOpen((open) => !open)}
						type="button"
					>
						{isMenuOpen ? (
							<X className="size-5" />
						) : (
							<Menu className="size-5" />
						)}
					</button>
				</div>
			</div>

			{isMenuOpen ? (
				<nav className="border-gray-200 border-t bg-white px-4 py-3 md:hidden">
					<div className="mx-auto flex max-w-7xl flex-col gap-1">
						{navigation.map((item) => (
							<Link
								className={`px-3 py-3 text-sm font-medium ${
									pathname === item.href
										? "bg-primary-50 text-primary-600"
										: "text-slate-600 hover:bg-slate-50"
								}`}
								href={item.href}
								key={item.href}
								onClick={() => setIsMenuOpen(false)}
							>
								{item.label}
							</Link>
						))}
						<div className="border-gray-200 border-t px-3 pt-3 sm:hidden">
							<UserMenu />
						</div>
					</div>
				</nav>
			) : null}
		</header>
	);
}
