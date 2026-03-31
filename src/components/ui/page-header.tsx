import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export function PageHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[32px] border border-emerald-950/10 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 px-6 py-7 text-white shadow-[0_28px_80px_rgba(6,78,59,0.28)] dark:border-white/10 dark:from-emerald-950 dark:via-emerald-900 dark:to-teal-900',
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-white/65">
            Data Entry Module
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-3xl text-sm font-semibold text-white/76">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function HeaderBadge({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white/90 backdrop-blur',
        className
      )}
      {...props}
    />
  );
}
