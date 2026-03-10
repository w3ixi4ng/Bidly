import { apiClient } from './client';
import type { Message } from '../types';

export async function getChatMessages(chat_id: string): Promise<Message[]> {
  const { data } = await apiClient.get<{
    messages: Array<{ sender_id: string; message: string; timestamp: string }>;
  }>(`/chat-logs/${chat_id}/messages`);
  return data.messages.map((m) => ({
    sender_id: m.sender_id,
    message: m.message,
    timestamp: m.timestamp,
  }));
}

export interface SendMessagePayload {
  chat_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
}

export async function sendMessage(payload: SendMessagePayload): Promise<void> {
  await apiClient.post('/connect-chat/send', payload);
}
