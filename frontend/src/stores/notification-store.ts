import { create } from "zustand";

import type { Notification } from "@/types";

interface NotificationState {
  unreadCount: number;
  recent: Notification[];
  setUnreadCount: (count: number) => void;
  setRecent: (notifications: Notification[]) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  recent: [],
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setRecent: (recent) => set({ recent }),
  reset: () => set({ unreadCount: 0, recent: [] }),
}));
