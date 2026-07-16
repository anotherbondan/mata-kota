import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const poppins = Poppins({
	subsets: ["latin"],
	variable: "--font-poppins",
	weight: ["400", "500", "600", "700"],
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
		<html lang="id" suppressHydrationWarning>
			<body className={`${poppins.variable} antialiased`}>
				<Providers>
					<div className="min-h-svh bg-slate-50">
						<Header />
						{children}
					</div>
				</Providers>
			</body>
		</html>
	);
}
