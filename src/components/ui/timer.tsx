import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerProps {
  duration: number;
  onComplete?: () => void;
  isActive?: boolean;
  className?: string;
  showProgress?: boolean;
}

export const Timer = ({ 
  duration, 
  onComplete, 
  isActive = true, 
  className,
  showProgress = true 
}: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [duration, isActive, onComplete, startTime]);

  const percentage = (timeLeft / duration) * 100;
  const isLow = timeLeft <= 3;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span 
          className={cn(
            'font-mono text-2xl font-bold transition-colors',
            isLow ? 'text-destructive animate-pulse' : 'text-foreground'
          )}
        >
          {timeLeft}s
        </span>
      </div>
      {showProgress && (
        <div className="h-3 w-full border-2 border-foreground bg-background">
          <div 
            className={cn(
              'h-full transition-all duration-100',
              isLow ? 'bg-destructive' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
