import { Power } from "lucide-react";

export default function RelayControl({ relayState, onToggle }) {
 // Defensive check for onToggle function
 const safeOnToggle = typeof onToggle === 'function'
 ? onToggle
 : (state) => console.warn('onToggle handler not provided', state);
 return (
 <div className="flex flex-col bg-white shadow-sm border border-gray-200 rounded-2xl w-full">
 <div className="p-6 relative z-20">
 <h6 className="text-base text-black mb-2 mt-4">
 Relay Control
 </h6>
 <p className="text-base text-black mb-2 ">
 {relayState ? "ON" : "OFF"}
 </p>
 <p className="text-sm text-gray-500 mb-6 ">
 Manual override for relay switch
 </p>
 
 <div className="flex gap-4">
 <button
 data-testid="relay-on-button"
 onClick={() => safeOnToggle(true)}
 disabled={relayState}
 className={`px-6 py-3 rounded-xl border transition-all flex items-center gap-2 ${
 relayState
 ? "bg-emerald-600 text-white cursor-not-allowed border-emerald-600 shadow-sm shadow-emerald-600/20"
 : "bg-white text-gray-800 hover:bg-gray-50 border-gray-200 shadow-sm"
 }`}
 >
 <Power size={18} strokeWidth={2} />
 <span className="text-sm ">Turn ON</span>
 </button>

 <button
 data-testid="relay-off-button"
 onClick={() => safeOnToggle(false)}
 disabled={!relayState}
 className={`px-6 py-3 rounded-xl border transition-all flex items-center gap-2 ${
 !relayState
 ? "bg-gray-900 text-white cursor-not-allowed border-gray-900 shadow-sm shadow-gray-900/20"
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