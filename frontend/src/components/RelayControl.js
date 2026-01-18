import { Power } from "lucide-react";

export default function RelayControl({ relayState, onToggle }) {
  return (
    <div className="bg-white border border-[#E7E5E4] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">RELAY CONTROL</p>
          <p className="font-mono text-2xl font-bold tracking-tight text-[#1C1917] mb-2">
            {relayState ? "ON" : "OFF"}
          </p>
          <p className="text-sm text-[#78716C]">
            Manual override for relay switch
          </p>
        </div>

        <div className="flex gap-4">
          <button
            data-testid="relay-on-button"
            onClick={() => onToggle(true)}
            disabled={relayState}
            className={`px-8 py-4 border transition-all ${
              relayState
                ? "border-[#F59E0B] bg-[#F59E0B] text-white cursor-not-allowed"
                : "border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-[#F5F5F4]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Power size={20} strokeWidth={1.5} />
              <span className="font-medium">Turn ON</span>
            </div>
          </button>

          <button
            data-testid="relay-off-button"
            onClick={() => onToggle(false)}
            disabled={!relayState}
            className={`px-8 py-4 border transition-all ${
              !relayState
                ? "border-[#1C1917] bg-[#1C1917] text-white cursor-not-allowed"
                : "border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-[#F5F5F4]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Power size={20} strokeWidth={1.5} />
              <span className="font-medium">Turn OFF</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}