import { io, Socket } from 'socket.io-client';
import { useTaskStore } from '../store/taskStore';
import { useChatStore } from '../store/chatStore';
import { usePresenceStore } from '../store/presenceStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import type { Task } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL as string;

let socket: Socket | null = null;

export function connectSocket(userId: string): void {
  if (socket?.connected) return;

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    socket?.emit('join_user', { user_id: userId });
  });

  socket.on('bid_update', (data: { task_id: string; bid_amount: number; bidder_id: string }) => {
    const taskStore = useTaskStore.getState();
    const currentUser = useAuthStore.getState().user;
    const prevBid = taskStore.currentBids[data.task_id];

    // Check if current user was the previous winning bidder and just got outbid
    if (
      currentUser &&
      prevBid?.bidder_id === currentUser.user_id &&
      data.bidder_id !== currentUser.user_id
    ) {
      const task = taskStore.tasks.find(t => t.task_id === data.task_id);
      const taskTitle = task?.title ?? 'a task';
      const slug = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      useUIStore.getState().addToast({
        message: `You've been outbid on "${taskTitle}" — new bid: $${data.bid_amount.toFixed(2)}`,
        type: 'warning',
        link: `/${slug}`,
      });
    }

    taskStore.setCurrentBid(data.task_id, {
      bid_amount: data.bid_amount,
      bidder_id: data.bidder_id,
    });
  });

  socket.on('task_created', (task: Task) => {
    useTaskStore.getState().upsertTask(task);
  });

  socket.on(
    'new_message',
    (data: {
      chat_id: string;
      sender_id: string;
      recipient_id: string;
      message: string;
      notify_sender: boolean;
    }) => {
      const chatStore = useChatStore.getState();

      const addAndNotify = () => {
        useChatStore.getState().addMessage(data.chat_id, {
          sender_id: data.sender_id,
          message: data.message,
          timestamp: null,
        });
        if (useChatStore.getState().activeChatId !== data.chat_id) {
          useChatStore.getState().incrementUnread(data.chat_id);
        }
      };

      // If this chat isn't in the store yet, fetch it first then add the message
      const chatExists = chatStore.chats.some(c => c.chat_id === data.chat_id);
      if (!chatExists) {
        const tryFetchChat = (attemptsLeft: number) => {
          import('../api/chats').then(({ getChatDetail }) => {
            getChatDetail(data.chat_id)
              .then(chat => {
                useChatStore.getState().upsertChat(chat);
                addAndNotify();
              })
              .catch(() => {
                if (attemptsLeft > 0) {
                  setTimeout(() => tryFetchChat(attemptsLeft - 1), 1500);
                } else {
                  // Chat fetch failed after retries — still deliver the message
                  addAndNotify();
                }
              });
          });
        };
        tryFetchChat(3);
      } else {
        addAndNotify();
      }
    }
  );

  socket.on('task_started', (data: { task_id: string }) => {
    const taskStore = useTaskStore.getState();
    const existing = taskStore.tasks.find(t => t.task_id === data.task_id);
    if (existing) {
      taskStore.upsertTask({ ...existing, auction_status: 'in-progress' });
    } else {
      import('../api/tasks').then(({ getTask }) => {
        getTask(data.task_id)
          .then(task => taskStore.upsertTask({ ...task, auction_status: 'in-progress' }))
          .catch(() => {});
      });
    }
  });

  socket.on('auction_ended', (data: { task_id: string }) => {
    useTaskStore.getState().markAuctionEnded(data.task_id);
  });

  socket.on('task_updated', (task: Task) => {
    useTaskStore.getState().upsertTask(task);
  });

  socket.on('user_online', (data: { user_id: string }) => {
    usePresenceStore.getState().setOnline(data.user_id);
  });

  socket.on('user_offline', (data: { user_id: string }) => {
    usePresenceStore.getState().setOffline(data.user_id);
  });

  socket.on('disconnect', () => {
    // no-op, reconnection handled by socket.io
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[socket] connection error:', err.message);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function joinAuctionRoom(task_id: string): void {
  socket?.emit('join_auction', { task_id });
}

export function getSocket(): Socket | null {
  return socket;
}
