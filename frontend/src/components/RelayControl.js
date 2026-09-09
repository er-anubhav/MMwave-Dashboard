import { Power, Wand2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function RelayControl({ relayState, relayMode = "manual", onToggle, onModeChange }) {
  const safeOnToggle = typeof onToggle === 'function'
    ? onToggle
    : (state) => console.warn('onToggle handler not provided', state);
  const safeOnModeChange = typeof onModeChange === 'function'
    ? onModeChange
    : (mode) => console.warn('onModeChange handler not provided', mode);
  const isAuto = relayMode === "auto";

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-surface">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">Relay Control</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {isAuto ? "Automations decide relay state" : "Manual override for relay switch"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => safeOnModeChange("manual")}
              className={cn(
                "h-7 rounded px-3 text-xs font-medium transition-colors",
                !isAuto ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => safeOnModeChange("auto")}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
                isAuto ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Wand2 size={12} />
              Auto
            </button>
          </div>
        </div>

        {/* Live switch state */}
        <div className="mt-5 flex items-center justify-between rounded-md border border-border/70 bg-plot px-3.5 py-2.5">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                relayState ? "bg-success animate-pulse-dot" : "bg-muted-foreground/40"
              )}
            />
            <span className="text-sm font-medium text-foreground">
              Switch {relayState ? "ON" : "OFF"}
            </span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {isAuto ? "auto" : "manual"}
          </span>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            data-testid="relay-on-button"
            onClick={() => safeOnToggle(true)}
            disabled={relayState || isAuto}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md border px-5 py-3 text-xs font-medium transition-colors",
              relayState
                ? "cursor-not-allowed border-success/30 bg-success-soft text-success"
                : isAuto
                ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                : "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Power size={14} strokeWidth={2.5} />
            Turn ON
          </button>

          <button
            type="button"
            data-testid="relay-off-button"
            onClick={() => safeOnToggle(false)}
            disabled={!relayState || isAuto}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md border px-5 py-3 text-xs font-medium transition-colors",
              !relayState
                ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                : isAuto
                ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <Power size={14} strokeWidth={2.5} />
            Turn OFF
          </button>
        </div>
      </div>
    </div>
  );
}
