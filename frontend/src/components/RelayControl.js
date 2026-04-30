import { Power, Wand2 } from "lucide-react";

export default function RelayControl({ relayState, relayMode = "manual", onToggle, onModeChange }) {
 // Defensive check for onToggle function
 const safeOnToggle = typeof onToggle === 'function'
 ? onToggle
 : (state) => console.warn('onToggle handler not provided', state);
 const safeOnModeChange = typeof onModeChange === 'function'
 ? onModeChange
 : (mode) => console.warn('onModeChange handler not provided', mode);
 const isAuto = relayMode === "auto";

 return (
 <div className="flex flex-col bg-white shadow-sm border border-gray-200 rounded-xl w-full">
 <div className="p-6 relative z-20">
 <div className="flex items-start justify-between gap-3 mb-4">
 <div>
 <h6 className="text-base text-black">
 Relay Control
 </h6>
 <p className="text-sm text-gray-500 mt-1">
 {isAuto ? "Automations decide relay state" : "Manual override for relay switch"}
 </p>
 </div>
 <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
 <button
 type="button"
 onClick={() => safeOnModeChange("manual")}
 className={`h-8 px-3 rounded-md text-xs transition-all ${!isAuto ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
 >
 Manual
 </button>
 <button
 type="button"
 onClick={() => safeOnModeChange("auto")}
 className={`h-8 px-3 rounded-md text-xs transition-all flex items-center gap-1.5 ${isAuto ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
 >
 <Wand2 size={14} />
 Auto
 </button>
 </div>
 </div>

 <p className="text-base text-black mb-2 ">
 {relayState ? "ON" : "OFF"}
 </p>
 
 <div className="flex gap-4">
 <button
 data-testid="relay-on-button"
 onClick={() => safeOnToggle(true)}
 disabled={relayState || isAuto}
 className={`px-6 py-3 rounded-xl border transition-all flex items-center gap-2 ${
 relayState
 ? "bg-emerald-600 text-white cursor-not-allowed border-emerald-600 shadow-sm shadow-emerald-600/20"
 : isAuto
 ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
 : "bg-white text-gray-800 hover:bg-gray-50 border-gray-200 shadow-sm"
 }`}
 >
 <Power size={18} strokeWidth={2} />
 <span className="text-sm ">Turn ON</span>
 </button>

 <button
 data-testid="relay-off-button"
 onClick={() => safeOnToggle(false)}
 disabled={!relayState || isAuto}
 className={`px-6 py-3 rounded-xl border transition-all flex items-center gap-2 ${
 !relayState
 ? "bg-gray-900 text-white cursor-not-allowed border-gray-900 shadow-sm shadow-gray-900/20"
 : isAuto
 ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
 : "bg-white text-gray-800 hover:bg-gray-50 border-gray-200 shadow-sm"
 }`}
 >
 <Power size={18} strokeWidth={2} />
 <span className="text-sm ">Turn OFF</span>
 </button>
 </div>
 </div>
 </div>
 );
}
