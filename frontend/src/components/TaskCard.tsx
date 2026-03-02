import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Task } from '../types'

function useTimeLeft(endTime: string) {
  const calc = () => {
    const diff = new Date(endTime).getTime() - Date.now()
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    if (h > 0)   return `${h}h ${m}m`
    return `${m}m`
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime])
  return t
}

export default function TaskCard({ task }: { task: Task }) {
  const timeLeft = useTimeLeft(task.auction_end_time)
  const urgent   = timeLeft && !timeLeft.includes('d')

  return (
    <Link
      to={`/tasks/${task.task_id}`}
      className="card-glow group flex flex-col rounded-2xl border border-zinc-800/70 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24, transparent)' }} />

      <div className="flex flex-col flex-1 p-5">

        {/* Live dot + time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
          {timeLeft ? (
            <span className={`text-xs font-semibold tabular px-2 py-0.5 rounded-full ${
              urgent
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-zinc-400'
            }`}>
              {timeLeft} left
            </span>
          ) : (
            <span className="text-xs text-zinc-600">Ended</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-zinc-100 leading-snug group-hover:text-white transition-colors line-clamp-2 mb-2">
          {task.title}
        </h3>

        {/* Description */}
        <p className="text-zinc-500 text-[13px] leading-relaxed line-clamp-3 flex-1 mb-5">
          {task.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
          <span className="text-xs text-zinc-600">
            {new Date(task.auction_end_time).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            })}
          </span>
          <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
            View &amp; bid →
          </span>
        </div>
      </div>
    </Link>
  )
}
