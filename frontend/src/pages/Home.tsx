import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';
import { useChatStore } from '../store/chatStore';
import { useUIStore } from '../store/uiStore';
import { login, signup } from '../api/users';
import { getTasks } from '../api/tasks';
import { getUserChats } from '../api/chats';
import { getChatMessages } from '../api/chatLogs';
import { connectSocket } from '../socket/socket';
import LiquidGlassToggle from '../components/LiquidGlassToggle';

gsap.registerPlugin(ScrollTrigger);

type Tab = 'login' | 'signup';

interface FormState {
  name: string;
  email: string;
  password: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Animated bid ticker data
const LIVE_BIDS = [
  { task: 'Landing Page Design', from: '$340', to: '$280', user: 'alex_dev' },
  { task: 'React Dashboard', from: '$520', to: '$410', user: 'marina_k' },
  { task: 'Logo Redesign', from: '$180', to: '$125', user: 'designpro' },
  { task: 'API Integration', from: '$290', to: '$210', user: 'codewiz' },
  { task: 'SEO Audit', from: '$150', to: '$95', user: 'growth_hq' },
];

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: 'Post a Task',
    desc: 'Describe what you need. Set a starting price and auction window.',
    step: '01',
    accent: '#6366f1',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: 'Bids Come In',
    desc: 'Freelancers compete in real-time. Watch the price fall live.',
    step: '02',
    accent: '#8b5cf6',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    title: 'Winner Awarded',
    desc: 'Auction closes. Lowest bidder wins. Chat opens automatically.',
    step: '03',
    accent: '#a855f7',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
    title: 'Secure Payment',
    desc: 'Funds held via Stripe. Released to the freelancer on completion.',
    step: '04',
    accent: '#c084fc',
  },
];

