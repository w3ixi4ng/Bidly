import { create } from 'zustand';

function getInitialDark(): boolean {
  const saved = localStorage.getItem('bidly-theme');
  if (saved !== null) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDark(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('bidly-theme', isDark ? 'dark' : 'light');
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  link?: string;
}

interface UIState {
  isDark: boolean;
  toggleDark: () => void;
  profileModalOpen: boolean;
  addTaskModalOpen: boolean;
  authModalOpen: boolean;
  chatPanelOpen: boolean;
  setProfileModalOpen: (v: boolean) => void;
  setAddTaskModalOpen: (v: boolean) => void;
  setAuthModalOpen: (v: boolean) => void;
  setChatPanelOpen: (v: boolean) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const initialDark = getInitialDark();
applyDark(initialDark);

export const useUIStore = create<UIState>((set) => ({
  isDark: initialDark,

  toggleDark: () =>
    set((state) => {
      const next = !state.isDark;
      applyDark(next);
      return { isDark: next };
    }),

  profileModalOpen: false,
  addTaskModalOpen: false,
  authModalOpen: false,
  chatPanelOpen: false,

  setProfileModalOpen: (v) => set({ profileModalOpen: v }),
  setAddTaskModalOpen: (v) => set({ addTaskModalOpen: v }),
  setAuthModalOpen: (v) => set({ authModalOpen: v }),
  setChatPanelOpen: (v) => set({ chatPanelOpen: v }),

  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));
