import React from 'react';
import { cn } from '../../lib/utils';
import Sparkline from './Sparkline';

const STATUS_DOT = {
  ok: 'bg-success',
  warn: 'bg-warning',
  error: 'bg-destructive',
  muted: 'bg-muted-foreground/50',
};

/**
 * KPI metric card. White surface with semantic accents only:
 * small tinted icon container, 2px accent hairline, strong tabular value,
 * status dot + caption, and an optional sparkline fed by real sensor data.
 */
export default function StatCard({
  title,
  value,
  icon,
  iconClassName = 'text-muted-foreground bg-muted/60',
  accent,
  footerLabel,
  footerValue,
  footerColor = 'text-foreground',
  status,
  isAlert = false,
  isActive = false,
  sparkline, // { data, color, softColor, emptyLabel }
  className,
}) {
  const statusKey =
    status ||
    (isAlert ? 'error' : isActive ? 'ok' : footerColor.includes('destructive') ? 'error' : footerColor.includes('warning') ? 'warn' : 'muted');

  return (
    <div className={cn('relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-5 shadow-surface', className)}>
      {accent && <span className={cn('absolute inset-x-0 top-0 h-0.5', accent)} aria-hidden="true" />}

      <div className="flex items-start justify-between gap-2">
        <p className="pt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        {icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', iconClassName)}>
            {icon}
          </span>
        )}
      </div>

      <p className="mt-2 font-numeric text-2xl font-semibold tracking-tight text-foreground">{value}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[statusKey])} />
        <span className={cn('text-xs font-medium', footerColor)}>{footerValue}</span>
        {footerLabel && <span className="truncate text-xs text-muted-foreground">{footerLabel}</span>}
      </div>

      {sparkline && (
        <div className="mt-3 h-9">
          <Sparkline
            data={sparkline.data}
            color={sparkline.color}
            softColor={sparkline.softColor}
            height={36}
            width={220}
            emptyLabel={sparkline.emptyLabel || 'Waiting for data'}
          />
        </div>
      )}
    </div>
  );
}
