import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useDevice } from "../contexts/DeviceContext";
import Header from "../components/Header";
import FallDetectionDashboard from "../components/FallDetectionDashboard";
import SleepModeDashboard from "../components/SleepModeDashboard";
import { Card, CardContent } from "../components/ui/card";
import { LinkIcon, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const POLL_INTERVAL = 1000; // Poll every 1 second for real-time updates

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedDevice, devices = [] } = useDevice();
  const [mode, setMode] = useState("fall");
  const [sensorData, setSensorData] = useState(null);
  const [relayState, setRelayState] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Poll backend for latest data when device is selected
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
        setLastUpdated(data.last_updated);
        setIsConnected(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsConnected(false);
        
        if (error.response?.status === 404) {
          // Device has no data yet
          setSensorData(null);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    const interval = setInterval(fetchData, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedDevice]);

  const handleModeChange = async (newMode) => {
    console.log('handleModeChange called with:', newMode);
    console.log('selectedDevice:', selectedDevice);
    
    if (!selectedDevice) {
      console.error('No device selected');
      toast.error("No device selected");
      return;
    }

    try {
      console.log('Posting to:', `${API}/mode`);
      console.log('Payload:', { mode: newMode, device_id: selectedDevice.device_id });
      
      const response = await axios.post(`${API}/mode`, { 
        mode: newMode,
        device_id: selectedDevice.device_id
      });
      
      console.log('Mode change response:', response.data);
      setMode(newMode);
      toast.success(`Switched to ${newMode === "fall" ? "Fall Detection" : "Sleep Monitoring"} mode`);
    } catch (error) {
      console.error("Error setting mode:", error);
      console.error("Error response:", error.response?.data);
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
        device_id: selectedDevice.device_id
      });
      setRelayState(state);
      toast.success(`Relay turned ${state ? "ON" : "OFF"}`);
    } catch (error) {
      console.error("Error setting relay:", error);
      toast.error("Failed to control relay");
    }
  };

  // Show device selection prompt if no devices
  if (devices.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <Header 
          mode={mode} 
          onModeChange={handleModeChange}
          isConnected={false}
          lastUpdated={null}
        />
        
        <main className="container mx-auto px-6 md:px-12 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LinkIcon className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg  mb-2">No devices linked</h3>
              <p className="text-gray-600 text-center mb-6">
                Link your first MMWave device to start monitoring
              </p>
              <Button onClick={() => navigate("/devices")}>
                <Plus className="h-4 w-4 mr-2" />
                Go to Device Management
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show device selection prompt if device selected but no data
  if (!selectedDevice) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <Header 
          mode={mode} 
          onModeChange={handleModeChange}
          isConnected={false}
          lastUpdated={null}
        />
        
        <main className="container mx-auto px-6 md:px-12 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LinkIcon className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg  mb-2">Select a device</h3>
              <p className="text-gray-600 text-center">
                Use the device selector in the header to choose which device to monitor
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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