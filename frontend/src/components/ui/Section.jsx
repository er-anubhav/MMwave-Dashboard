import React from "react";
import { cn } from "../../lib/utils";

/**
 * Groups related content with a clear section header.
 * Intentionally NOT a bordered card — hierarchy comes from typography and
 * a hairline separator, so pages don't read as stacks of boxes.
 */
export default function Section({ title, description, action, children, className }) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="border-t border-border" />
      {children}
    </section>
  );
}