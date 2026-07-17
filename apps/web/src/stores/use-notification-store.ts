import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NotificationItem {
	id: string;
	type: "INCIDENT" | "REPORT";
	title: string;
	description: string;
	timestamp: string;
	read: boolean;
	link?: string;
}

interface NotificationState {
	notifications: NotificationItem[];
	addNotification: (
		notification: Omit<NotificationItem, "id" | "timestamp" | "read">
	) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	clearAll: () => void;
	unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
	persist(
		(set, get) => ({
			notifications: [],
			addNotification: (notif) =>
				set((state) => ({
					notifications: [
						{
							...notif,
							id: Math.random().toString(36).substring(7),
							timestamp: new Date().toISOString(),
							read: false,
						},
						...state.notifications,
					].slice(0, 100), // Keep last 100
				})),
			markAsRead: (id) =>
				set((state) => ({
					notifications: state.notifications.map((n) =>
						n.id === id ? { ...n, read: true } : n
					),
				})),
			markAllAsRead: () =>
				set((state) => ({
					notifications: state.notifications.map((n) => ({ ...n, read: true })),
				})),
			clearAll: () => set({ notifications: [] }),
			unreadCount: () => get().notifications.filter((n) => !n.read).length,
		}),
		{
			name: "matakota-notifications",
		}
	)
);
