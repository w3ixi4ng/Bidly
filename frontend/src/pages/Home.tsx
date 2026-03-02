import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gsap } from 'gsap'
import { getTasks } from '../api/tasks'
import TaskCard from '../components/TaskCard'

export default function Home() {
  const badgeRef   = useRef<HTMLDivElement>(null)
  const headRef    = useRef<HTMLHeadingElement>(null)
  const subRef     = useRef<HTMLParagraphElement>(null)
  const statsRef   = useRef<HTMLDivElement>(null)
  const ctaRef     = useRef<HTMLDivElement>(null)
  const orb1Ref    = useRef<HTMLDivElement>(null)
  const orb2Ref    = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState('')

  const { data: allTasks, isLoading, isError } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })

  // Only show live (in-progress) tasks
  const tasks = (allTasks ?? []).filter((t) => t.auction_status === 'in-progress')

  const filtered = tasks.filter(
    (t) =>
      search === '' ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    const els = [badgeRef.current, headRef.current, subRef.current, statsRef.current, ctaRef.current]
    gsap.set(els, { opacity: 0, y: 30 })
    gsap.set([orb1Ref.current, orb2Ref.current], { opacity: 0, scale: 0.5 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to([orb1Ref.current, orb2Ref.current], { opacity: 1, scale: 1, duration: 1.6, ease: 'power2.out' })
      .to(badgeRef.current,  { opacity: 1, y: 0, duration: 0.55 }, '-=1.1')
      .to(headRef.current,   { opacity: 1, y: 0, duration: 0.7  }, '-=0.35')
      .to(subRef.current,    { opacity: 1, y: 0, duration: 0.6  }, '-=0.45')
      .to(statsRef.current,  { opacity: 1, y: 0, duration: 0.55 }, '-=0.4')
      .to(ctaRef.current,    { opacity: 1, y: 0, duration: 0.5  }, '-=0.35')

    return () => { tl.kill() }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center pt-36 pb-28 px-4 overflow-hidden hero-grid">

        {/* Orbs */}
        <div ref={orb1Ref} className="pointer-events-none absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
        <div ref={orb2Ref} className="pointer-events-none absolute top-[80px] left-1/2 -translate-x-[30%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

        {/* Vignette bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to bottom, transparent, #09090b)' }} />

        <div className="relative z-10 max-w-4xl mx-auto">

          {/* Live badge */}
          <div ref={badgeRef} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 mb-7">
            <span className="relative flex h-2 w-2">
              <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-indigo-300 tracking-wide">{tasks.length} live auctions right now</span>
          </div>

          {/* Headline */}
          <h1 ref={headRef} className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.92] mb-6">
            <span className="text-white">The freelance</span>
            <br />
            <span className="gradient-text">auction platform.</span>
          </h1>

          {/* Subtitle */}
          <p ref={subRef} className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed mb-8">
            Post a task. Watch freelancers compete in real-time.
            <br className="hidden sm:block" />
            Pay only when you've found the right match.
          </p>

          {/* Stats strip */}
          <div ref={statsRef} className="flex items-center justify-center gap-8 mb-10 flex-wrap">
            {[
              { label: 'Tasks posted', value: '2,400+' },
              { label: 'Active bidders', value: '840' },
              { label: 'Paid out', value: '$1.2M' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white tabular">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div ref={ctaRef} className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/signup"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 24px rgba(99,102,241,0.35)' }}
            >
              Start for free →
            </Link>
            <a href="#tasks"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              Browse tasks
            </a>
          </div>
        </div>
      </section>

      {/* ── Marketplace ──────────────────────────────────── */}
      <section id="tasks" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 pt-4">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-white">Live auctions</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isLoading ? '…' : `${filtered.length} task${filtered.length !== 1 ? 's' : ''} open for bids`}
            </p>
          </div>

          {/* Search */}
          <div className="relative sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors border border-zinc-800 bg-zinc-900/60"
            />
          </div>
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 h-52 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-20 text-center">
            <p className="text-zinc-300 font-medium">Could not reach the server</p>
            <p className="text-zinc-500 text-sm mt-1">Make sure the backend is running on port 8000.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-800 py-24 text-center">
            <p className="text-zinc-300 font-medium text-lg">No live tasks yet</p>
            <p className="text-zinc-500 text-sm mt-1 mb-6">Be the first to post one.</p>
            <Link to="/tasks/create"
              className="inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              Post a task
            </Link>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((task) => (
              <TaskCard key={task.task_id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
