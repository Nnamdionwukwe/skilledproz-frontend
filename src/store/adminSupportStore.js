// src/store/adminSupportStore.js
import { create } from "zustand";

export const useAdminSupportStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: (amount = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - amount) })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
