"use client";

import { Toaster } from "@mata-kota/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import NotificationListener from "@/components/notification-listener";
import { queryClient } from "@/utils/trpc";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<>
			<QueryClientProvider client={queryClient}>
				{children}
				<NotificationListener />
				<ReactQueryDevtools />
			</QueryClientProvider>
			<Toaster richColors />
		</>
	);
}
