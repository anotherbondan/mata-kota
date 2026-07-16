import "@mata-kota/env/web";
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				hostname: "api.mapbox.com",
				pathname: "/styles/v1/**",
				protocol: "https",
			},
		],
	},
	reactCompiler: true,
	turbopack: {
		root: path.resolve(import.meta.dirname, "../.."),
	},
	typedRoutes: true,
};

export default nextConfig;
