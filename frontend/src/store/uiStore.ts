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

interface UIState {
  isDark: boolean;
  toggleDark: () => void;
  profileModalOpen: boolean;
  addTaskModalOpen: boolean;
  chatPanelOpen: boolean;
  setProfileModalOpen: (v: boolean) => void;
  setAddTaskModalOpen: (v: boolean) => void;
  setChatPanelOpen: (v: boolean) => void;
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
  chatPanelOpen: false,

  setProfileModalOpen: (v) => set({ profileModalOpen: v }),
  setAddTaskModalOpen: (v) => set({ addTaskModalOpen: v }),
  setChatPanelOpen: (v) => set({ chatPanelOpen: v }),
}));
