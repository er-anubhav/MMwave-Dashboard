import { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import ChartEmptyState from "./ui/ChartEmptyState";

const HEART_COLOR = "hsl(0 65% 55%)";
const HEART_SOFT = "hsl(0 72% 96%)";
const RESP_COLOR = "hsl(212 84% 35%)";
const RESP_SOFT = "hsl(214 100% 96%)";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(0 0% 100%)",
  border: "1px solid hsl(213 39% 89%)",
  borderRadius: 6,
  boxShadow: "0 4px 12px hsla(221, 38%, 15%, 0.08)",
  fontSize: 12,
  color: "hsl(221 38% 15%)",
};

/**
 * Heart rate (red) + respiration (blue) over the live rolling window.
 * Plots only genuinely received samples; renders an intentional waiting
 * state until data arrives — never fabricates vitals.
 */
export default function VitalsChart({ history = [] }) {
  const data = useMemo(
    () =>
      (history || []).map((h) => ({
        heartRate: h.heartRate ?? null,
        respiration: h.respiration ?? null,
      })),
    [history]
  );

  const hasHeart = data.some((d) => d.heartRate != null);
  const hasResp = data.some((d) => d.respiration != null);

  if (data.length === 0) {
    return (
      <ChartEmptyState
        color={HEART_COLOR}
        series={["Heart Rate", "Respiration"]}
        label="Waiting for vitals — enable Sleep Mode on a Pro device"
      />
    );
  }

  return (
    <div className="h-full w-full pb-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(213 30% 90%)" vertical={false} />
          <YAxis domain={[0, 150]} hide={true} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ color: "hsl(221 38% 15%)" }}
            labelStyle={{ display: "none" }}
            isAnimationActive={false}
          />
          <Legend
            verticalAlign="top"
            height={32}
            iconType="plainline"
            formatter={(value) => <span style={{ color: "hsl(215 25% 32%)" }}>{value}</span>}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="heartRate"
            name="Heart Rate (bpm)"
            stroke={HEART_COLOR}
            strokeWidth={2}
            strokeDasharray={hasHeart ? undefined : "4 4"}
            dot={false}
            activeDot={{ r: 4, fill: HEART_COLOR, strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls={true}
          />
          <Line
            type="monotone"
            dataKey="respiration"
            name="Respiration (bpm)"
            stroke={RESP_COLOR}
            strokeWidth={2}
            strokeDasharray={hasResp ? undefined : "4 4"}
            dot={false}
            activeDot={{ r: 4, fill: RESP_COLOR, strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-between px-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>60s ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
