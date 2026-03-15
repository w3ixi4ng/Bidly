import React from 'react';
import { useUIStore } from '../store/uiStore';

const LiquidGlassToggle: React.FC = () => {
  const { isDark, toggleDark } = useUIStore();

  return (
    <button
      onClick={toggleDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 56,
        height: 28,
        borderRadius: 999,
        background: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(0,0,0,0.08)',
        border: isDark ? '1px solid rgba(129,140,248,0.4)' : '1px solid rgba(0,0,0,0.15)',
        boxShadow: isDark
          ? '0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5px',
        justifyContent: 'space-between',
        transition: 'background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        flexShrink: 0,
      }}
    >
      {/* Sun */}
      <span style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#f59e0b', display: 'flex', alignItems: 'center', zIndex: 1 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </span>

      {/* Moon */}
      <span style={{ color: isDark ? '#818cf8' : 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', zIndex: 1 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      {/* Sliding circle */}
      <span style={{
        position: 'absolute',
        top: 3,
        left: isDark ? 'calc(100% - 25px)' : 3,
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: isDark
          ? 'linear-gradient(135deg, #818cf8, #6366f1)'
          : 'linear-gradient(135deg, #ffffff, #e5e7eb)',
        boxShadow: isDark ? '0 1px 4px rgba(99,102,241,0.5)' : '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 2,
      }} />
    </button>
  );
};

export default LiquidGlassToggle;
