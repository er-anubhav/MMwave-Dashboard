import { Power, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

export default function RelayControl({ relayState, relayMode = "manual", onToggle, onModeChange }) {
  const safeOnToggle = typeof onToggle === 'function'
    ? onToggle
    : (state) => console.warn('onToggle handler not provided', state);
  const safeOnModeChange = typeof onModeChange === 'function'
    ? onModeChange
    : (mode) => console.warn('onModeChange handler not provided', mode);
  const isAuto = relayMode === "auto";

  return (
    <div className="flex flex-col glass-card shadow-sm rounded-2xl w-full">
      <div className="p-6 relative z-20">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h6 className="text-base  text-black dark:text-primary">
              Relay Control
            </h6>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isAuto ? "Automations decide relay state" : "Manual override for relay switch"}
            </p>
          </div>
          <div className="flex rounded-xl border border-gray-200 dark:border-border bg-gray-50/50 dark:bg-background/50 p-1">
            <button
              type="button"
              onClick={() => safeOnModeChange("manual")}
              className={`h-8 px-3 rounded-lg text-xs  transition-all ${!isAuto ? "bg-white dark:bg-background text-gray-900 dark:text-primary shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-zinc-200"}`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => safeOnModeChange("auto")}
              className={`h-8 px-3 rounded-lg text-xs  transition-all flex items-center gap-1.5 ${isAuto ? "bg-white dark:bg-background text-gray-900 dark:text-primary shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-zinc-200"}`}
            >
              <Wand2 size={12} />
              Auto
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-6">
          <div className={`w-2.5 h-2.5 rounded-full ${relayState ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-sm  text-black dark:text-primary tracking-wide">
            Switch Status: {relayState ? "ON" : "OFF"}
          </span>
        </div>
        
        <div className="flex gap-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            data-testid="relay-on-button"
            onClick={() => safeOnToggle(true)}
            disabled={relayState || isAuto}
            className={`px-5 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 flex-1  text-xs ${
              relayState
                ? "bg-emerald-600 dark:bg-primary dark:text-black text-white cursor-not-allowed border-emerald-600 dark:border-primary shadow-md shadow-emerald-500/10"
                : isAuto
                ? "bg-gray-100/50 dark:bg-background/50 text-gray-400 cursor-not-allowed border-gray-200/50 dark:border-border/50"
                : "bg-white/50 dark:bg-background/50 text-gray-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-background/85 border-gray-200 dark:border-border shadow-sm"
            }`}
          >
            <Power size={14} strokeWidth={2.5} />
            <span>Turn ON</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            data-testid="relay-off-button"
            onClick={() => safeOnToggle(false)}
            disabled={!relayState || isAuto}
            className={`px-5 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 flex-1  text-xs ${
              !relayState
                ? "bg-slate-900 dark:bg-zinc-800 text-white cursor-not-allowed border-slate-900 dark:border-zinc-800 shadow-md shadow-slate-950/20"
                : isAuto
                ? "bg-gray-100/50 dark:bg-background/50 text-gray-400 cursor-not-allowed border-gray-200/50 dark:border-border/50"
                : "bg-white/50 dark:bg-background/50 text-gray-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-background/85 border-gray-200 dark:border-border shadow-sm"
            }`}
          >
            <Power size={14} strokeWidth={2.5} />
            <span>Turn OFF</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
