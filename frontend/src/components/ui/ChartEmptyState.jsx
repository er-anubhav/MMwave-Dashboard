import React from "react";

const DOT_COLOR = "hsl(213 39% 87%)";

/**
 * Intentional waiting visualization for live charts: keeps the axes/grid and
 * a dashed baseline so the panel still reads as a monitoring surface while
 * clearly stating that no data has arrived. Never fabricates data.
 */
export default function ChartEmptyState({ color = "hsl(212 84% 35%)", series = [], label = "Waiting for data" }) {
  return (
    <div className="relative flex h-full min-h-[220px] w-full flex-col">
      <div className="absolute inset-0">
        <svg className="h-full w-full" preserveAspectRatio="none" role="img" aria-label={label}>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2="100%"
              y1={`${f * 100}%`}
              y2={`${f * 100}%`}
              stroke={DOT_COLOR}
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          ))}
          <line x1="0" x2="100%" y1="82%" y2="82%" stroke={DOT_COLOR} strokeWidth="1.5" />
          {series.length > 1 && (
            <line x1="0" x2="100%" y1="45%" y2="45%" stroke={color} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.45" />
          )}
        </svg>
      </div>
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2 pb-6 text-center">
        <div className="flex items-center gap-4">
          {series.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: i === 0 ? color : "hsl(212 84% 35%)", opacity: 0.7 }}
              />
              {s}
            </span>
          ))}
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{label}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          live · polls every second
        </p>
      </div>
    </div>
  );
}
