import { create } from 'zustand';
import type { Task, CurrentBid } from '../types';

interface TaskState {
  tasks: Task[];
  currentBids: Record<string, CurrentBid>;
  searchQuery: string;
  setTasks: (tasks: Task[]) => void;
  upsertTask: (task: Task) => void;
  updateTaskBid: (task_id: string, bid_amount: number, bidder_id: string) => void;
  markAuctionEnded: (task_id: string) => void;
  setSearchQuery: (q: string) => void;
  setCurrentBid: (task_id: string, bid: CurrentBid) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  currentBids: {},
  searchQuery: '',

  setTasks: (tasks) => set({ tasks: [...tasks] }),

  upsertTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((t) => t.task_id === task.task_id);
      if (exists) {
        return {
          tasks: state.tasks.map((t) =>
            t.task_id === task.task_id ? { ...task } : t
          ),
        };
      }
      return { tasks: [{ ...task }, ...state.tasks] };
    }),

  updateTaskBid: (task_id, bid_amount, bidder_id) =>
    set((state) => ({
      currentBids: {
        ...state.currentBids,
        [task_id]: { bid_amount, bidder_id },
      },
    })),

  markAuctionEnded: (task_id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.task_id === task_id
          ? { ...t, auction_status: 'completed' as const }
          : t
      ),
    })),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setCurrentBid: (task_id, bid) =>
    set((state) => ({
      currentBids: {
        ...state.currentBids,
        [task_id]: { ...bid },
      },
    })),
}));
