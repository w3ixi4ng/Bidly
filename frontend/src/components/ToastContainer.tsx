import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import type { Toast } from '../store/uiStore';

const typeStyles: Record<Toast['type'], { bg: string; border: string; color: string; icon: string }> = {
  warning: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#ca8a04', icon: '⚠' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#dc2626', icon: '✕' },
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#16a34a', icon: '✓' },
  info: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', color: '#6366f1', icon: 'ℹ' },
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => {
        const s = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.link) navigate(toast.link);
              removeToast(toast.id);
            }}
            style={{
              pointerEvents: 'auto',
              background: s.bg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${s.border}`,
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: toast.link ? 'pointer' : 'default',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              animation: 'toastSlideIn 0.3s ease',
              maxWidth: 380,
              minWidth: 280,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: s.color, flex: 1, lineHeight: 1.4 }}>
              {toast.message}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.color, fontSize: 16, padding: 0, lineHeight: 1,
                opacity: 0.6, flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
