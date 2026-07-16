"use client";
import { Bell, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UserMenu from "./user-menu";

export default function Header() {
	const pathname = usePathname();
	const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);

	const navLinkClass = (isActive: boolean) =>
		`flex h-full items-center border-b-[3px] pt-0.75 transition-all ${
			isActive
				? "border-[#1e293b] text-[#1e293b] font-bold"
				: "border-transparent text-[#94a3b8] hover:text-slate-600"
		}`;

	// Hide the global header completely on the login page
	if (pathname === "/login") {
		return null;
	}

	if (pathname === "/maps") {
		return (
			<div className="fixed top-6 left-6 z-50 flex flex-col items-start">
				<div className="flex items-center gap-4">
					<button
						className="p-3 bg-white rounded-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-gray-100 text-slate-700 hover:text-primary-500 transition-colors flex items-center justify-center"
						onClick={() => setIsMapMenuOpen(!isMapMenuOpen)}
						type="button"
					>
						{isMapMenuOpen ? (
							<X className="h-6 w-6" />
						) : (
							<Menu className="h-6 w-6" />
						)}
					</button>

					{/* Show logo next to hamburger when menu is closed, optional but looks good */}
					{!isMapMenuOpen && (
						<div className="bg-white rounded-full px-4 py-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-gray-100 hidden sm:block">
							<Image
								alt="Matakota Logo"
								className="h-6 w-auto"
								height={40}
								src="/matakota.svg"
								width={150}
							/>
						</div>
					)}
				</div>

				{isMapMenuOpen && (
					<div className="mt-4 w-72 bg-white rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)] border border-gray-100 flex flex-col p-3 gap-1 overflow-hidden">
						<div className="px-4 py-3 mb-2 border-b border-gray-100">
							<Image
								alt="Matakota Logo"
								className="h-7 w-auto"
								height={50}
								src="/matakota.svg"
								width={180}
							/>
						</div>

						<Link
							className="px-4 py-3 hover:bg-slate-50 rounded-xl text-slate-700 font-medium transition-colors"
							href="/dashboard"
							onClick={() => setIsMapMenuOpen(false)}
						>
							Dasbor
						</Link>
						<Link
							className="px-4 py-3 bg-primary-50 text-primary-600 font-bold rounded-xl transition-colors"
							href="/maps"
							onClick={() => setIsMapMenuOpen(false)}
						>
							Peta Insiden
						</Link>
						<Link
							className="px-4 py-3 hover:bg-slate-50 rounded-xl text-slate-700 font-medium transition-colors"
							href="/history"
							onClick={() => setIsMapMenuOpen(false)}
						>
							Riwayat Insiden
						</Link>

						<div className="h-px bg-gray-100 my-2 mx-2" />

						<div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
							<span className="text-slate-700 font-medium">Notifikasi</span>
							<Bell className="h-5 w-5 text-slate-500" />
						</div>
						<div className="px-4 py-3">
							<UserMenu />
						</div>
					</div>
				)}
			</div>
		);
	}

	return (
		<header className="fixed top-0 z-50 w-full bg-white font-sans border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
			<div className="flex h-18 flex-row items-center justify-between px-8 md:px-12">
				<div className="flex items-center">
					<Link href="/">
						<Image
							alt="Matakota Logo"
							className="h-8 w-auto"
							height={75}
							src="/matakota.svg"
							width={285}
						/>
					</Link>
				</div>
				<nav className="hidden h-full items-center gap-12 text-[15px] font-medium md:flex">
					<Link
						className={navLinkClass(pathname === "/dashboard")}
						href="/dashboard"
					>
						Dasbor
					</Link>
					<Link className={navLinkClass(pathname === "/maps")} href="/maps">
						Peta Insiden
					</Link>
					<Link
						className={navLinkClass(
							pathname === "/history" || pathname === "/"
						)}
						href="/history"
					>
						Riwayat Insiden
					</Link>
				</nav>
				<div className="flex items-center gap-6">
					<button
						className="text-slate-600 transition-colors hover:text-slate-900"
						type="button"
					>
						<Bell className="h-6 w-6 stroke-[1.5]" />
					</button>
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
