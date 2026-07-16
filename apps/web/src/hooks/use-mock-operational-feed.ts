"use client";

import { env } from "@mata-kota/env/web";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { trpc } from "@/utils/trpc";

export function useMockOperationalFeed() {
	const queryClient = useQueryClient();
	const movement = useMutation({
		...trpc.devices.simulateMovement.mutationOptions(),
		onSuccess: () => queryClient.invalidateQueries(),
	});
	const report = useMutation({
		...trpc.reports.simulateFeed.mutationOptions(),
		onSuccess: () => queryClient.invalidateQueries(),
	});
	const movementRef = useRef(movement.mutate);
	const reportRef = useRef(report.mutate);
	movementRef.current = movement.mutate;
	reportRef.current = report.mutate;

	useEffect(() => {
		if (env.NEXT_PUBLIC_MOCK_FEEDS_ENABLED !== "true") {
			return;
		}
		movementRef.current();
		reportRef.current();
		const movementTimer = window.setInterval(
			() => movementRef.current(),
			10_000
		);
		const reportTimer = window.setInterval(() => reportRef.current(), 60_000);

		return () => {
			window.clearInterval(movementTimer);
			window.clearInterval(reportTimer);
		};
	}, []);
}
