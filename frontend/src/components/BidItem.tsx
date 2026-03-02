import type { Bid } from '../types'

const RANK_LABELS = ['1st', '2nd', '3rd']

export default function BidItem({ bid, rank }: { bid: Bid; rank: number }) {
  const isTop = rank === 0

  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
        isTop
          ? 'border border-amber-500/30'
          : 'border border-zinc-800/60 hover:border-zinc-700/60'
      }`}
      style={isTop ? { background: 'linear-gradient(135deg, rgba(245,158,11,0.09), rgba(251,191,36,0.04))' } : { background: 'rgba(24,24,27,0.5)' }}
    >
      <div className="flex items-center gap-3">
        <span className={`w-8 text-center text-[11px] font-bold tracking-wider ${
          isTop ? 'text-amber-400' : 'text-zinc-600'
        }`}>
          {RANK_LABELS[rank] ?? `#${rank + 1}`}
        </span>
        <span className="text-sm text-zinc-400 font-mono text-[13px]">
          {bid.bidder_id ? `${bid.bidder_id.slice(0, 8)}…` : 'Anonymous'}
        </span>
      </div>
      <div className="text-right">
        <p className={`text-base font-bold tabular ${isTop ? 'text-white' : 'text-zinc-300'}`}>
          ${bid.bid_amount.toFixed(2)}
        </p>
        <p className="text-[11px] text-zinc-600 tabular">
          {new Date(bid.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
