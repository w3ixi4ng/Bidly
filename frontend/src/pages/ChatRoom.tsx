import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMessages, sendMessage } from '../api/chatLogs'
import { useAuthStore } from '../store/authStore'
import ChatMessage from '../components/ChatMessage'

export default function ChatRoom() {
  const { chat_id } = useParams<{ chat_id: string }>()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages } = useQuery({
    queryKey: ['messages', chat_id],
    queryFn: () => getMessages(chat_id!),
    enabled: !!chat_id,
    refetchInterval: 3000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: () =>
      sendMessage(chat_id!, { sender_id: user!.user_id, message: text.trim() }),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['messages', chat_id] })
    },
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || mutation.isPending) return
    mutation.mutate()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pt-16">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        <Link to="/chats" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ←
        </Link>
        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
          <span className="text-indigo-400 text-xs font-bold">
            {chat_id?.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-white text-sm font-medium">Chat {chat_id?.slice(0, 8)}…</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 max-w-2xl w-full mx-auto">
        {(!messages || messages.length === 0) && (
          <p className="text-center text-zinc-600 text-sm py-8">No messages yet. Say hello!</p>
        )}
        {messages?.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            isMine={msg.sender_id === user?.user_id}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-4 py-3">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || mutation.isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
