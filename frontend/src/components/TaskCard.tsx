import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task, CurrentBid, TaskCategory } from '../types';
import Skeleton from './Skeleton';

const SUPABASE_STORAGE = 'https://ccxdyvbfjiwkgvlzfguk.supabase.co/storage/v1/object/public/task-photos/default_thumbnails';

const DEFAULT_THUMBNAILS: Record<TaskCategory, string> = {
  Design: `${SUPABASE_STORAGE}/default_thumbnail_design`,
  Development: `${SUPABASE_STORAGE}/default_thumbnail_development`,
  Writing: `${SUPABASE_STORAGE}/default_thumbnail_writing`,
  Marketing: `${SUPABASE_STORAGE}/default_thumbnail_marketing2`,
  Other: `${SUPABASE_STORAGE}/default_thumbnail_other`,
};

interface TaskCardProps {
  task?: Task;
  currentBid?: CurrentBid;
  isPending?: boolean;
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
      <Skeleton variant="rect" width="72px" height="22px" />
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

function formatStartCountdown(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return 'Starting...';
  const totalHours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    return `Starts in ${days}d ${totalHours % 24}h`;
  }
  if (totalHours > 0) return `Starts in ${totalHours}h ${mins}m`;
  if (mins > 0) return `Starts in ${mins}m ${secs}s`;
  return `Starts in ${secs}s`;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, currentBid, isPending = false }) => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!task) return;
    const endRemaining = new Date(task.auction_end_time).getTime() - Date.now();
    const startRemaining = new Date(task.auction_start_time).getTime() - Date.now();
    if (endRemaining <= 0 && startRemaining <= 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [task]);

  if (!task) return <TaskCardSkeleton />;

  const hasBid = currentBid?.bid_amount != null && currentBid?.bidder_id != null;
  const displayBid = hasBid
    ? `$${(currentBid!.bid_amount as number).toFixed(2)}`
    : `$${task.starting_bid.toFixed(2)}`;

  const thumbnailUrl = task.thumbnail || DEFAULT_THUMBNAILS[task.category] || DEFAULT_THUMBNAILS.Other;

  const countdown = formatCountdown(task.auction_end_time);

  const urgencyColor = {
    low: '#22c55e',
    medium: '#f97316',
    high: '#ef4444',
  }[countdown.urgency];

  const handleClick = () => {
    if (!isPending) navigate(`/task/${task.task_id}`);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => !isPending && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: task.is_featured
          ? `2px solid ${hovered ? 'rgba(234,179,8,0.6)' : 'rgba(234,179,8,0.35)'}`
          : `1px solid ${hovered ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
        borderRadius: 20,
        padding: '22px 22px 18px',
        cursor: isPending ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minHeight: 196,
        position: 'relative',
        overflow: 'hidden',
        opacity: isPending ? 0.5 : 1,
        boxShadow: task.is_featured
          ? (hovered ? '0 12px 40px rgba(234,179,8,0.18), 0 2px 8px rgba(0,0,0,0.08)' : '0 2px 12px rgba(234,179,8,0.1), 0 2px 8px rgba(0,0,0,0.05)')
          : (hovered ? '0 12px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.05)'),
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, opacity 0.3s ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        margin: '-22px -22px 14px -22px',
        aspectRatio: '709 / 251',
        overflow: 'hidden',
        borderRadius: '20px 20px 0 0',
      }}>
        <img
          src={thumbnailUrl}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.3s ease',
            transform: hovered ? 'scale(1.03)' : 'scale(1)',
          }}
        />
      </div>

      {/* Accent glow on hover (only when no custom thumbnail) */}
      {hovered && !task.thumbnail && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: task.is_featured
            ? 'linear-gradient(90deg, #eab308, #f59e0b)'
            : 'linear-gradient(90deg, #6366f1, #a855f7)',
          borderRadius: '20px 20px 0 0',
        }} />
      )}

      {/* Featured badge */}
      {task.is_featured && (
        <div style={{
          position: 'absolute',
          top: 14, left: 14,
          padding: '4px 10px',
          background: 'linear-gradient(135deg, rgba(234,179,8,0.9), rgba(245,158,11,0.9))',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '0.8px',
          textTransform: 'uppercase' as const,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          boxShadow: '0 2px 8px rgba(234,179,8,0.3)',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Featured
        </div>
      )}

      {/* Pending badge */}
      {isPending && (
        <div style={{
          position: 'absolute',
          top: 18, right: 18,
          padding: '3px 9px',
          background: 'rgba(161,161,170,0.15)',
          border: '1px solid rgba(161,161,170,0.3)',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase' as const,
        }}>
          Pending
        </div>
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
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
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
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
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
            {isPending ? 'Starts' : 'Ends in'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            justifyContent: 'flex-end',
          }}>
            <svg width="12" height="12" fill="none" stroke={isPending ? 'var(--text-secondary)' : urgencyColor} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: isPending ? 'var(--text-secondary)' : urgencyColor }}>
              {isPending ? formatStartCountdown(task.auction_start_time) : countdown.text}
            </span>
          </div>
          {!isPending && countdown.urgency === 'high' && countdown.text !== 'Ended' && (
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
