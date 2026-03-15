import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  access_token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({ user, access_token: token, isAuthenticated: true }),
      updateUser: (patch) =>
        set(state => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
      logout: () => {
        set({ user: null, access_token: null, isAuthenticated: false });
        // Clear other stores so next user starts fresh
        import('../store/chatStore').then(m => m.useChatStore.getState().setChats([]));
        import('../store/taskStore').then(m => m.useTaskStore.getState().setTasks([]));
      },
    }),
    {
      name: 'bidly-auth',
    }
  )
);
