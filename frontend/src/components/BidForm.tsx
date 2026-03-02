import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { placeBid } from '../api/bids'
import { useAuthStore } from '../store/authStore'
import type { BidCurrent } from '../types'

interface Props {
  task_id: string
  currentBid: BidCurrent | undefined
}

export default function BidForm({ task_id, currentBid }: Props) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const minBid = currentBid?.bid_amount != null ? currentBid.bid_amount + 0.01 : 0

  const mutation = useMutation({
    mutationFn: () =>
      placeBid({
        task_id,
        bidder_id: user?.user_id,
        bid_amount: parseFloat(amount),
        timestamp: new Date().toISOString(),
      }),
    onSuccess: () => {
      setAmount('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['bids', task_id] })
      queryClient.invalidateQueries({ queryKey: ['currentBid', task_id] })
    },
    onError: () => setError('Failed to place bid. Please try again.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (val < minBid) {
      setError(`Bid must be at least $${minBid.toFixed(2)}.`)
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
          <input
            type="number"
            step="0.01"
            min={minBid}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={minBid > 0 ? `Min ${minBid.toFixed(2)}` : '0.00'}
            className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {mutation.isPending ? 'Placing…' : 'Place Bid'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {mutation.isSuccess && (
        <p className="text-emerald-400 text-xs">Bid placed successfully!</p>
      )}
    </form>
  )
}
