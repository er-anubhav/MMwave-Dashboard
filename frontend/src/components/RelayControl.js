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
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 sm:p-5 shadow-surface justify-between">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-normal text-foreground">Relay</h3>
          <div className="flex shrink-0 items-center rounded-md border border-border p-0.5 bg-muted/20">
            <button
              type="button"
              onClick={() => safeOnModeChange("manual")}
              className={cn(
                "h-6 rounded px-2.5 text-xs font-normal transition-colors",
                !isAuto ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => safeOnModeChange("auto")}
              className={cn(
                "h-6 rounded px-2.5 text-xs font-normal transition-colors",
                isAuto ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Auto
            </button>
          </div>
        </div>

        {/* Status display */}
        <div className="mt-4 flex items-center justify-between rounded-md border border-border/60 bg-muted/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                relayState ? "bg-success animate-pulse-dot" : "bg-muted-foreground/40"
              )}
            />
            <span className="text-xs font-normal text-foreground">
              {relayState ? "Relay Active" : "Relay Inactive"}
            </span>
          </div>
          <span className="text-[11px] font-normal text-muted-foreground">
            {isAuto ? "Auto mode" : "Manual"}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4">
        {isAuto ? (
          <div className="flex h-9 items-center justify-center rounded-md border border-border bg-muted/30 px-3 text-xs font-normal text-muted-foreground">
            Managed by presence automation
          </div>
        ) : relayState ? (
          <button
            type="button"
            data-testid="relay-off-button"
            onClick={() => safeOnToggle(false)}
            className="flex h-9 w-full items-center justify-center rounded-md border border-border bg-card text-xs font-normal text-foreground transition-colors hover:bg-accent"
          >
            Turn Off
          </button>
        ) : (
          <button
            type="button"
            data-testid="relay-on-button"
            onClick={() => safeOnToggle(true)}
            className="flex h-9 w-full items-center justify-center rounded-md bg-primary text-xs font-normal text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Turn On
          </button>
        )}
      </div>
    </div>
  );
}
