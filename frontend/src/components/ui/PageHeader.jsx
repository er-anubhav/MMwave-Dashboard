import React from "react";
import { cn } from "../../lib/utils";

/**
 * Standard page heading used at the top of every screen:
 * large bold navy title, muted description underneath, optional actions
 * aligned to the right — mirrors the reference console screens.
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
