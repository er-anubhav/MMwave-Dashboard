import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;
const POLL_INTERVAL = 1000;

export default function useDeviceData(selectedDevice) {
  const [mode, setMode] = useState("fall");
  const [sensorData, setSensorData] = useState(null);
  const [relayState, setRelayState] = useState(false);
  const [relayMode, setRelayMode] = useState("manual");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!selectedDevice) {
      setSensorData(null);
      setIsConnected(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/data`, {
          params: { device_id: selectedDevice.device_id }
        });
        const data = response.data;
        
        setMode(data.mode);
        setSensorData(data.sensor_data);
        setRelayState(data.relay);
        setRelayMode(data.relay_mode || "manual");
        setLastUpdated(data.last_updated);
        setIsConnected(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsConnected(false);
        
        if (error.response?.status === 404) {
          setSensorData(null);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const handleModeChange = async (newMode) => {
    if (!selectedDevice) {
      toast.error("No device selected");
      return;
    }

    try {
      await axios.post(`${API}/mode`, { 
        mode: newMode,
        device_id: selectedDevice.device_id
      });
      setMode(newMode);
      toast.success(`Switched to ${newMode === "fall" ? "Fall Detection" : "Sleep Monitoring"} mode`);
    } catch (error) {
      console.error("Error setting mode:", error);
      toast.error(error.response?.data?.detail || "Failed to change mode");
    }
  };

  const handleRelayToggle = async (state) => {
    if (!selectedDevice) {
      toast.error("No device selected");
      return;
    }

    try {
      await axios.post(`${API}/relay`, { 
        relay: state,
        relay_mode: "manual",
        device_id: selectedDevice.device_id
      });
      setRelayState(state);
      setRelayMode("manual");
      toast.success(`Relay turned ${state ? "ON" : "OFF"}`);
    } catch (error) {
      console.error("Error setting relay:", error);
      toast.error("Failed to control relay");
    }
  };

  const handleRelayModeChange = async (newRelayMode) => {
    if (!selectedDevice) {
      toast.error("No device selected");
      return;
    }

    try {
      const response = await axios.post(`${API}/relay`, {
        relay: relayState,
        relay_mode: newRelayMode,
        device_id: selectedDevice.device_id
      });
      setRelayMode(response.data.relay_mode || newRelayMode);
      setRelayState(response.data.relay);
      toast.success(newRelayMode === "auto" ? "Relay Auto mode enabled" : "Relay Manual mode enabled");
    } catch (error) {
      console.error("Error setting relay mode:", error);
      toast.error(error.response?.data?.detail || "Failed to change relay mode");
    }
  };

  return { mode, sensorData, relayState, relayMode, lastUpdated, isConnected, handleModeChange, handleRelayToggle, handleRelayModeChange };
}
