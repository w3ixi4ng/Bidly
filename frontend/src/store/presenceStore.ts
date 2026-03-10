import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Set<string>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Set(),

  setOnline: (userId) =>
    set((state) => ({ onlineUsers: new Set([...state.onlineUsers, userId]) })),

  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  isOnline: (userId) => get().onlineUsers.has(userId),
}));
