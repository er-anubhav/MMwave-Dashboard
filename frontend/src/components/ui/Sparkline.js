import React from "react";

/**
 * Small inline line/area sparkline built on SVG with a flat translucent fill
 * (no gradients). Renders an intentional waiting visualization when a series
 * has no data yet — never fabricates points.
 */
export default function Sparkline({
  data,
  color = "hsl(212 84% 35%)",
  softColor,
  width = 200,
  height = 40,
  showAxis = false,
  emptyLabel = "No data yet",
}) {
  const values = Array.isArray(data) ? data.filter((v) => v != null) : [];
  const hasData = values.length > 0;
  const soft = softColor || color;

  const W = width;
  const H = height;

  if (!hasData) {
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={emptyLabel}
      >
        <line x1="0" y1={H - 12} x2={W} y2={H - 12} stroke="hsl(213 39% 87%)" strokeWidth="1" strokeDasharray="3 4" />
        <text x="8" y={H - 18} fontSize="10" fill="hsl(215 16% 45%)" fontFamily="'JetBrains Mono', monospace">
          {emptyLabel}
          {showAxis ? " — waiting for sensor" : ""}
        </text>
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${H - 2} L${points[0][0].toFixed(1)},${H - 2} Z`;
  const [endX, endY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label="trend sparkline">
      {showAxis && (
        <>
          <line x1="0" y1={H - 12} x2={W} y2={H - 12} stroke="hsl(213 39% 87%)" strokeWidth="1" />
          <text x="4" y={H - 3} fontSize="9" fill="hsl(215 16% 45%)" fontFamily="'JetBrains Mono', monospace">30s ago</text>
          <text x={W - 4} y={H - 3} fontSize="9" fill="hsl(215 16% 45%)" fontFamily="'JetBrains Mono', monospace" textAnchor="end">now</text>
          <text x={4} y={11} fontSize="9" fill="hsl(215 16% 45%)" fontFamily="'JetBrains Mono', monospace">{max}</text>
        </>
      )}
      <path d={area} fill={soft} fillOpacity="0.5" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={endX} cy={endY} r="3" fill={color} />
    </svg>
  );
}
