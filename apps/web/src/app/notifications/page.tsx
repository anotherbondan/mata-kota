"use client";

import { Check, CheckCircle2, Circle, Trash2, Bell, ExternalLink, Siren, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useNotificationStore } from "@/stores/use-notification-store";

function formatTimeAgo(dateString: string) {
	const rtf = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
	const diffMs = new Date().getTime() - new Date(dateString).getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return "Baru saja";
	if (diffMins < 60) return rtf.format(-diffMins, "minute");
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return rtf.format(-diffHours, "hour");
	return rtf.format(-Math.floor(diffHours / 24), "day");
}

export default function NotificationsPage() {
	const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted) {
		return (
			<div className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6 lg:px-8">
				<p className="text-slate-500 font-medium">Memuat notifikasi...</p>
			</div>
		);
	}

	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6 lg:px-8">
			{/* Page Header */}
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 tracking-tight">
						Notifikasi
						{unreadCount > 0 && (
							<span className="flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">
								{unreadCount} Baru
							</span>
						)}
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Pembaruan laporan warga dan peringatan insiden
					</p>
				</div>

				{notifications.length > 0 && (
					<div className="flex items-center gap-2">
						<button
							onClick={markAllAsRead}
							disabled={unreadCount === 0}
							className="flex h-9 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
						>
							<CheckCircle2 className="size-4" />
							<span className="hidden sm:inline">Tandai Dibaca</span>
						</button>
						<button
							onClick={clearAll}
							className="flex h-9 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-sm font-medium text-red-600 shadow-sm transition-all hover:bg-red-50 disabled:opacity-50"
						>
							<Trash2 className="size-4" />
							<span className="hidden sm:inline">Bersihkan</span>
						</button>
					</div>
				)}
			</div>

			{/* Content Area */}
			{notifications.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200/60 bg-white shadow-sm">
					<div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-50">
						<Bell className="size-6 text-slate-400" />
					</div>
					<h3 className="text-lg font-semibold text-slate-800">Belum ada notifikasi</h3>
					<p className="mt-1 max-w-xs text-center text-sm text-slate-500">
						Anda akan menerima pemberitahuan ketika ada pembaruan.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
					<div className="divide-y divide-slate-100">
						{notifications.map((notif) => {
							const isIncident = notif.type === "INCIDENT";
							
							return (
								<div
									key={notif.id}
									className={`flex items-start gap-4 p-5 transition-colors ${
										notif.read ? "bg-white" : "bg-blue-50/30"
									}`}
								>
									{/* Icon */}
									<div className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${
										isIncident ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
									}`}>
										{isIncident ? <Siren className="size-5" /> : <MessageCircle className="size-5" />}
									</div>

									{/* Content */}
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-4">
											<div>
												<h4 className={`text-sm font-semibold ${notif.read ? "text-slate-700" : "text-slate-900"}`}>
													{notif.title}
												</h4>
												<p className={`mt-1 text-sm ${notif.read ? "text-slate-500" : "text-slate-600"}`}>
													{notif.description}
												</p>
											</div>
											<span className="shrink-0 text-xs text-slate-400 whitespace-nowrap">
												{formatTimeAgo(notif.timestamp)}
											</span>
										</div>

										<div className="mt-3 flex items-center gap-4">
											{notif.link && (
												<Link
													href={notif.link as any}
													onClick={() => markAsRead(notif.id)}
													className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
												>
													Lihat Detail
													<ExternalLink className="size-3" />
												</Link>
											)}
											{!notif.read && (
												<button
													onClick={() => markAsRead(notif.id)}
													className="text-xs font-medium text-slate-500 hover:text-slate-900"
												>
													Tandai dibaca
												</button>
											)}
										</div>
									</div>

									{/* Status Dot */}
									{!notif.read && (
										<div className="flex h-5 items-center">
											<span className="size-2 rounded-full bg-primary-500" />
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
