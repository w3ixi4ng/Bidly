import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { getCurrentBid, placeBid } from '../api/bids';
import { getUser } from '../api/users';
import { joinAuctionRoom } from '../socket/socket';
import Navbar from '../components/Navbar';
import ProfileModal from '../components/ProfileModal';
import AddTaskModal from '../components/AddTaskModal';
import ChatPanel from '../components/ChatPanel';
import Skeleton from '../components/Skeleton';
import type { Task } from '../types';

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeStyle(status: Task['auction_status']): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  };
  switch (status) {
    case 'in-progress':
      return { ...base, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' };
    case 'completed':
      return { ...base, background: 'rgba(34,197,94,0.15)', color: '#16a34a' };
    case 'cancelled':
      return { ...base, background: 'rgba(239,68,68,0.15)', color: '#dc2626' };
    case 'pending':
      return { ...base, background: 'rgba(234,179,8,0.15)', color: '#ca8a04' };
    default:
      return { ...base, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
  }
}

const TaskDetail: React.FC = () => {
  const { taskSlug } = useParams<{ taskSlug: string }>();
  const navigate = useNavigate();
  const { tasks, currentBids, setCurrentBid, markAuctionEnded } = useTaskStore();
  const { user } = useAuthStore();
  const { profileModalOpen, addTaskModalOpen } = useUIStore();

  const [loadingTask, setLoadingTask] = useState(true);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [bidInput, setBidInput] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [auctionClosed, setAuctionClosed] = useState(false);

  const task = tasks.find((t) => toSlug(t.title) === taskSlug);
  const currentBid = task ? currentBids[task.task_id] : undefined;

  // Determine if auction is closed
  useEffect(() => {
    if (!task) return;
    if (task.auction_status === 'completed' || task.auction_status === 'cancelled') {
      setAuctionClosed(true);
    }
  }, [task]);

  // Join auction room and fetch current bid
  useEffect(() => {
    if (!task) {
      // Try waiting briefly for tasks to load
      const t = setTimeout(() => setLoadingTask(false), 2000);
      return () => clearTimeout(t);
    }
    setLoadingTask(false);

    joinAuctionRoom(task.task_id);

    if (!currentBids[task.task_id]) {
      getCurrentBid(task.task_id)
        .then((bid) => setCurrentBid(task.task_id, bid))
        .catch(() => {/* no bids yet is fine */});
    }
  }, [task?.task_id, currentBids, setCurrentBid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch client name
  useEffect(() => {
    if (!task?.client_id) return;
    setLoadingClient(true);
    getUser(task.client_id)
      .then((u) => setClientName(u.name ?? u.email))
      .catch(() => setClientName(task.client_id))
      .finally(() => setLoadingClient(false));
  }, [task?.client_id]);

  // Listen for auction ended via store change
  useEffect(() => {
    if (task?.auction_status === 'completed') {
      setAuctionClosed(true);
    }
  }, [task?.auction_status]);

  const validateBid = useCallback((): string => {
    const amount = Number(bidInput);
    if (!bidInput || isNaN(amount)) return 'Please enter a valid bid amount.';
    if (amount <= 0) return 'Bid must be greater than zero.';
    const ceiling = currentBid?.bid_amount != null ? currentBid.bid_amount : (task?.starting_bid ?? 0);
    if (amount >= ceiling) {
      return `Bid must be lower than ${currentBid?.bid_amount != null ? `current bid of $${ceiling.toFixed(2)}` : `starting bid of $${ceiling.toFixed(2)}`}.`;
    }
    return '';
  }, [bidInput, currentBid, task]);

  const handlePlaceBid = async () => {
    const errMsg = validateBid();
    if (errMsg) {
      setBidError(errMsg);
      return;
    }
    if (!task || !user) return;

    setBidLoading(true);
    setBidError('');
    try {
      await placeBid({
        task_id: task.task_id,
        bidder_id: user.user_id,
        bid_amount: Number(bidInput),
        timestamp: new Date().toISOString(),
      });
      setCurrentBid(task.task_id, { bid_amount: Number(bidInput), bidder_id: user.user_id });
      setBidInput('');
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Failed to place bid.');
    } finally {
      setBidLoading(false);
    }
  };

  const isWinning =
    currentBid?.bidder_id != null && user != null && currentBid.bidder_id === user.user_id;
  const isOwner = task?.client_id === user?.user_id;

  if (loadingTask || !task) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div className="page-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton height="40px" width="70%" />
              <Skeleton height="16px" />
              <Skeleton height="16px" width="80%" />
              <Skeleton height="16px" width="60%" />
              <Skeleton height="16px" width="40%" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton height="180px" />
            </div>
          </div>
          {!loadingTask && !task && (
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Task not found.</p>
              <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
                Back to Tasks
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div className="page-container">
        {/* Back link */}
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/tasks')}
          style={{ marginBottom: 20, fontSize: 14, padding: '6px 0' }}
        >
          ← Back to Tasks
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr minmax(0, 380px)',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: 'clamp(24px, 3vw, 36px)',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                  flex: 1,
                  minWidth: 200,
                }}
              >
                {task.title}
              </h1>
              <span style={getStatusBadgeStyle(task.auction_status)}>
                {task.auction_status}
              </span>
            </div>

            {/* Description */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                border: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  fontSize: 15,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {task.description}
              </p>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Posted by:
                </span>
                {loadingClient ? (
                  <Skeleton variant="text" width="120px" height="14px" />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {clientName ?? task.client_id}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Starts:
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {formatDate(task.auction_start_time)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Deadline:
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(task.auction_end_time)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 90 }}>
                  Starting bid:
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  ${task.starting_bid.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Right column — Bid Panel */}
          <div>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Current bid display */}
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Current Bid
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                  {currentBid?.bid_amount != null
                    ? `$${currentBid.bid_amount.toFixed(2)}`
                    : 'No bids yet'}
                </div>
                {currentBid?.bid_amount == null && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Starting at ${task.starting_bid.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Winning badge */}
              {isWinning && !auctionClosed && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: 10,
                    color: '#16a34a',
                    fontWeight: 700,
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  You're winning! 🎉
                </div>
              )}

              {/* Auction closed state */}
              {auctionClosed ? (
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 10,
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Auction Closed
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    This auction has ended.
                  </div>
                </div>
              ) : isOwner ? (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  This is your task. You cannot bid on it.
                </div>
              ) : (
                /* Bid input */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Your Bid ($)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      step="0.01"
                      value={bidInput}
                      onChange={(e) => {
                        setBidInput(e.target.value);
                        setBidError('');
                      }}
                      placeholder={
                        currentBid?.bid_amount != null
                          ? `Less than $${currentBid.bid_amount.toFixed(2)}`
                          : `Less than $${task.starting_bid.toFixed(2)}`
                      }
                      disabled={bidLoading}
                      onKeyDown={(e) => e.key === 'Enter' && handlePlaceBid()}
                    />
                    {bidError && <span className="error-msg">{bidError}</span>}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handlePlaceBid}
                    disabled={bidLoading || !bidInput}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {bidLoading ? <span className="spinner" /> : 'Place Bid'}
                  </button>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Lower bid wins. Bids are binding.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {profileModalOpen && <ProfileModal />}
      {addTaskModalOpen && <AddTaskModal />}
      <ChatPanel />
    </div>
  );
};

export default TaskDetail;
