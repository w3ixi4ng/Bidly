import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { capturePayment } from '../api/payment';
import { uploadTaskPhotos, uploadTaskThumbnail } from '../api/uploads';
import { getTask, getTasksByClient } from '../api/tasks';
import { useTaskStore } from '../store/taskStore';
import Skeleton from './Skeleton';
import ThumbnailCropper from './ThumbnailCropper';
import type { TaskCategory } from '../types';

type Step = 'form' | 'payment' | 'confirming' | 'uploading' | 'done';

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
  const { upsertTask } = useTaskStore();

  const [step, setStep] = useState<Step>('form');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState('');
  const [submittingNext, setSubmittingNext] = useState(false);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoLimitMsg, setPhotoLimitMsg] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const valid = files.filter(f => allowed.includes(f.type) && f.size <= 5 * 1024 * 1024);
    const total = [...selectedPhotos, ...valid];
    if (total.length > 10) {
      setPhotoLimitMsg('Maximum 10 photos allowed.');
    } else {
      setPhotoLimitMsg('');
    }
    const combined = total.slice(0, 10);
    setSelectedPhotos(combined);

    // Generate previews
    const previews = combined.map(f => URL.createObjectURL(f));
    // Revoke old previews
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviews(previews);

    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDrop = (targetIndex: number) => {
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === targetIndex) return;
    const reorder = <T,>(arr: T[]) => {
      const copy = [...arr];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    };
    setSelectedPhotos(reorder);
    setPhotoPreviews(reorder);
    dragIndexRef.current = null;
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) return;
    setCropSource(file);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(croppedFile);
    setThumbnailPreview(URL.createObjectURL(croppedFile));
    setCropSource(null);
  };

  const handleCropCancel = () => {
    setCropSource(null);
  };

  const removeThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasUploads = selectedPhotos.length > 0 || thumbnailFile !== null;

  // After payment succeeds, wait for the task to appear then upload photos + thumbnail
  const uploadPhotosToTask = useCallback(async () => {
    if (!hasUploads) return;

    // Poll the API directly for the newly created task
    const findTaskId = async (): Promise<string | null> => {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const tasks = await getTasksByClient(user!.user_id);
          const found = tasks.find(t => t.title === form.title.trim());
          if (found) return found.task_id;
        } catch {
          // API may not be ready yet, keep polling
        }
      }
      return null;
    };

    const taskId = await findTaskId();
    if (!taskId) {
      console.error('Could not find newly created task for photo upload');
      return;
    }

    // Upload thumbnail and photos in parallel via orchestrator
    await Promise.all([
      thumbnailFile ? uploadTaskThumbnail(taskId, thumbnailFile) : Promise.resolve(),
      selectedPhotos.length > 0 ? uploadTaskPhotos(taskId, selectedPhotos) : Promise.resolve(),
    ]);

    // Refresh the task in the store so the thumbnail/photos show immediately
    try {
      const updatedTask = await getTask(taskId);
      upsertTask(updatedTask);
    } catch {
      // Non-critical — task will refresh on next page load
    }
  }, [hasUploads, thumbnailFile, selectedPhotos, user?.user_id, form.title, upsertTask]);

  const handleNext = async () => {
    if (cropSource) {
      setError('Please confirm your thumbnail crop before proceeding.');
      return;
    }
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

      if (hasUploads) {
        setStep('uploading');
        try {
          await uploadPhotosToTask();
        } catch (err) {
          console.error('Photo upload failed:', err);
        }
      }

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

  const isProcessing = step === 'confirming' || step === 'uploading';
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleCloseAttempt = () => {
    if (isProcessing) return;
    if (step === 'done') {
      setAddTaskModalOpen(false);
      return;
    }
    // If form has any data, ask for confirmation
    const hasData = form.title.trim() || form.description.trim() || form.starting_bid
      || requirements.length > 0 || selectedPhotos.length > 0 || thumbnailFile;
    if (hasData) {
      setShowCloseConfirm(true);
    } else {
      setAddTaskModalOpen(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCloseAttempt}>
      <div
        className="modal-box"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'form' && 'Create New Task'}
            {step === 'payment' && 'Payment'}
            {(step === 'confirming' || step === 'uploading') && 'Processing...'}
            {step === 'done' && 'Task Created!'}
          </h2>
          {!isProcessing && step !== 'done' && (
            <button className="modal-close" onClick={handleCloseAttempt}>
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
                maxLength={100}
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
                maxLength={500}
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
                  maxLength={200}
                  onChange={(e) => setReqInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = reqInput.trim();
                      if (trimmed && !requirements.includes(trimmed) && requirements.length < 100) {
                        setRequirements((prev) => [...prev, trimmed]);
                        setReqInput('');
                      }
                    }
                  }}
                  placeholder={requirements.length >= 100 ? 'Max 100 requirements reached' : 'e.g. Must be responsive'}
                  disabled={requirements.length >= 100}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={requirements.length >= 100}
                  onClick={() => {
                    const trimmed = reqInput.trim();
                    if (trimmed && !requirements.includes(trimmed) && requirements.length < 100) {
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
                type="text"
                inputMode="decimal"
                value={form.starting_bid}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                    updateField('starting_bid', val);
                  }
                }}
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

            {/* Thumbnail (optional) */}
            <div className="form-group">
              <label className="form-label">Thumbnail (optional)</label>
              {cropSource ? (
                <ThumbnailCropper
                  file={cropSource}
                  onCrop={handleCropConfirm}
                  onCancel={handleCropCancel}
                />
              ) : thumbnailPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', width: 120, height: 60 }}>
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail"
                      style={{
                        width: 120, height: 60, objectFit: 'cover',
                        borderRadius: 8, border: '1px solid var(--border)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--text-secondary)', color: 'white', border: 'none',
                        cursor: 'pointer', fontSize: 12, lineHeight: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => thumbnailInputRef.current?.click()}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    transition: 'border-color 0.2s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span>Add a cover image for the task card</span>
                </div>
              )}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleThumbnailSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Photos (optional) */}
            <div className="form-group">
              <label className="form-label">Photos (optional)</label>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 6 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <div>Click to add photos (max 10, 5MB each)</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>JPEG, PNG, WebP</div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
              {photoPreviews.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {photoPreviews.map((src, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(i)}
                      style={{ position: 'relative', width: 64, height: 64, cursor: 'grab' }}
                    >
                      <img
                        src={src}
                        alt={`Photo ${i + 1}`}
                        draggable={false}
                        onClick={() => setPreviewIndex(i)}
                        style={{
                          width: 64, height: 64, objectFit: 'cover',
                          borderRadius: 8, border: '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--text-secondary)', color: 'white', border: 'none',
                          cursor: 'pointer', fontSize: 12, lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photoLimitMsg && <span className="error-msg">{photoLimitMsg}</span>}
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
              {step === 'uploading' ? 'Uploading photos...' : 'Confirming payment...'}
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

      {/* Photo preview lightbox */}
      {previewIndex !== null && photoPreviews[previewIndex] && (
        <div
          onClick={e => { e.stopPropagation(); setPreviewIndex(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Prev */}
          {photoPreviews.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setPreviewIndex((previewIndex - 1 + photoPreviews.length) % photoPreviews.length); }}
              style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: 40, height: 40, cursor: 'pointer', color: 'white', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ‹
            </button>
          )}

          <img
            src={photoPreviews[previewIndex]}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain',
              borderRadius: 8,
            }}
          />

          {/* Next */}
          {photoPreviews.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setPreviewIndex((previewIndex + 1) % photoPreviews.length); }}
              style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: 40, height: 40, cursor: 'pointer', color: 'white', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ›
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => setPreviewIndex(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>

          {/* Counter */}
          <div style={{
            position: 'absolute', bottom: 20,
            color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600,
          }}>
            {previewIndex + 1} / {photoPreviews.length}
          </div>
        </div>
      )}

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '24px 28px',
            maxWidth: 340,
            width: '90%',
            textAlign: 'center',
          }}>
            <h3 style={{
              fontSize: 16, fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}>
              Discard changes?
            </h3>
            <p style={{
              fontSize: 13, color: 'var(--text-secondary)',
              marginBottom: 20, lineHeight: 1.5,
            }}>
              You have unsaved changes. Are you sure you want to close?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCloseConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setAddTaskModalOpen(false)}
                style={{ flex: 1, background: '#ef4444' }}
              >
                Yes, discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTaskModal;
