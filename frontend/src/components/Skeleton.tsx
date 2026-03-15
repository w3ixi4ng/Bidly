import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  variant = 'rect',
}) => {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'text' ? '16px' : '40px'),
    borderRadius:
      variant === 'circle'
        ? '50%'
        : variant === 'text'
        ? '4px'
        : 'var(--radius)',
    flexShrink: 0,
  };

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
};

export default Skeleton;
