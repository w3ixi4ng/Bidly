import React, { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { capturePayment } from '../api/payment';
import Skeleton from './Skeleton';
import type { TaskCategory } from '../types';

type Step = 'form' | 'payment' | 'confirming' | 'done';

const TASK_CATEGORIES: TaskCategory[] = ['Design', 'Development', 'Writing', 'Marketing', 'Other'];

interface FormData {
  title: string;
  description: string;
  category: TaskCategory;
  startNow: boolean;
  auction_start_time: string;
  auction_end_time: string;
  starting_bid: string;
}

function formatForInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const AddTaskModal: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuthStore();
  const { isDark } = useUIStore();
  const { setAddTaskModalOpen } = useUIStore();

  const [step, setStep] = useState<Step>('form');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState('');
  const [submittingNext, setSubmittingNext] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 3600000);

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: 'Other',
    startNow: true,
    auction_start_time: formatForInput(now),
    auction_end_time: formatForInput(oneHourLater),
    starting_bid: '',
  });

  // Cleanup timeout ref
  useEffect(() => {
    if (step === 'done') {
      const t = setTimeout(() => setAddTaskModalOpen(false), 1500);
      return () => clearTimeout(t);
    }
  }, [step, setAddTaskModalOpen]);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    if (!form.title.trim()) errors.title = 'Title is required.';
    if (!form.description.trim()) errors.description = 'Description is required.';
    if (!form.starting_bid || Number(form.starting_bid) < 1)
      errors.starting_bid = 'Starting bid must be at least $1.';
    if (!form.startNow && !form.auction_start_time)
      errors.auction_start_time = 'Start time is required.';
    if (!form.startNow && form.auction_start_time && new Date(form.auction_start_time) < new Date())
      errors.auction_start_time = 'Start time cannot be in the past.';
    if (!form.auction_end_time) errors.auction_end_time = 'End time is required.';
    const start = form.startNow ? new Date() : new Date(form.auction_start_time);
    const end = new Date(form.auction_end_time);
    if (end <= start) errors.auction_end_time = 'End time must be after start time.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) return;
    setError('');
    setSubmittingNext(true);
    try {
      const startTime = form.startNow
        ? new Date().toISOString()
        : new Date(form.auction_start_time).toISOString();
      const endTime = new Date(form.auction_end_time).toISOString();
      const result = await capturePayment({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        client_id: user!.user_id,
        starting_bid: Number(form.starting_bid),
        auction_start_time: startTime,
        auction_end_time: endTime,
      });
      setClientSecret(result.client_secret);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment.');
    } finally {
      setSubmittingNext(false);
    }
  };

  const handlePayAndCreate = async () => {
    if (!stripe || !elements) {
      setError('Stripe is not loaded. Please try again.');
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found.');
      return;
    }

    setError('');
    setSubmittingPay(true);

    try {
      // Confirm payment BEFORE changing step, so CardElement stays mounted
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElement } }
      );

      if (stripeErr) {
        setError(stripeErr.message ?? 'Payment failed.');
        return;
      }

      setStep('confirming');

      if (paymentIntent?.status !== 'succeeded') {
        setError('Payment was not successful. Please try again.');
        setStep('payment');
        return;
      }

      // Task creation is handled by the Stripe webhook (payment_intent.succeeded)
      // which calls the create-task orchestrator and triggers a WebSocket notification
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
      setStep('payment');
    } finally {
      setSubmittingPay(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '14px',
        color: isDark ? '#fafafa' : '#09090b',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        '::placeholder': { color: isDark ? '#a1a1aa' : '#71717a' },
        iconColor: isDark ? '#a1a1aa' : '#71717a',
      },
      invalid: { color: '#ef4444' },
    },
  };

  const isProcessing = step === 'confirming';

  return (
    <div className="modal-overlay" onClick={() => !isProcessing && setAddTaskModalOpen(false)}>
      <div
        className="modal-box"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'form' && 'Create New Task'}
            {step === 'payment' && 'Payment'}
            {step === 'confirming' && 'Processing...'}
            {step === 'done' && 'Task Created!'}
          </h2>
          {!isProcessing && step !== 'done' && (
            <button className="modal-close" onClick={() => setAddTaskModalOpen(false)}>
              ×
            </button>
          )}
        </div>

        {/* Step 1: Form */}
        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Build a landing page"
              />
              {formErrors.title && <span className="error-msg">{formErrors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-input"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the task in detail..."
                rows={4}
              />
              {formErrors.description && (
                <span className="error-msg">{formErrors.description}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Requirements</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={reqInput}
                  onChange={(e) => setReqInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = reqInput.trim();
                      if (trimmed && !requirements.includes(trimmed)) {
                        setRequirements((prev) => [...prev, trimmed]);
                        setReqInput('');
                      }
                    }
                  }}
                  placeholder="e.g. Must be responsive"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const trimmed = reqInput.trim();
                    if (trimmed && !requirements.includes(trimmed)) {
                      setRequirements((prev) => [...prev, trimmed]);
                      setReqInput('');
                    }
                  }}
                  style={{ padding: '8px 14px', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                >
                  +
                </button>
              </div>
              {requirements.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {requirements.map((req, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--text-secondary)',
                        marginTop: 4,
                      }} />
                      <span style={{ flex: 1, color: 'var(--text-primary)' }}>{req}</span>
                      <button
                        type="button"
                        onClick={() => setRequirements((prev) => prev.filter((_, j) => j !== i))}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-secondary)', padding: 2, fontSize: 14, lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <div style={{ position: 'relative' }}>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value as TaskCategory)}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: 'pointer',
                    paddingRight: 36,
                  }}
                >
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <svg
                  width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', pointerEvents: 'none',
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Starting Amount ($) *</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={form.starting_bid}
                onChange={(e) => updateField('starting_bid', e.target.value)}
                placeholder="100"
              />
              {formErrors.starting_bid && (
                <span className="error-msg">{formErrors.starting_bid}</span>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Auction Start</label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.startNow}
                    onChange={(e) => updateField('startNow', e.target.checked)}
                  />
                  Start Now
                </label>
              </div>
              <input
                className="form-input"
                type="datetime-local"
                value={form.auction_start_time}
                disabled={form.startNow}
                onChange={(e) => updateField('auction_start_time', e.target.value)}
              />
              {formErrors.auction_start_time && (
                <span className="error-msg">{formErrors.auction_start_time}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Auction End *</label>
              <input
                className="form-input"
                type="datetime-local"
                value={form.auction_end_time}
                onChange={(e) => updateField('auction_end_time', e.target.value)}
              />
              {formErrors.auction_end_time && (
                <span className="error-msg">{formErrors.auction_end_time}</span>
              )}
            </div>

            {error && <span className="error-msg">{error}</span>}

            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={submittingNext}
              style={{ width: '100%', opacity: submittingNext ? 0.7 : 1 }}
            >
              {submittingNext ? 'Processing...' : 'Next →'}
            </button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                padding: '14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg)',
              }}
            >
              <CardElement options={cardElementOptions} />
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>Starting bid: </strong>
              ${Number(form.starting_bid).toFixed(2)} will be held until the auction ends.
            </div>

            {error && <span className="error-msg">{error}</span>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setStep('form')}
                disabled={submittingPay}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePayAndCreate}
                disabled={!stripe || submittingPay}
                style={{ flex: 2, opacity: submittingPay ? 0.7 : 1 }}
              >
                {submittingPay ? 'Processing payment...' : 'Pay & Create Task'}
              </button>
            </div>
          </div>
        )}

        {/* Processing states */}
        {isProcessing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton height="20px" />
            <Skeleton height="20px" width="80%" />
            <Skeleton height="48px" />
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
              Confirming payment...
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Your task has been created and is now live!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTaskModal;
