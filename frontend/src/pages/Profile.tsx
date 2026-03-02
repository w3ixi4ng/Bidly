import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUser, updateUser } from '../api/users'
import { useAuthStore } from '../store/authStore'

export default function Profile() {
  const { user_id } = useParams<{ user_id: string }>()
  const authUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState('')

  const isOwn = authUser?.user_id === user_id

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', user_id],
    queryFn: () => getUser(user_id!),
    enabled: !!user_id,
  })

  const mutation = useMutation({
    mutationFn: () => updateUser(user_id!, name),
    onSuccess: () => {
      setEditing(false)
      setSaveError('')
      queryClient.invalidateQueries({ queryKey: ['user', user_id] })
    },
    onError: () => setSaveError('Failed to update profile.'),
  })

  const startEdit = () => {
    setName(user?.name ?? '')
    setEditing(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-24 flex items-center justify-center">
        <div className="text-zinc-500">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-24 flex items-center justify-center text-zinc-500">
        User not found.
      </div>
    )
  }

  const initials = (user.name ?? user.email)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-indigo-400">{initials}</span>
          </div>

          {editing ? (
            <div className="space-y-3 mt-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-center"
                placeholder="Your name"
              />
              {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {mutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-400 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white">{user.name ?? 'Unnamed User'}</h1>
              <p className="text-zinc-400 text-sm mt-1">{user.email}</p>
              {isOwn && (
                <button
                  onClick={startEdit}
                  className="mt-4 px-4 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
                >
                  Edit name
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
