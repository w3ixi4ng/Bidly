import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task, CurrentBid } from '../types';
import Skeleton from './Skeleton';

interface TaskCardProps {
  task?: Task;
  currentBid?: CurrentBid;
}

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatCountdown(endTime: string): { text: string; urgency: 'low' | 'medium' | 'high' } {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { text: 'Ended', urgency: 'high' };
  const totalHours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return { text: `${days}d ${remainingHours}h left`, urgency: 'low' };
  }
  if (totalHours > 2) return { text: `${totalHours}h ${mins}m left`, urgency: 'medium' };
  if (totalHours > 0) return { text: `${totalHours}h ${mins}m left`, urgency: 'high' };
  if (mins > 0) return { text: `${mins}m left`, urgency: 'high' };
  return { text: `${secs}s left`, urgency: 'high' };
}

const TaskCardSkeleton: React.FC = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 196 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <Skeleton variant="text" width="65%" height="20px" />
      <Skeleton variant="rect" width="72px" height="22px" style={{ borderRadius: 999, flexShrink: 0 }} />
    </div>
    <Skeleton variant="text" width="100%" height="14px" />
    <Skeleton variant="text" width="80%" height="14px" />
    <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Skeleton variant="text" width="60px" height="11px" />
        <Skeleton variant="text" width="80px" height="20px" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
        <Skeleton variant="text" width="50px" height="11px" />
        <Skeleton variant="text" width="90px" height="16px" />
      </div>
    </div>
  </div>
);

const TaskCard: React.FC<TaskCardProps> = ({ task, currentBid }) => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!task) return;
    const remaining = new Date(task.auction_end_time).getTime() - Date.now();
    if (remaining <= 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [task]);

  if (!task) return <TaskCardSkeleton />;

  const hasBid = currentBid?.bid_amount != null && currentBid?.bidder_id != null;
  const displayBid = hasBid
    ? `$${(currentBid!.bid_amount as number).toFixed(2)}`
    : `$${task.starting_bid.toFixed(2)}`;

  const countdown = formatCountdown(task.auction_end_time);

  const urgencyColor = {
    low: '#22c55e',
    medium: '#f97316',
    high: '#ef4444',
  }[countdown.urgency];

  const handleClick = () => navigate(`/${toSlug(task.title)}`);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
        borderRadius: 20,
        padding: '22px 22px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minHeight: 196,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: hovered
          ? '0 12px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.08)'
          : '0 2px 8px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
      }}
    >
      {/* Accent glow on hover */}
      {hovered && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          borderRadius: '20px 20px 0 0',
        }} />
      )}

      {/* Live pulse if has active bid */}
      {hasBid && (
        <div style={{
          position: 'absolute',
          top: 18, right: 18,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 9px',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 999,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#6366f1',
            boxShadow: '0 0 6px #6366f1',
            animation: 'cardPulse 2s ease infinite',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.5px' }}>
            BIDDING
          </span>
        </div>
      )}

      {/* Title */}
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.35,
        marginBottom: 10,
        paddingRight: hasBid ? 80 : 0,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {task.title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: 16,
        flex: 1,
      }}>
        {task.description}
      </p>

      {/* Footer row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingTop: 14,
        borderTop: '1px solid var(--border)',
        marginTop: 'auto',
      }}>
        {/* Bid info */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            {hasBid ? 'Current Bid' : 'Starting Bid'}
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: hasBid ? '#6366f1' : 'var(--text-primary)',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '-0.5px',
          }}>
            {displayBid}
          </div>
          {hasBid && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              from ${task.starting_bid.toFixed(2)}
            </div>
          )}
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            Ends in
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            justifyContent: 'flex-end',
          }}>
            <svg width="12" height="12" fill="none" stroke={urgencyColor} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: urgencyColor }}>
              {countdown.text}
            </span>
          </div>
          {countdown.urgency === 'high' && countdown.text !== 'Ended' && (
            <div style={{ fontSize: 10, color: urgencyColor, marginTop: 2, fontWeight: 600 }}>
              Ending soon!
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cardPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default TaskCard;
