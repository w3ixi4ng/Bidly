import client from './client'
import type { Chat, ChatCreate } from '../types'

export const createChat = (data: ChatCreate) =>
  client.post<Chat>('/chats', data).then((r) => r.data)

export const getChatsByUser = (user_id: string) =>
  client.get<{ chats: Chat[] }>(`/chats/user/${user_id}`).then((r) => r.data.chats)
