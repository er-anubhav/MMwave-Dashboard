import { User, TrendingUp, AlertTriangle } from "lucide-react";
import RelayControl from "./RelayControl";
import ActivityChart from "./ActivityChart";

export default function FallDetectionDashboard({ sensorData, relayState, onRelayToggle }) {
  if (!sensorData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#78716C] font-mono">Loading sensor data...</p>
      </div>
    );
  }

  const { presence, activity, fall_detected } = sensorData;

  return (
    <div>
      {/* Page Title */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">OPERATIONAL MODE</p>
        <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-[#1C1917]">
          Fall Detection
        </h2>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Presence Status */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-1" data-testid="presence-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#78716C] mb-3">PRESENCE</p>
              <p className="font-mono text-5xl font-bold tracking-tight text-[#1C1917] mb-4">
                {presence ? "YES" : "NO"}
              </p>
              <p className="text-sm text-[#78716C]">
                {presence ? "Person detected in room" : "No presence detected"}
              </p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center border ${
              presence ? "border-[#16A34A] bg-[#16A34A]/10" : "border-[#E7E5E4] bg-[#F5F5F4]"
            }`}>
              <User size={24} strokeWidth={1.5} className={presence ? "text-[#16A34A]" : "text-[#78716C]"} />
            </div>
          </div>
        </div>

        {/* Activity Level */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-1" data-testid="activity-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#78716C] mb-3">ACTIVITY LEVEL</p>
              <p className="font-mono text-5xl font-bold tracking-tight text-[#1C1917] mb-4">
                {activity}
              </p>
              <p className="text-sm text-[#78716C]">
                {activity > 30 ? "High movement" : activity > 10 ? "Moderate movement" : "Low activity"}
              </p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center border border-[#E7E5E4] bg-[#F5F5F4]">
              <TrendingUp size={24} strokeWidth={1.5} className="text-[#1C1917]" />
            </div>
          </div>
        </div>

        {/* Fall Detection Alert */}
        <div 
          className={`border p-6 col-span-1 md:col-span-2 ${
            fall_detected 
              ? "bg-[#DC2626] border-[#DC2626] text-white" 
              : "bg-white border-[#E7E5E4] text-[#1C1917]"
          }`}
          data-testid="fall-alert-card"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs uppercase tracking-widest mb-3 ${
                fall_detected ? "text-white/80" : "text-[#78716C]"
              }`}>FALL DETECTION STATUS</p>
              <p className="font-mono text-5xl font-bold tracking-tight mb-4">
                {fall_detected ? "ALERT" : "SAFE"}
              </p>
              <p className={`text-sm ${
                fall_detected ? "text-white/90" : "text-[#78716C]"
              }`}>
                {fall_detected 
                  ? "Fall detected! Immediate attention required." 
                  : "No fall detected. System monitoring normally."}
              </p>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center border ${
              fall_detected 
                ? "border-white bg-white/20" 
                : "border-[#16A34A] bg-[#16A34A]/10"
            }`}>
              <AlertTriangle 
                size={24} 
                strokeWidth={1.5} 
                className={fall_detected ? "text-white" : "text-[#16A34A]"} 
              />
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-[#78716C] mb-6">ACTIVITY HISTORY</p>
          <ActivityChart currentActivity={activity} />
        </div>

        {/* Relay Control */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <RelayControl relayState={relayState} onToggle={onRelayToggle} />
        </div>
      </div>
    </div>
  );
}