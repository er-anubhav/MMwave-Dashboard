import { Moon, Activity as ActivityIcon, Wind } from "lucide-react";
import RelayControl from "./RelayControl";
import RespirationGauge from "./RespirationGauge";
import MovementChart from "./MovementChart";

export default function SleepModeDashboard({ sensorData, relayState, onRelayToggle }) {
  if (!sensorData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#78716C] font-mono">Loading sensor data...</p>
      </div>
    );
  }

  const { presence, sleep } = sensorData;
  const sleepData = sleep || { respiration: 0, movement: 0, sleep_state: "awake" };

  const getSleepStateColor = () => {
    switch (sleepData.sleep_state) {
      case "deep":
        return "#1E1B4B";
      case "light":
        return "#4F46E5";
      case "awake":
        return "#78716C";
      default:
        return "#78716C";
    }
  };

  const getSleepStateText = () => {
    return sleepData.sleep_state.toUpperCase();
  };

  return (
    <div>
      {/* Page Title */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">OPERATIONAL MODE</p>
        <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-[#1C1917]">
          Sleep Monitoring
        </h2>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Sleep State Hero Card */}
        <div 
          className="border p-8 col-span-1 md:col-span-2"
          style={{ 
            backgroundColor: getSleepStateColor(),
            borderColor: getSleepStateColor()
          }}
          data-testid="sleep-state-card"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/80 mb-4">SLEEP STATE</p>
              <p className="font-mono text-6xl md:text-7xl font-bold tracking-tight text-white mb-6">
                {getSleepStateText()}
              </p>
              <p className="text-sm text-white/90">
                {presence 
                  ? sleepData.sleep_state === "deep" 
                    ? "Deep sleep phase - minimal movement" 
                    : sleepData.sleep_state === "light"
                    ? "Light sleep phase - some movement"
                    : "Awake or resting"
                  : "No presence detected"}
              </p>
            </div>
            <div className="w-16 h-16 flex items-center justify-center border border-white bg-white/20">
              <Moon size={32} strokeWidth={1.5} className="text-white" />
            </div>
          </div>
        </div>

        {/* Respiration Rate */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-1" data-testid="respiration-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#78716C] mb-3">RESPIRATION</p>
              <p className="font-mono text-5xl font-bold tracking-tight text-[#1C1917] mb-2">
                {sleepData.respiration}
              </p>
              <p className="text-sm text-[#78716C]">
                breaths per minute
              </p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center border border-[#4F46E5] bg-[#4F46E5]/10">
              <Wind size={24} strokeWidth={1.5} className="text-[#4F46E5]" />
            </div>
          </div>
        </div>

        {/* Body Movement Index */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-1" data-testid="movement-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#78716C] mb-3">MOVEMENT INDEX</p>
              <p className="font-mono text-5xl font-bold tracking-tight text-[#1C1917] mb-2">
                {sleepData.movement}
              </p>
              <p className="text-sm text-[#78716C]">
                {sleepData.movement < 3 ? "Very still" : sleepData.movement < 6 ? "Moderate" : "Active"}
              </p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center border border-[#E7E5E4] bg-[#F5F5F4]">
              <ActivityIcon size={24} strokeWidth={1.5} className="text-[#1C1917]" />
            </div>
          </div>
        </div>

        {/* Respiration Gauge */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-2">
          <p className="text-xs uppercase tracking-widest text-[#78716C] mb-6">RESPIRATION TREND</p>
          <RespirationGauge currentRate={sleepData.respiration} />
        </div>

        {/* Movement Chart */}
        <div className="bg-white border border-[#E7E5E4] p-6 col-span-1 md:col-span-2">
          <p className="text-xs uppercase tracking-widest text-[#78716C] mb-6">MOVEMENT HISTORY</p>
          <MovementChart currentMovement={sleepData.movement} />
        </div>

        {/* Relay Control */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4">
          <RelayControl relayState={relayState} onToggle={onRelayToggle} />
        </div>
      </div>
    </div>
  );
}