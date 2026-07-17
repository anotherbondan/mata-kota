"use client";

import { useQuery } from "@tanstack/react-query";
import { Siren, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { categoryLabels } from "@/lib/incident-display";
import { useNotificationStore } from "@/stores/use-notification-store";
import { trpc } from "@/utils/trpc";

export default function NotificationListener() {
	const addNotification = useNotificationStore((state) => state.addNotification);
	const lastIncidentId = useRef<string | null>(null);
	const lastReportId = useRef<string | null>(null);

	const incidents = useQuery({
		...trpc.incidents.list.queryOptions({ limit: 1 }),
		refetchInterval: 10_000,
	});

	const reports = useQuery({
		...trpc.reports.list.queryOptions({ limit: 1 }),
		refetchInterval: 10_000,
	});

	useEffect(() => {
		if (incidents.data?.items?.length) {
			const latest = incidents.data.items[0];
			if (lastIncidentId.current && lastIncidentId.current !== latest.id) {
				const cat = categoryLabels[latest.category] ?? latest.category;
				toast(`Insiden Baru: ${cat}`, {
					icon: <Siren className="size-5 text-red-500" />,
					description: "Insiden baru telah dikonfirmasi. Segera tugaskan personel.",
				});
				addNotification({
					type: "INCIDENT",
					title: `Insiden Baru: ${cat}`,
					description: "Insiden baru telah dikonfirmasi. Segera tugaskan personel.",
					link: "/history",
				});
			}
			lastIncidentId.current = latest.id;
		}
	}, [incidents.data]);

	useEffect(() => {
		if (reports.data?.items?.length) {
			const latest = reports.data.items[0];
			if (lastReportId.current && lastReportId.current !== latest.id) {
				const cat = categoryLabels[latest.category] ?? latest.category;
				toast(`Laporan Warga: ${cat}`, {
					icon: <MessageCircle className="size-5 text-blue-500" />,
					description: latest.description,
				});
				addNotification({
					type: "REPORT",
					title: `Laporan Warga: ${cat}`,
					description: latest.description,
					link: "/reports",
				});
			}
			lastReportId.current = latest.id;
		}
	}, [reports.data]);

	return null;
}
