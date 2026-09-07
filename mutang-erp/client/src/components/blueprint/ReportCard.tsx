import type { ReactNode } from 'react';
import { cn } from '@client/src/lib/utils';

interface ReportCardProps {
  children: ReactNode;
  className?: string;
}

const ReportCard = ({ children, className }: ReportCardProps) => {
  return (
    <div
      className={cn(
        'bg-card border-t-[3px] border-t-[#0033A0] rounded-none shadow-md p-6',
        className,
      )}
    >
      {children}
    </div>
  );
};

export { ReportCard };
export type { ReportCardProps };
