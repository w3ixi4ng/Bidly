import { apiClient } from './client';
import type { Chat } from '../types';

export async function getUserChats(user_id: string): Promise<Chat[]> {
  const { data } = await apiClient.get<{ chats: Array<{ chat_id: string; user_1_id?: string; user_2_id?: string }> }>(
    `/chats/user/${user_id}`
  );
  return data.chats.map((c) => ({ chat_id: c.chat_id, user_1_id: c.user_1_id, user_2_id: c.user_2_id }));
}

export async function getChatDetail(chat_id: string): Promise<Chat> {
  const { data } = await apiClient.get<{
    chat_id: string;
    user_1_id: string;
    user_2_id: string;
  }>(`/chats/${chat_id}`);
  return {
    chat_id: data.chat_id,
    user_1_id: data.user_1_id,
    user_2_id: data.user_2_id,
  };
}
