import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Header from "../components/Header";
import FallDetectionDashboard from "../components/FallDetectionDashboard";
import SleepModeDashboard from "../components/SleepModeDashboard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const POLL_INTERVAL = 1000; // Poll every 1 second for real-time updates

export default function Dashboard() {
  const [mode, setMode] = useState("fall");
  const [sensorData, setSensorData] = useState(null);
  const [relayState, setRelayState] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Poll backend for latest data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/latest-data`);
        const data = response.data;
        
        setMode(data.mode);
        setSensorData(data.sensor_data);
        setRelayState(data.relay);
        setLastUpdated(data.last_updated);
        setIsConnected(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsConnected(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    const interval = setInterval(fetchData, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleModeChange = async (newMode) => {
    try {
      await axios.post(`${API}/set-mode`, { mode: newMode });
      setMode(newMode);
      toast.success(`Switched to ${newMode === "fall" ? "Fall Detection" : "Sleep Monitoring"} mode`);
    } catch (error) {
      console.error("Error setting mode:", error);
      toast.error("Failed to change mode");
    }
  };

  const handleRelayToggle = async (state) => {
    try {
      await axios.post(`${API}/set-relay`, { relay: state });
      setRelayState(state);
      toast.success(`Relay turned ${state ? "ON" : "OFF"}`);
    } catch (error) {
      console.error("Error setting relay:", error);
      toast.error("Failed to control relay");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Header 
        mode={mode} 
        onModeChange={handleModeChange}
        isConnected={isConnected}
        lastUpdated={lastUpdated}
      />
      
      <main className="container mx-auto px-6 md:px-12 py-8">
        {mode === "fall" ? (
          <FallDetectionDashboard 
            sensorData={sensorData}
            relayState={relayState}
            onRelayToggle={handleRelayToggle}
          />
        ) : (
          <SleepModeDashboard 
            sensorData={sensorData}
            relayState={relayState}
            onRelayToggle={handleRelayToggle}
          />
        )}
      </main>
    </div>
  );
}