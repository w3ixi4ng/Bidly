import React, { useContext, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { StripePreloadContext } from '../App';

const AddTaskButton: React.FC = () => {
  const { setAddTaskModalOpen, setAuthModalOpen } = useUIStore();
  const { user } = useAuthStore();
  const { preload: preloadStripe } = useContext(StripePreloadContext);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (!user) {
      setAuthModalOpen(true);
    } else {
      preloadStripe();
      setAddTaskModalOpen(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: 32,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        // Prevent the wrapper from capturing hover — only the button does
        pointerEvents: 'none',
      }}
    >
      {/* Circle button — always perfectly round, never resizes */}
      <button
        onClick={handleClick}
        onMouseEnter={() => { setHovered(true); preloadStripe(); }}
        onMouseLeave={() => setHovered(false)}
        aria-label="Add new task"
        style={{
          pointerEvents: 'all',
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          // Use box-shadow instead of transform to avoid bounding box changes
          boxShadow: hovered
            ? '0 6px 28px rgba(99,102,241,0.6)'
            : '0 4px 16px rgba(99,102,241,0.4)',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Label — appears to the right, pointer-events none so it can't interfere */}
      <div
        style={{
          pointerEvents: 'none',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: hovered ? '8px 16px' : '8px 0',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          maxWidth: hovered ? 140 : 0,
          opacity: hovered ? 1 : 0,
          transition: 'max-width 0.25s ease, opacity 0.2s ease, padding 0.25s ease',
          boxShadow: 'var(--shadow)',
        }}
      >
        Add New Task
      </div>
    </div>
  );
};

export default AddTaskButton;
