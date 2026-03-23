import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ThumbnailCropperProps {
  file: File;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

// Matches the card thumbnail aspect ratio (709:251)
const CROP_W = 400;
const CROP_H = Math.round(CROP_W * 251 / 709); // ~142

const ThumbnailCropper: React.FC<ThumbnailCropperProps> = ({ file, onCrop, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const getMinScale = useCallback(() => {
    const img = imgRef.current;
    if (!img) return 1;
    return Math.max(CROP_W / img.width, CROP_H / img.height);
  }, []);

  const clampPos = useCallback((x: number, y: number, s: number) => {
    const img = imgRef.current;
    if (!img) return { x, y };
    const w = img.width * s;
    const h = img.height * s;
    return {
      x: Math.min(0, Math.max(CROP_W - w, x)),
      y: Math.min(0, Math.max(CROP_H - h, y)),
    };
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minScale = getMinScale();
      setScale(minScale);
      setPos({
        x: (CROP_W - img.width * minScale) / 2,
        y: (CROP_H - img.height * minScale) / 2,
      });
      setImgLoaded(true);
      setImgError(false);
    };
    img.onerror = () => {
      setImgError(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, getMinScale]);

  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_W, CROP_H);
    const img = imgRef.current;
    ctx.drawImage(img, pos.x, pos.y, img.width * scale, img.height * scale);
  }, [imgLoaded, pos, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos(clampPos(dragStart.current.posX + dx, dragStart.current.posY + dy, scale));
  }, [dragging, scale, clampPos]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const touchStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, posX: pos.x, posY: pos.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    setPos(clampPos(touchStart.current.posX + dx, touchStart.current.posY + dy, scale));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const min = getMinScale();
    const max = min * 4;
    const newScale = Math.min(max, Math.max(min, scale - e.deltaY * 0.001));

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleRatio = CROP_W / rect.width;
      const canvasX = (e.clientX - rect.left) * scaleRatio;
      const canvasY = (e.clientY - rect.top) * scaleRatio;
      const ratio = newScale / scale;
      setPos(clampPos(
        canvasX - (canvasX - pos.x) * ratio,
        canvasY - (canvasY - pos.y) * ratio,
        newScale,
      ));
    }
    setScale(newScale);
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = getMinScale();
    const max = min * 4;
    const newScale = min + (max - min) * (Number(e.target.value) / 100);
    const img = imgRef.current;
    if (img) {
      const ratio = newScale / scale;
      const cx = CROP_W / 2;
      const cy = CROP_H / 2;
      setPos(clampPos(cx - (cx - pos.x) * ratio, cy - (cy - pos.y) * ratio, newScale));
    }
    setScale(newScale);
  };

  const sliderValue = () => {
    const min = getMinScale();
    const max = min * 4;
    if (max === min) return 0;
    return ((scale - min) / (max - min)) * 100;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = CROP_W;
    outCanvas.height = CROP_H;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, pos.x, pos.y, img.width * scale, img.height * scale);
    outCanvas.toBlob(blob => {
      if (!blob) return;
      const cropped = new File([blob], file.name, { type: 'image/jpeg' });
      onCrop(cropped);
    }, 'image/jpeg', 0.9);
  };

  if (imgError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 14, color: '#ef4444' }}>
          Failed to load image. The file may be corrupted or unsupported.
        </div>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        Drag to reposition. Scroll or use the slider to zoom.
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
        style={{
          width: '100%',
          maxWidth: CROP_W,
          aspectRatio: `${CROP_W}/${CROP_H}`,
          overflow: 'hidden',
          borderRadius: 12,
          border: '2px solid var(--border)',
          cursor: dragging ? 'grabbing' : 'grab',
          position: 'relative',
          touchAction: 'none',
          alignSelf: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CROP_W}
          height={CROP_H}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* Zoom slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
        <input
          type="range"
          min={0}
          max={100}
          value={sliderValue()}
          onChange={handleSlider}
          style={{ flex: 1, accentColor: '#6366f1' }}
        />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6M11 8v6" />
        </svg>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleConfirm}
          style={{ flex: 1 }}
        >
          Use This Crop
        </button>
      </div>
    </div>
  );
};

export default ThumbnailCropper;
