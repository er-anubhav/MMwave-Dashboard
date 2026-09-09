import React from "react";
import { cn } from "../../lib/utils";

const variants = {
  online: { text: "text-success", dot: "bg-success" },
  live: { text: "text-success", dot: "bg-success" },
  waiting: { text: "text-muted-foreground", dot: "bg-muted-foreground/60" },
  offline: { text: "text-muted-foreground", dot: "bg-muted-foreground/60" },
  warning: { text: "text-warning", dot: "bg-warning" },
  error: { text: "text-destructive", dot: "bg-destructive" },
};

export default function StatusPill({ status = "waiting", label, pulse = false, className }) {
  const v = variants[status] || variants.waiting;
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-xs font-semibold shadow-surface-sm",
        v.text,
        className
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", v.dot, pulse && "animate-pulse-dot")} />
      {label}
    </span>
  );
}