const STATS = [
  { value: '2.4k+', label: 'Tasks Posted' },
  { value: '89%', label: 'Avg. Savings' },
  { value: '< 2min', label: 'First Bid' },
  { value: '$0', label: 'Platform Fee' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setAuth } = useAuthStore();
  const { setTasks } = useTaskStore();
  const { setChats, upsertChat, setMessages } = useChatStore();
  const { isDark } = useUIStore();

  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<FormState & { general: string }>>({});
  const [loading, setLoading] = useState(false);
  const [activeBidIdx, setActiveBidIdx] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const sublineRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const authCardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const bidTickerRef = useRef<HTMLDivElement>(null);
  const hammerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/tasks', { replace: true });
  }, [isAuthenticated, navigate]);

  // Rotate bid ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBidIdx(prev => (prev + 1) % LIVE_BIDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;

    const ctx = gsap.context(() => {
      // Orb pulse
      if (orbRef.current) {
        gsap.to(orbRef.current, {
          scale: 1.12, opacity: 0.7, duration: 3.5,
          repeat: -1, yoyo: true, ease: 'sine.inOut',
        });
      }

      // Headline reveal
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll('.word');
        gsap.fromTo(words,
          { y: 60, opacity: 0, rotationX: -40 },
          { y: 0, opacity: 1, rotationX: 0, duration: 0.85, stagger: 0.09, ease: 'back.out(1.4)', delay: 0.3 }
        );
      }

      if (sublineRef.current) {
        gsap.fromTo(sublineRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out', delay: 1.0 }
        );
      }

      if (statsRef.current) {
        const items = statsRef.current.querySelectorAll('.stat-item');
        gsap.fromTo(items,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 1.2 }
        );
      }

      if (authCardRef.current) {
        gsap.fromTo(authCardRef.current,
          { y: 40, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.75, ease: 'power3.out', delay: 1.1 }
        );
      }

      if (bidTickerRef.current) {
        gsap.fromTo(bidTickerRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 1.5 }
        );
      }

      // Hammer
      if (hammerRef.current) {
        gsap.set(hammerRef.current, { rotation: 0 });
        const tl = gsap.timeline({ repeat: -1, delay: 2 });
        tl.to(hammerRef.current, { rotation: -28, duration: 0.22, ease: 'power2.in' })
          .to(hammerRef.current, { rotation: 6, duration: 0.1, ease: 'power1.out' })
          .to(hammerRef.current, { rotation: 0, duration: 0.45, ease: 'elastic.out(1, 0.45)' })
          .to(hammerRef.current, { duration: 2.2 });
      }

      // Features
      if (featuresRef.current) {
        const cards = featuresRef.current.querySelectorAll('.feat-card');
        gsap.fromTo(cards,
          { y: 50, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.65, stagger: 0.1, ease: 'power3.out',
            scrollTrigger: { trigger: featuresRef.current, start: 'top 82%', once: true },
          }
        );
      }
    });

    return () => ctx.revert();
  }, [isAuthenticated]);

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
      // Pre-fetch messages so chat list shows latest message preview
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
      setAuth(user, result.access_token);
      connectSocket(result.user_id);
      await bootstrapAfterAuth(result.user_id);
      navigate('/tasks');
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) return null;

  // Theme tokens
  const bg = isDark ? '#060610' : '#fafafa';
  const surface = isDark ? 'rgba(16,16,28,0.92)' : 'rgba(255,255,255,0.95)';
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const navBg = isDark ? 'rgba(6,6,16,0.85)' : 'rgba(250,250,250,0.9)';
  const navBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const inputColor = isDark ? '#f1f5f9' : '#0f172a';
  const featCardBg = isDark ? 'rgba(16,16,28,0.85)' : 'rgba(255,255,255,0.9)';
  const featCardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const statDivider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const activeBid = LIVE_BIDS[activeBidIdx];

  return (
    <div
      ref={heroRef}
      style={{
        minHeight: '100vh',
        background: bg,
        color: textPrimary,
        overflowX: 'hidden',
        transition: 'background 0.4s ease, color 0.4s ease',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Background ambient orb */}
      <div
        ref={orbRef}
        style={{
          position: 'fixed',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.04) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Sticky nav */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: navBg,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${navBorder}`,
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div ref={hammerRef} style={{ transformOrigin: 'bottom right', display: 'inline-flex', fontSize: 22 }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
              {/* Handle */}
              <line x1="8" y1="16" x2="2.5" y2="21.5" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
              {/* Head body */}
              <rect x="9" y="7" width="11" height="6" rx="1.5"
                transform="rotate(-45 14 10)" fill="#6366f1" />
              {/* Head top face highlight */}
              <rect x="9" y="7" width="11" height="2.5" rx="1"
                transform="rotate(-45 14 10)" fill="#a855f7" />
            </svg>
          </div>
          <span style={{
            fontWeight: 900, fontSize: 22,
            fontFamily: "'Space Grotesk', sans-serif",
            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.8px',
          }}>
            Bidly
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)',
            border: `1px solid rgba(34,197,94,0.25)`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
              animation: 'pulse 2s ease infinite',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>Live</span>
          </div>
          <LiquidGlassToggle />
        </div>
      </header>

      {/* Hero section */}
      <section style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
        alignItems: 'center',
        padding: '100px 60px 60px',
        maxWidth: 1240,
        margin: '0 auto',
        gap: 64,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left: headline & copy */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999, marginBottom: 28,
            background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
            fontSize: 13, fontWeight: 600,
            color: '#6366f1',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Reverse Auction Platform
          </div>

          <h1 ref={headlineRef} style={{
            fontSize: 'clamp(42px, 5.5vw, 74px)',
            fontWeight: 900,
            lineHeight: 1.06,
            letterSpacing: '-2.5px',
            marginBottom: 24,
            fontFamily: "'Space Grotesk', sans-serif",
            perspective: 1000,
          }}>
            {['Work', 'gets', 'done.'].map((w, i) => (
              <span key={`w1-${i}`} className="word" style={{ display: 'inline-block', marginRight: '0.18em', color: textPrimary }}>
                {w}
              </span>
            ))}
            <br />
            {['Bids', 'go'].map((w, i) => (
              <span key={`w2-${i}`} className="word" style={{ display: 'inline-block', marginRight: '0.18em', color: textPrimary }}>
                {w}
              </span>
            ))}
            <span className="word" style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #c084fc 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              down.
            </span>
          </h1>

          <p ref={sublineRef} style={{
            fontSize: 18,
            color: textMuted,
            lineHeight: 1.75,
            maxWidth: 440,
            marginBottom: 40,
            transition: 'color 0.4s ease',
          }}>
            Post a task. Freelancers compete in a live reverse auction. The price drops until you get the absolute best deal.
          </p>

          {/* Stats */}
          <div ref={statsRef} style={{
            display: 'flex', gap: 0,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${statDivider}`,
            borderRadius: 16,
            overflow: 'hidden',
            width: 'fit-content',
            transition: 'background 0.4s ease, border-color 0.4s ease',
          }}>
            {STATS.map((s, i) => (
              <div key={s.label} className="stat-item" style={{
                padding: '16px 28px',
                borderRight: i < STATS.length - 1 ? `1px solid ${statDivider}` : 'none',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#6366f1',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '-0.5px',
                }}>{s.value}</div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 3, fontWeight: 500, letterSpacing: '0.3px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Live bid ticker */}
          <div ref={bidTickerRef} style={{
            marginTop: 28,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderRadius: 12,
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${statDivider}`,
            width: 'fit-content',
            maxWidth: '100%',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f97316',
              boxShadow: '0 0 8px #f97316',
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 13, color: textMuted, flexShrink: 0 }}>Live bid:</div>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: textPrimary,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              maxWidth: 220,
              transition: 'opacity 0.4s ease',
            }}>
              <span style={{ color: '#6366f1' }}>@{activeBid.user}</span>
              {' '}bid on{' '}
              <span style={{ color: textPrimary }}>{activeBid.task}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ textDecoration: 'line-through', color: textMuted, fontSize: 12 }}>{activeBid.from}</span>
              <svg width="12" height="12" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 13 }}>{activeBid.to}</span>
            </div>
          </div>
        </div>

        {/* Right: auth card */}
        <div ref={authCardRef}>
          <div style={{
            background: surface,
            backdropFilter: 'blur(28px)',
            border: `1px solid ${surfaceBorder}`,
            borderRadius: 28,
            padding: 36,
            boxShadow: isDark
              ? '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 32px 80px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
          }}>
            {/* Card header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: '#6366f1',
                marginBottom: 6,
              }}>
                Get Started Free
              </div>
              <h2 style={{
                fontSize: 20, fontWeight: 800,
                fontFamily: "'Space Grotesk', sans-serif",
                color: textPrimary,
                letterSpacing: '-0.5px',
              }}>
                {tab === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
            </div>

            {/* Tab switcher */}
            <div style={{
              display: 'flex',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              borderRadius: 14, padding: 4, marginBottom: 24,
              transition: 'background 0.4s ease',
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
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
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
                  style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
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
                  style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
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
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
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

              {/* Trust badges */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 16, marginTop: 8,
              }}>
                {[
                  { icon: '🔒', text: 'Stripe secured' },
                  { icon: '⚡', text: 'Instant setup' },
                  { icon: '✓', text: 'Free forever' },
                ].map(b => (
                  <div key={b.text} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, color: textMuted,
                  }}>
                    <span>{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={featuresRef} style={{
        padding: '96px 60px',
        maxWidth: 1240,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Section label */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px', borderRadius: 999,
            background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)'}`,
            fontSize: 12, fontWeight: 700, letterSpacing: '1px',
            color: '#6366f1', textTransform: 'uppercase',
          }}>
            How it works
          </span>
        </div>

        <h2 style={{
          fontSize: 'clamp(28px, 3.8vw, 48px)',
          fontWeight: 900,
          textAlign: 'center',
          marginBottom: 14,
          letterSpacing: '-1.5px',
          fontFamily: "'Space Grotesk', sans-serif",
          color: textPrimary,
        }}>
          From task to done in{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            four steps
          </span>
        </h2>
        <p style={{
          textAlign: 'center', color: textMuted,
          fontSize: 16, marginBottom: 56,
          lineHeight: 1.7,
        }}>
          The whole process is transparent, fast, and designed to save you money.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feat-card" style={{
              background: featCardBg,
              border: `1px solid ${featCardBorder}`,
              borderRadius: 22,
              padding: '28px 24px',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(12px)',
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = isDark
                  ? `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${f.accent}40`
                  : `0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px ${f.accent}30`;
                el.style.borderColor = `${f.accent}50`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)';
                el.style.borderColor = featCardBorder;
              }}
            >
              {/* Step number watermark */}
              <div style={{
                position: 'absolute', top: 16, right: 20,
                fontSize: 56, fontWeight: 900,
                color: isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.06)',
                lineHeight: 1,
                fontFamily: "'Space Grotesk', sans-serif",
                userSelect: 'none',
              }}>
                {f.step}
              </div>

              {/* Icon */}
              <div style={{
                width: 48, height: 48,
                borderRadius: 14,
                background: `${f.accent}18`,
                border: `1px solid ${f.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.accent,
                marginBottom: 18,
              }}>
                {f.icon}
              </div>

              <h3 style={{
                fontSize: 16, fontWeight: 700,
                marginBottom: 10, color: textPrimary,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section style={{
        padding: '0 60px 96px',
        maxWidth: 1240, margin: '0 auto',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)',
          borderRadius: 28,
          padding: '56px 60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 32,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(99,102,241,0.35)',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: 200,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(22px, 3vw, 36px)',
              fontWeight: 900, color: 'white',
              letterSpacing: '-1px', marginBottom: 10,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              Ready to save on your next project?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
              Post your first task free. No credit card required.
            </p>
          </div>

          <button
            onClick={() => {
              authCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            style={{
              padding: '14px 32px',
              background: 'white',
              color: '#6366f1',
              border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              flexShrink: 0,
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
            }}
          >
            Get Started Free
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      <footer style={{
        textAlign: 'center',
        padding: '32px 20px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
        color: textMuted,
        fontSize: 13,
        transition: 'border-color 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontWeight: 800,
            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Bidly</span>
          <span>·</span>
          <span>Work gets done. Bids go down.</span>
        </div>
        <div>© 2025 Bidly. All rights reserved.</div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800;900&display=swap');

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media (max-width: 900px) {
          section:first-of-type {
            grid-template-columns: 1fr !important;
            padding: 90px 24px 48px !important;
          }
        }

        @media (max-width: 600px) {
          header {
            padding: 0 20px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
