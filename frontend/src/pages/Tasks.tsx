import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useTaskStore } from '../store/taskStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { getTasks, getTask } from '../api/tasks';
import { getCurrentBid } from '../api/bids';
import { getUser } from '../api/users';
import { getUserChats } from '../api/chats';
import { getChatMessages } from '../api/chatLogs';
import { connectSocket } from '../socket/socket';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import AddTaskButton from '../components/AddTaskButton';
import AddTaskModal from '../components/AddTaskModal';
import ProfileModal from '../components/ProfileModal';
import ChatPanel from '../components/ChatPanel';
import AuthModal from '../components/AuthModal';

const CATEGORIES = ['All', 'Design', 'Development', 'Writing', 'Marketing', 'Other'];

const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
    <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
  </svg>
);

const Tasks: React.FC = () => {
  const { tasks, currentBids, searchQuery, setTasks, setSearchQuery, setCurrentBid } = useTaskStore();
  const { addTaskModalOpen, profileModalOpen, authModalOpen, isDark } = useUIStore();
  const { user, setAuth, access_token } = useAuthStore();
  const { setChats, upsertChat, setMessages } = useChatStore();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'ending-soon' | 'lowest-bid' | 'highest-bid'>('ending-soon');

  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Bootstrap websocket if arriving directly on this page (e.g. page refresh)
  useEffect(() => {
    if (!user?.user_id) return;
    connectSocket(user.user_id);
    getUser(user.user_id)
      .then(fresh => setAuth(fresh, access_token ?? ''))
      .catch(() => {});
    // Always re-fetch chats for the current user (handles multi-tab / user switch)
    getUserChats(user.user_id)
      .then(chatsData => {
        setChats(chatsData);
        chatsData.forEach(c => upsertChat(c));
        return Promise.allSettled(
          chatsData.map(c =>
            getChatMessages(c.chat_id).then(msgs => {
              if (msgs.length > 0) setMessages(c.chat_id, msgs);
            })
          )
        );
      })
      .catch(() => {});
  }, [user?.user_id]); // re-run if user changes

  useEffect(() => {
    let cancelled = false;
    const fetchTasks = async () => {
      setLoading(true);
      setFetchError('');
      try {
        const data = await getTasks();
        if (!cancelled) setTasks(data);
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load tasks.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTasks();
    return () => { cancelled = true; };
  }, [setTasks]);

  // Fetch current bids for all active tasks so the marketplace shows live bid data
  useEffect(() => {
    const active = tasks.filter(
      t => t.auction_status === 'in-progress' && new Date(t.auction_end_time).getTime() > Date.now()
    );
    active.forEach(task => {
      if (currentBids[task.task_id] == null) {
        getCurrentBid(task.task_id)
          .then(bid => {
            if (bid.bid_amount != null && bid.bidder_id != null) {
              setCurrentBid(task.task_id, bid);
            }
          })
          .catch(() => {});
      }
    });
  }, [tasks, currentBids, setCurrentBid]);

  // Poll pending tasks whose start time recently passed to detect transition to in-progress
  useEffect(() => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const pendingPastStart = tasks.filter(
      t => t.auction_status === 'pending' &&
        new Date(t.auction_start_time).getTime() <= now &&
        now - new Date(t.auction_start_time).getTime() < fiveMinutes
    );
    if (pendingPastStart.length === 0) return;

    const poll = setInterval(() => {
      pendingPastStart.forEach(t => {
        getTask(t.task_id)
          .then(fresh => {
            if (fresh.auction_status !== 'pending') {
              useTaskStore.getState().upsertTask(fresh);
            }
          })
          .catch(() => {});
      });
    }, 5000);

    return () => clearInterval(poll);
  }, [tasks]);

  // Entrance animations
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.task-card-item');
        gsap.fromTo(cards,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out' }
        );
      }
    });
    return () => ctx.revert();
  }, [loading, activeCategory, sortBy, searchQuery]);

  const activeTasks = tasks.filter(t =>
    (t.auction_status === 'in-progress' || t.auction_status === 'pending') &&
    new Date(t.auction_end_time).getTime() > Date.now()
  );

  const filteredTasks = activeTasks.filter(task => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'All' || task.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Pending tasks always appear after in-progress tasks
    const aIsPending = a.auction_status === 'pending';
    const bIsPending = b.auction_status === 'pending';
    if (aIsPending !== bIsPending) return aIsPending ? 1 : -1;

    if (sortBy === 'ending-soon') {
      return new Date(a.auction_end_time).getTime() - new Date(b.auction_end_time).getTime();
    }
    if (sortBy === 'lowest-bid') {
      const bidA = currentBids[a.task_id]?.bid_amount ?? a.starting_bid;
      const bidB = currentBids[b.task_id]?.bid_amount ?? b.starting_bid;
      return bidA - bidB;
    }
    if (sortBy === 'highest-bid') {
      const bidA = currentBids[a.task_id]?.bid_amount ?? a.starting_bid;
      const bidB = currentBids[b.task_id]?.bid_amount ?? b.starting_bid;
      return bidB - bidA;
    }
    return new Date(b.auction_start_time).getTime() - new Date(a.auction_start_time).getTime();
  });

  const liveCount = activeTasks.length;
  const withBids = activeTasks.filter(t => currentBids[t.task_id]?.bid_amount != null && currentBids[t.task_id]?.bidder_id != null).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>
      <Navbar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px 100px' }}>

        {/* Page header */}
        <div ref={headerRef} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 999, marginBottom: 10,
                background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)'}`,
                fontSize: 11, fontWeight: 700, letterSpacing: '1px',
                color: '#6366f1', textTransform: 'uppercase' as const,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                  display: 'inline-block',
                  animation: 'liveGlow 2s ease infinite',
                }} />
                Live Marketplace
              </div>
              <h1 style={{
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-1px',
                fontFamily: "'Space Grotesk', sans-serif",
                marginBottom: 6,
              }}>
                Browse Tasks
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                Find tasks to bid on or post your own to get competitive quotes.
              </p>
            </div>

            {/* Stats strip */}
            <div style={{
              display: 'flex', gap: 0,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 14, overflow: 'hidden',
              alignSelf: 'flex-start',
            }}>
              {[
                { label: 'Live Tasks', value: loading ? '—' : String(liveCount) },
                { label: 'Active Bids', value: loading ? '—' : String(withBids) },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  padding: '12px 20px',
                  borderRight: i < arr.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: '#6366f1',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search + Sort bar */}
        <div ref={filtersRef} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search input */}
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 480 }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)', pointerEvents: 'none',
                display: 'flex', alignItems: 'center',
              }}>
                <SearchIcon />
              </span>
              <input
                className="form-input"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or description..."
                style={{
                  paddingLeft: 40,
                  paddingRight: searchQuery ? 36 : 14,
                  fontSize: 14,
                  borderRadius: 14,
                  height: 42,
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    padding: 4, borderRadius: 6,
                  }}
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            {/* Sort select */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: '10px 36px 10px 34px',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  height: 42,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
              >
                <option value="newest">Newest first</option>
                <option value="ending-soon">Ending soon</option>
                <option value="lowest-bid">Lowest bid</option>
                <option value="highest-bid">Highest bid</option>
              </select>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 18px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                background: activeCategory === cat
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${activeCategory === cat ? 'transparent' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: activeCategory === cat ? '0 2px 10px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error */}
        {fetchError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 18px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14,
            color: '#f87171',
            marginBottom: 24,
            fontSize: 14,
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {fetchError}
          </div>
        )}

        {/* Skeleton loading — only when no cached tasks */}
        {loading && tasks.length === 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TaskCard key={`sk-${i}`} />
            ))}
          </div>
        )}

        {/* Task grid */}
        {sortedTasks.length > 0 && (
          <>
            {/* Result count */}
            <div style={{
              fontSize: 13, color: 'var(--text-secondary)',
              marginBottom: 16, fontWeight: 500,
            }}>
              {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''} found
              {searchQuery && <span> for "<strong style={{ color: 'var(--text-primary)' }}>{searchQuery}</strong>"</span>}
            </div>

            <div ref={gridRef} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}>
              {sortedTasks.map(task => (
                <div key={task.task_id} className="task-card-item">
                  <TaskCard task={task} currentBid={currentBids[task.task_id]} isPending={task.auction_status === 'pending'} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && sortedTasks.length === 0 && !fetchError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '80px 20px',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 20 }}>
              <EmptyIcon />
            </div>
            <h3 style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: "'Space Grotesk', sans-serif",
              marginBottom: 8,
            }}>
              {searchQuery ? 'No tasks found' : 'No active tasks yet'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 340 }}>
              {searchQuery
                ? `No tasks match "${searchQuery}". Try a different search term or clear the filter.`
                : 'No active auctions right now. Be the first to post a task and get competitive bids!'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  marginTop: 20,
                  padding: '9px 22px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
                }}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      <AddTaskButton />
      {user && addTaskModalOpen && <AddTaskModal />}
      {user && profileModalOpen && <ProfileModal />}
      {user && <ChatPanel />}
      {authModalOpen && <AuthModal />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800;900&display=swap');

        @keyframes liveGlow {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #22c55e; }
          50% { opacity: 0.4; box-shadow: 0 0 2px #22c55e; }
        }

        select option {
          background: var(--surface);
          color: var(--text-primary);
        }

        @media (max-width: 640px) {
          .task-header-row { flex-direction: column !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default Tasks;
