import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useTaskStore } from '../store/taskStore';
import { useChatStore } from '../store/chatStore';
import { login, signup } from '../api/users';
import { getTasks } from '../api/tasks';
import { getUserChats } from '../api/chats';
import { getChatMessages } from '../api/chatLogs';
import { connectSocket } from '../socket/socket';

type Tab = 'login' | 'signup';

interface FormState {
  name: string;
  email: string;
  password: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const AuthModal: React.FC = () => {
  const { setAuth } = useAuthStore();
  const { setAuthModalOpen, isDark } = useUIStore();
  const { setTasks } = useTaskStore();
  const { setChats, upsertChat, setMessages } = useChatStore();

  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<FormState & { general: string }>>({});
  const [loading, setLoading] = useState(false);

  const updateField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined, general: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<FormState & { general: string }> = {};
    if (tab === 'signup' && !form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!validateEmail(form.email)) errs.email = 'Invalid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 6) errs.password = 'At least 6 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const bootstrapAfterAuth = async (userId: string) => {
    try {
      const [tasks, chatsData] = await Promise.all([getTasks(), getUserChats(userId)]);
      setTasks(tasks);
      setChats(chatsData);
      chatsData.forEach(c => upsertChat(c));
      await Promise.allSettled(
        chatsData.map(c =>
          getChatMessages(c.chat_id).then(msgs => {
            if (msgs.length > 0) setMessages(c.chat_id, msgs);
          })
        )
      );
    } catch { /* non-fatal */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const result = tab === 'login'
        ? await login({ email: form.email, password: form.password })
        : await signup({ name: form.name, email: form.email, password: form.password });

      const user = result.user ?? {
        user_id: result.user_id,
        name: form.name || null,
        email: form.email,
        stripe_connected_account_id: null,
      };
      setAuth(user, result.access_token, result.refresh_token);
      connectSocket(result.user_id);
      await bootstrapAfterAuth(result.user_id);
      setAuthModalOpen(false);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  return (
    <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: '#6366f1',
              marginBottom: 4,
            }}>
              Get Started Free
            </div>
            <h2 className="modal-title" style={{ marginBottom: 0 }}>
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
          </div>
          <button className="modal-close" onClick={() => setAuthModalOpen(false)}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          borderRadius: 14, padding: 4, marginBottom: 20,
        }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setErrors({}); }} style={{
              flex: 1, padding: '9px',
              borderRadius: 11,
              background: tab === t
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'transparent',
              color: tab === t ? 'white' : textMuted,
              fontWeight: 700, fontSize: 13,
              transition: 'all 0.25s ease',
              border: 'none', cursor: 'pointer',
              boxShadow: tab === t ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
            }}>
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label" style={{ color: textMuted, fontSize: 13 }}>Full Name</label>
              <input
                className="form-input"
                type="text"
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Your full name"
                disabled={loading}
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              />
              {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>
          )}
          <div className="form-group">
            <label className="form-label" style={{ color: textMuted, fontSize: 13 }}>Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: textMuted, fontSize: 13 }}>Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => updateField('password', e.target.value)}
              placeholder="Min. 6 characters"
              disabled={loading}
              style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
            />
            {errors.password && <span className="error-msg">{errors.password}</span>}
          </div>

          {errors.general && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 10, color: '#f87171', fontSize: 13,
            }}>
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'opacity 0.2s, transform 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                {tab === 'login' ? 'Log In' : 'Create Account'}
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
