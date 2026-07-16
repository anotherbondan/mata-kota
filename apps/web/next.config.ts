import "@mata-kota/env/web";
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
	typedRoutes: true,
};

export default nextConfig;
