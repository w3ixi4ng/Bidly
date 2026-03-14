import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { disconnectSocket } from '../socket/socket';
import LiquidGlassToggle from './LiquidGlassToggle';

const HammerIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 100 100">
    {/* Handle — long rounded rod from bottom-left to mid-right */}
    <rect x="-4" y="-4" width="62" height="11" rx="5.5"
      transform="rotate(-38 0 0) translate(8 44)" fill="#6366f1" />
    {/* Mallet head body */}
    <rect x="52" y="10" width="34" height="44" rx="5" fill="#6366f1"
      transform="rotate(-38 69 32)" />
    {/* Top band (highlight) */}
    <rect x="52" y="10" width="34" height="9" rx="4"
      transform="rotate(-38 69 32)" fill="#a855f7" />
    {/* Bottom band */}
    <rect x="52" y="45" width="34" height="9" rx="4"
      transform="rotate(-38 69 32)" fill="#a855f7" />
    {/* Sound block base */}
    <rect x="56" y="86" width="30" height="8" rx="4" fill="#6366f1" />
    <rect x="52" y="91" width="38" height="7" rx="3.5" fill="#6366f1" />
  </svg>
);

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { setProfileModalOpen, setAuthModalOpen, isDark } = useUIStore();
  const [logoutHover, setLogoutHover] = useState(false);
  const [loginHover, setLoginHover] = useState(false);

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate('/');
  };

  const displayName = user?.name ?? user?.email ?? 'Profile';
  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: isDark ? 'rgba(9,9,11,0.92)' : 'rgba(250,250,250,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
      padding: '0 28px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/tasks')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0,
        }}
      >
        <HammerIcon />
        <span style={{
          fontWeight: 900,
          fontSize: 20,
          fontFamily: "'Space Grotesk', sans-serif",
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
        }}>
          Bidly
        </span>
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LiquidGlassToggle />

        {isAuthenticated ? (
          <>
            {/* Profile button */}
            <button
              onClick={() => setProfileModalOpen(true)}
              title={displayName}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px 5px 6px',
                borderRadius: 12,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: 'white',
                flexShrink: 0,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {initials}
              </div>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-primary)',
                maxWidth: 120,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {displayName}
              </span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              onMouseEnter={() => setLogoutHover(true)}
              onMouseLeave={() => setLogoutHover(false)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: logoutHover ? 'rgba(239,68,68,0.1)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${logoutHover ? 'rgba(239,68,68,0.25)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                color: logoutHover ? '#f87171' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Logout"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </>
        ) : (
          <>
            {/* Log In button */}
            <button
              onClick={() => setAuthModalOpen(true)}
              onMouseEnter={() => setLoginHover(true)}
              onMouseLeave={() => setLoginHover(false)}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                background: loginHover
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${loginHover ? 'transparent' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                color: loginHover ? 'white' : 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: loginHover ? '0 2px 10px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              Log In
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
