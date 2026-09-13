import React from 'react';
import { Clock } from 'lucide-react';

export default function ChartCard({ title, subtitle, footerText, chartBg = "bg-muted/40", children, className }) {
  return (
    <div className={`flex h-full flex-col rounded-lg border border-border bg-card shadow-surface ${className || ''}`}>
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-grow px-5">
        <div className={`relative h-[260px] w-full rounded-md p-3 ${chartBg}`}>
          {children}
        </div>
      </div>

      {footerText && (
        <div className="p-5 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{footerText}</span>
          </div>
        </div>
      )}
    </div>
  );
}