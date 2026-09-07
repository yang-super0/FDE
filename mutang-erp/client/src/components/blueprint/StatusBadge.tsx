import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-[#ECFDF5] text-[#10B981]',
  warning: 'bg-[#FFFBEB] text-[#F59E0B]',
  danger: 'bg-[#FEF2F2] text-[#EF4444]',
  info: 'bg-[#EFF6FF] text-[#0033A0]',
  neutral: 'bg-slate-100 text-slate-500',
};

const StatusBadge = ({ tone, children, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-[2px]',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};

export { StatusBadge };
export type { StatusBadgeProps, StatusTone };
