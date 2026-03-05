import client from './client'
import type { Message, MessageCreate } from '../types'

export const getMessages = (chat_id: string) =>
  client.get<{ messages: Message[] }>(`/chat-logs/${chat_id}/messages`).then((r) => r.data.messages)

export const sendMessage = (chat_id: string, data: MessageCreate) =>
  client.post<Message>(`/chat-logs/${chat_id}/messages`, data).then((r) => r.data)
