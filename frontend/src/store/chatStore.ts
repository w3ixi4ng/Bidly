import { create } from 'zustand';
import type { Chat, Message, User } from '../types';

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  userCache: Record<string, User>;
  activeChatId: string | null;
  setChats: (chats: Chat[]) => void;
  upsertChat: (chat: Chat) => void;
  setMessages: (chat_id: string, messages: Message[]) => void;
  addMessage: (chat_id: string, message: Message) => void;
  incrementUnread: (chat_id: string) => void;
  markRead: (chat_id: string) => void;
  setActiveChat: (chat_id: string | null) => void;
  cacheUser: (user: User) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  unreadCounts: {},
  userCache: {},
  activeChatId: null,

  setChats: (chats) => set({ chats: [...chats] }),

  upsertChat: (chat) =>
    set((state) => {
      const exists = state.chats.some((c) => c.chat_id === chat.chat_id);
      if (exists) {
        return {
          chats: state.chats.map((c) =>
            c.chat_id === chat.chat_id ? { ...chat } : c
          ),
        };
      }
      return { chats: [{ ...chat }, ...state.chats] };
    }),

  setMessages: (chat_id, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chat_id]: [...messages],
      },
    })),

  addMessage: (chat_id, message) =>
    set((state) => {
      const existing = state.messages[chat_id] ?? [];
      return {
        messages: {
          ...state.messages,
          [chat_id]: [...existing, { ...message }],
        },
      };
    }),

  incrementUnread: (chat_id) =>
    set((state) => {
      const current = state.unreadCounts[chat_id] ?? 0;
      return {
        unreadCounts: {
          ...state.unreadCounts,
          [chat_id]: current + 1,
        },
      };
    }),

  markRead: (chat_id) => {
    if (chat_id == null) return;
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chat_id]: 0,
      },
    }));
  },

  setActiveChat: (chat_id) => {
    set({ activeChatId: chat_id });
    if (chat_id != null) {
      get().markRead(chat_id);
    }
  },

  cacheUser: (user) =>
    set((state) => ({
      userCache: {
        ...state.userCache,
        [user.user_id]: { ...user },
      },
    })),
}));
