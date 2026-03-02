import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTask } from '../api/tasks'
import { getCurrentBid, getBidsByTask } from '../api/bids'
import { useAuthStore } from '../store/authStore'
import BidItem from '../components/BidItem'
import BidForm from '../components/BidForm'

interface Segment { label: string; value: string }

function useCountdownSegments(endTime: string): Segment[] {
  const calc = (): Segment[] => {
    const diff = new Date(endTime).getTime() - Date.now()
    if (diff <= 0) return [{ label: 'Ended', value: '--' }]
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return [
      { label: 'Days',  value: String(d).padStart(2, '0') },
      { label: 'Hours', value: String(h).padStart(2, '0') },
      { label: 'Mins',  value: String(m).padStart(2, '0') },
      { label: 'Secs',  value: String(s).padStart(2, '0') },
    ]
  }
  const [segs, setSegs] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setSegs(calc()), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime])
  return segs
}

export default function TaskDetail() {
  const { task_id } = useParams<{ task_id: string }>()
  const user = useAuthStore((s) => s.user)

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', task_id],
    queryFn: () => getTask(task_id!),
    enabled: !!task_id,
  })

  const { data: currentBid } = useQuery({
    queryKey: ['currentBid', task_id],
    queryFn: () => getCurrentBid(task_id!),
    enabled: !!task_id,
    refetchInterval: 5000,
  })

  const { data: bids } = useQuery({
    queryKey: ['bids', task_id],
    queryFn: () => getBidsByTask(task_id!),
    enabled: !!task_id,
    refetchInterval: 5000,
  })

  const segments = useCountdownSegments(task?.auction_end_time ?? '')
  const isOwner = user?.user_id === task?.client_id
  const isActive = task?.auction_status === 'in-progress'
  const sortedBids = [...(bids ?? [])].sort((a, b) => b.bid_amount - a.bid_amount)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center" style={{ background: '#09090b' }}>
        <div>
          <p className="text-zinc-300 font-medium">Task not found</p>
          <Link to="/" className="text-amber-400 text-sm mt-2 inline-block hover:text-amber-300">← Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>

      {/* Subtle hero band */}
      <div className="relative pt-24 pb-10 px-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.09), transparent)' }} />
        <div className="relative max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition-colors">
            ← Back to tasks
          </Link>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {isActive && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-xs font-medium text-emerald-400">Live auction</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{task.title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left — description + bids */}
          <div className="lg:col-span-3 space-y-5">

            {/* Description */}
            <div className="rounded-2xl border border-zinc-800/60 p-6" style={{ background: 'rgba(24,24,27,0.5)' }}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">About this task</h2>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
              <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-zinc-800/60 text-sm">
                <div>
                  <p className="text-zinc-600 text-xs mb-1">Starts</p>
                  <p className="text-zinc-300 text-[13px]">
                    {new Date(task.auction_start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-600 text-xs mb-1">Ends</p>
                  <p className="text-zinc-300 text-[13px]">
                    {new Date(task.auction_end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bid history */}
            <div className="rounded-2xl border border-zinc-800/60 p-6" style={{ background: 'rgba(24,24,27,0.5)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">All bids</h2>
                <span className="text-xs text-zinc-600">{sortedBids.length} total</span>
              </div>
              {sortedBids.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-zinc-500 text-sm">No bids yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">Be the first to place one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedBids.map((bid, i) => (
                    <BidItem key={bid.bid_id} bid={bid} rank={i} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — sidebar */}
          <div className="lg:col-span-2 space-y-4">

            {/* Current highest bid */}
            <div className="rounded-2xl border border-zinc-800/60 p-5 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(251,191,36,0.03))' }}>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Highest bid</p>
              <p className="text-4xl font-black text-white tabular mb-1">
                {currentBid?.bid_amount != null ? `$${currentBid.bid_amount.toFixed(2)}` : '—'}
              </p>
              {currentBid?.bid_amount == null && (
                <p className="text-zinc-600 text-xs">No bids yet</p>
              )}
            </div>

            {/* Countdown */}
            {isActive && (
              <div className="rounded-2xl border border-zinc-800/60 p-5" style={{ background: 'rgba(24,24,27,0.5)' }}>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 text-center">Time remaining</p>
                <div className="grid grid-cols-4 gap-2">
                  {segments.map((seg) => (
                    <div key={seg.label} className="text-center">
                      <div className="rounded-lg py-2 mb-1" style={{ background: 'rgba(245,158,11,0.08)' }}>
                        <span className="text-xl font-bold text-white tabular">{seg.value}</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{seg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Place bid */}
            {!isOwner && isActive && (
              <div className="rounded-2xl border border-zinc-800/60 p-5" style={{ background: 'rgba(24,24,27,0.5)' }}>
                <p className="text-xs font-semibold text-zinc-400 mb-3">Place your bid</p>
                <BidForm task_id={task.task_id} currentBid={currentBid} />
              </div>
            )}

            {isOwner && (
              <div className="rounded-2xl border border-zinc-800/60 p-4 text-center" style={{ background: 'rgba(24,24,27,0.5)' }}>
                <p className="text-xs text-zinc-500">You posted this task</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
