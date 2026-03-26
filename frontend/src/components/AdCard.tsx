import React, { useState } from 'react';
import type { Ad } from '../types';

interface AdCardProps {
  ad: Ad;
}

const AdCard: React.FC<AdCardProps> = ({ ad }) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    window.open(ad.link_url, '_blank', 'noopener,noreferrer');
  };

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
      {/* Ad image */}
      <div style={{
        margin: '-22px -22px 14px -22px',
        aspectRatio: '709 / 251',
        overflow: 'hidden',
        borderRadius: '20px 20px 0 0',
      }}>
        <img
          src={ad.image_url}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.3s ease',
            transform: hovered ? 'scale(1.03)' : 'scale(1)',
          }}
        />
      </div>

      {/* Sponsored badge */}
      <div style={{
        position: 'absolute',
        top: 14, right: 14,
        padding: '4px 10px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.85), rgba(139,92,246,0.85))',
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
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Sponsored
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.35,
        marginBottom: 10,
        paddingRight: 80,
        fontFamily: "'Space Grotesk', sans-serif",
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {ad.title}
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
        {ad.description}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 14,
        borderTop: '1px solid var(--border)',
        marginTop: 'auto',
      }}>
        <span style={{
          fontSize: 12,
          color: '#6366f1',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          Learn more
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
};

export default AdCard;
