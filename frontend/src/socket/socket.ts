import { io, Socket } from 'socket.io-client';
import { useTaskStore } from '../store/taskStore';
import { useChatStore } from '../store/chatStore';
import { usePresenceStore } from '../store/presenceStore';
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
    useTaskStore.getState().setCurrentBid(data.task_id, {
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

      // If this chat isn't in the store yet, fetch and add it
      const chatExists = chatStore.chats.some(c => c.chat_id === data.chat_id);
      if (!chatExists) {
        import('../api/chats').then(({ getChatDetail }) => {
          getChatDetail(data.chat_id).then(chat => {
            chatStore.upsertChat(chat);
          }).catch(() => {});
        });
      }

      chatStore.addMessage(data.chat_id, {
        sender_id: data.sender_id,
        message: data.message,
        timestamp: null,
      });
      if (chatStore.activeChatId !== data.chat_id) {
        chatStore.incrementUnread(data.chat_id);
      }
    }
  );

  socket.on('auction_ended', (data: { task_id: string }) => {
    useTaskStore.getState().markAuctionEnded(data.task_id);
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
