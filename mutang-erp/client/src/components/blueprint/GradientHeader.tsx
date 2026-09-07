import type { ReactNode } from 'react';
import dayjs from 'dayjs';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  children?: ReactNode;
}

const GradientHeader = ({
  title,
  subtitle,
  meta,
  children,
}: GradientHeaderProps) => {
  return (
    <header className="relative overflow-hidden border-b border-blue-900 bg-gradient-to-br from-[#001D4A] via-[#0033A0] to-[#004B93] pt-12 pb-16 px-8">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 -skew-x-[20deg] translate-x-1/4" />
      <div className="relative max-w-7xl mx-auto">
        {subtitle ? (
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100 mb-3">
            {subtitle}
          </div>
        ) : null}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
          {title}
        </h1>
        <div className="mt-6 inline-flex flex-wrap items-center gap-4 bg-black/10 backdrop-blur-sm p-4 border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">
            {dayjs().format('YYYY-MM-DD')}
          </span>
          {meta ? (
            <>
              <span className="h-4 w-px bg-white/30" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">
                {meta}
              </span>
            </>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
};

export { GradientHeader };
export type { GradientHeaderProps };
