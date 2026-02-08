/**
 * Skeleton - Base shimmer/pulse loader component
 * Matches Second Brain theme: dark green #154733, gold #FEE123
 */

export interface SkeletonProps {
  className?: string;
  variant?: 'pulse' | 'shimmer';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Skeleton({ 
  className = '', 
  variant = 'shimmer',
  rounded = 'md'
}: SkeletonProps) {
  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`bg-secondary-dark/20 ${roundedClass} ${
        variant === 'shimmer' ? 'animate-shimmer' : 'animate-pulse'
      } ${className}`}
      style={{
        background: variant === 'shimmer' 
          ? 'linear-gradient(90deg, rgba(21, 71, 51, 0.2) 0%, rgba(250, 222, 41, 0.08) 50%, rgba(21, 71, 51, 0.2) 100%)'
          : undefined,
        backgroundSize: variant === 'shimmer' ? '200% 100%' : undefined,
      }}
    />
  );
}

/**
 * Skeleton text line with automatic height/width
 */
export function SkeletonText({ 
  lines = 1, 
  className = '' 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4 w-full" 
          rounded="sm"
        />
      ))}
    </div>
  );
}

/**
 * Skeleton avatar circle
 */
export function SkeletonAvatar({ 
  size = 'md',
  className = ''
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = {
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-12',
  }[size];

  return <Skeleton className={`${sizeClass} ${className}`} rounded="full" />;
}

/**
 * Skeleton badge
 */
export function SkeletonBadge({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-5 w-16 ${className}`} rounded="full" />;
}
