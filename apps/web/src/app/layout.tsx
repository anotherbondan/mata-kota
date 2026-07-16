import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const plusJakartaSans = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-sans",
	weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
	description: "mata-kota",
	title: "mata-kota",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="id">
			<body
				className={`${plusJakartaSans.variable} font-sans antialiased text-slate-800 bg-[#f8fafc] selection:bg-primary-500/20 selection:text-primary-900`}
			>
				<Providers>
					<div className="min-h-svh flex flex-col relative">
						{/* Subtle global background gradient */}
						<div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white -z-10" />

						<Header />
						<main className="flex-1">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
