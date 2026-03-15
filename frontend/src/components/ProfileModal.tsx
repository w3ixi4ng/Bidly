import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { getUser, updateUser } from '../api/users';
import { createConnectedAccount } from '../api/payment';
import Skeleton from './Skeleton';

const ProfileModal: React.FC = () => {
  const { user, setAuth, updateUser: patchUser, access_token } = useAuthStore();
  const { setProfileModalOpen } = useUIStore();

  const [name, setName] = useState(user?.name ?? '');
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [connectError, setConnectError] = useState('');
  const [saved, setSaved] = useState(false);

  // Fetch fresh profile on open to ensure stripe_id and name are current
  useEffect(() => {
    if (!user?.user_id) return;
    setLoadingUser(true);
    getUser(user.user_id)
      .then(fresh => {
        setAuth(fresh, access_token ?? '');
        setName(fresh.name ?? '');
      })
      .catch(() => { /* fall back to cached */ })
      .finally(() => setLoadingUser(false));
  }, [user?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setSaveError('Name cannot be empty.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateUser(user.user_id, { name: trimmed });
      // Update both the full store and name field in zustand
      patchUser({ name: updated.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnecting(true);
    setConnectError('');
    try {
      const { url, stripe_connected_account_id } = await createConnectedAccount(user.email);
      await updateUser(user.user_id, { stripe_connected_account_id });
      patchUser({ stripe_connected_account_id });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect Stripe.');
    } finally {
      setConnecting(false);
    }
  };

  const initials = (user.name ?? user.email ?? 'U')
    .split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="modal-overlay" onClick={() => setProfileModalOpen(false)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Your Profile</h2>
          <button className="modal-close" onClick={() => setProfileModalOpen(false)}>×</button>
        </div>

        {loadingUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <Skeleton variant="circle" width={56} height={56} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton variant="text" width="50%" height="16px" />
                <Skeleton variant="text" width="70%" height="13px" />
              </div>
            </div>
            <Skeleton height="42px" />
            <Skeleton height="42px" />
            <Skeleton height="42px" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avatar + basic info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 20, fontWeight: 800, flexShrink: 0,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                  {user.name ?? 'No name set'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Email (readonly) */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                value={user.email}
                disabled
                style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
              />
            </div>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                className="form-input"
                value={name}
                onChange={e => { setName(e.target.value); setSaveError(''); }}
                placeholder="Your name"
                disabled={saving}
              />
              {saveError && <span className="error-msg">{saveError}</span>}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || name.trim() === (user.name ?? '')}
              style={{ width: '100%' }}
            >
              {saving ? <span className="spinner" /> : saved ? '✓ Saved!' : 'Save Changes'}
            </button>

            {/* Stripe section */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Stripe Account</div>
              {user.stripe_connected_account_id ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: 'var(--radius)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 600, color: '#16a34a', fontSize: 14 }}>Connected</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1, fontFamily: 'monospace' }}>
                      {user.stripe_connected_account_id}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Connect a Stripe account to receive payments when you win an auction.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={handleConnectStripe}
                    disabled={connecting}
                    style={{ width: '100%' }}
                  >
                    {connecting ? <span className="spinner" style={{ borderTopColor: 'var(--text-primary)' }} /> : 'Connect Stripe'}
                  </button>
                  {connectError && <span className="error-msg">{connectError}</span>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
