import React from 'react';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

const TYPE_STYLES = {
  alert: { dot: 'bg-destructive', label: 'text-destructive', mark: 'Alert' },
  warning: { dot: 'bg-warning', label: 'text-warning', mark: 'Warning' },
  action: { dot: 'bg-success', label: 'text-success', mark: 'Action' },
  success: { dot: 'bg-success', label: 'text-success', mark: 'Success' },
  mode: { dot: 'bg-primary', label: 'text-primary', mark: 'Mode' },
  info: { dot: 'bg-muted-foreground/50', label: 'text-muted-foreground', mark: 'Info' },
};

export default function SystemLogsTable({ logs = [] }) {
  const alertCount = logs.filter((l) => l.type === 'alert').length;

  return (
    <Card className="border-border">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">System Logs</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {logs.length === 0
              ? "No system logs yet."
              : alertCount > 0
                ? `${alertCount} alert${alertCount > 1 ? "s" : ""} in the recent window`
                : "All systems nominal"}
          </p>
        </div>
        {logs.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            last {logs.length} events
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        {logs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No system logs yet.</p>
        ) : (
          <ul className="px-5 py-1">
            {logs.map((log) => {
              const t = TYPE_STYLES[log.type] || TYPE_STYLES.info;
              return (
                <li key={log.id} className="flex items-center gap-3 border-b border-border/60 py-3.5 last:border-b-0">
                  {/* Identity: dot + message as separate flex elements. The dot is
                      a fixed-size, shrink-proof flex item (flex: 0 0 auto); the
                      message owns the remaining space and wraps without ever
                      sliding under the dot. */}
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      className="mt-[5px] flex h-2.5 w-2.5 flex-none items-center justify-center rounded-full"
                      aria-hidden="true"
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-foreground">
                      {log.event}
                    </span>
                  </div>
                  <span className={cn("hidden w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide sm:block", t.label)}>
                    {t.mark}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
                    {log.time}
                  </span>
                  {/* Fixed-width badge keeps category/timestamp columns aligned
                      across rows regardless of status word length */}
                  <span
                    className={cn(
                      "inline-flex w-[72px] shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      log.type === 'alert'
                        ? "bg-destructive-soft text-destructive"
                        : log.type === 'warning'
                          ? "bg-warning-soft text-warning"
                          : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <span className="truncate">{log.status}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
