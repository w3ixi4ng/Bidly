import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getChatsByUser } from '../api/chats'
import { useAuthStore } from '../store/authStore'

export default function Chats() {
  const user = useAuthStore((s) => s.user)

  const { data: chats, isLoading, isError } = useQuery({
    queryKey: ['chats', user?.user_id],
    queryFn: () => getChatsByUser(user!.user_id),
    enabled: !!user,
  })

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-16 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Your chats</h1>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-zinc-500 text-sm">Could not load chats.</p>
        )}

        {!isLoading && !isError && (!chats || chats.length === 0) && (
          <div className="text-center py-12 text-zinc-500">
            <p>No chats yet.</p>
            <p className="text-sm mt-1">Win a bid or have a freelancer win yours to start chatting.</p>
          </div>
        )}

        {chats && chats.length > 0 && (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link
                key={chat.chat_id}
                to={`/chats/${chat.chat_id}`}
                className="flex items-center justify-between px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-800/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center">
                    <span className="text-indigo-400 text-xs font-bold">
                      {chat.chat_id.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors">
                      Chat {chat.chat_id.slice(0, 8)}…
                    </p>
                  </div>
                </div>
                <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-sm">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
