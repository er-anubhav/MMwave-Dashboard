import { Activity, Moon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Header({ mode, onModeChange, isConnected, lastUpdated }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="container mx-auto px-6 md:px-12 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#1C1917]">
              mmWave Smart Switch
            </h1>
            <p className="text-sm text-[#78716C] font-mono mt-1">
              {lastUpdated ? `Updated ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}` : "Waiting for data..."}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-[#16A34A]" : "bg-[#DC2626]"
              }`}></div>
              <span className="text-sm text-[#78716C] hidden md:inline">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Mode Toggle */}
            <div className="flex border border-[#E7E5E4] bg-white">
              <button
                data-testid="fall-mode-button"
                onClick={() => onModeChange("fall")}
                className={`flex items-center gap-2 px-6 py-3 transition-colors ${
                  mode === "fall" 
                    ? "bg-[#1C1917] text-white" 
                    : "bg-white text-[#78716C] hover:bg-[#F5F5F4]"
                }`}
              >
                <Activity size={18} strokeWidth={1.5} />
                <span className="font-medium text-sm">Fall Detection</span>
              </button>
              <button
                data-testid="sleep-mode-button"
                onClick={() => onModeChange("sleep")}
                className={`flex items-center gap-2 px-6 py-3 transition-colors ${
                  mode === "sleep" 
                    ? "bg-[#1C1917] text-white" 
                    : "bg-white text-[#78716C] hover:bg-[#F5F5F4]"
                }`}
              >
                <Moon size={18} strokeWidth={1.5} />
                <span className="font-medium text-sm">Sleep Monitoring</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}