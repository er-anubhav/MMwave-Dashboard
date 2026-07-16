import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import StatCard from "../components/ui/StatCard";
import RelayControl from "../components/RelayControl";
import { Card, CardContent } from "../components/ui/card";
import { LinkIcon, Plus, User, Settings2, Heart, Wind } from "lucide-react";
import { Button } from "../components/ui/button";
import VitalsChart from "../components/VitalsChart";
import ActivityChart from "../components/ActivityChart";
import { motion } from "framer-motion";

const pageVariants = {
 initial: { opacity: 0, y: 10 },
 in: { opacity: 1, y: 0 },
 out: { opacity: 0, y: -10 }
};

const pageTransition = {
 type: "tween",
 ease: "anticipate",
 duration: 0.3
};

export default function Dashboard() {
  const { setHeaderProps } = useOutletContext();
 const navigate = useNavigate();
 const { selectedDevice, devices = [] } = useDevice();
 const { mode, sensorData, relayState, relayMode, lastUpdated, isConnected, handleModeChange, handleRelayToggle, handleRelayModeChange } = useDeviceData(selectedDevice);


  useEffect(() => {
    setHeaderProps({
      title: "Overview",
      mode,
      onModeChange: handleModeChange,
      isConnected,
      lastUpdated
    });
  }, [mode, handleModeChange, isConnected, lastUpdated, setHeaderProps]);

 if (devices.length === 0) {
 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 
 <main className="py-8">
 <Card className="rounded-xl border border-gray-100 shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="h-16 w-16 text-gray-300 mb-4" />
 <h3 className="text-base text-gray-900 mb-2">No devices linked</h3>
 <p className="text-gray-600 text-center mb-6">
 Link your first device to start monitoring
 </p>
 <Button onClick={() => navigate("/devices")} className="bg-[#1C1917] hover:bg-[#292524]">
 <Plus className="h-4 w-4 mr-2" />
 Go to Device Management
 </Button>
 </CardContent>
 </Card>
 </main>
 </motion.div>
 );
 }

 if (!selectedDevice) {
 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 
 <main className="py-8">
 <Card className="rounded-xl border border-gray-100 shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="h-16 w-16 text-gray-300 mb-4" />
 <h3 className="text-base text-gray-900 mb-2">Select a device</h3>
 <p className="text-gray-600 text-center">
 Use the device selector in the header to choose which device to monitor
 </p>
 </CardContent>
 </Card>
 </main>
 </motion.div>
 );
 }

  const isStd = selectedDevice?.name?.toUpperCase().includes("STD");

 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 
 
 <main className="">
 {/* Simplified Status Cards for Overview */}
 <div className="mb-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
 <StatCard
 title="Presence"
 value={sensorData?.presence ? "Detected" : "None"}
 icon={<User className="w-6 h-6 text-emerald-600" />}
 footerLabel={sensorData?.presence ? (sensorData?.activity ? `Activity score: ${sensorData.activity}` : "Person in room") : "No movement"}
 footerValue={sensorData?.presence ? "Active" : "Clear"}
 footerColor={sensorData?.presence ? "text-emerald-600" : "text-gray-500"}
 iconBg="bg-emerald-50"
 isActive={sensorData?.presence}
 />
 <StatCard
 title="Radar Mode"
 value={mode === "sleep" ? "Sleep Mode" : "Fall Mode"}
 icon={<Settings2 className="w-6 h-6 text-emerald-600" />}
 footerLabel={`Relay is ${relayState ? "ON" : "OFF"}`}
 footerValue={relayMode === "auto" ? "AUTO" : mode.toUpperCase()}
 footerColor="text-emerald-600"
 iconBg="bg-emerald-50"
 isActive={relayState || relayMode === "auto"}
 />
 {!isStd && (
    <>
      <StatCard
      title="Heart Rate"
      value={sensorData?.sleep?.heart_rate ? `${sensorData.sleep.heart_rate} bpm` : "N/A"}
      icon={<Heart className="w-6 h-6 text-rose-600" />}
      footerLabel={sensorData?.sleep?.heart_rate ? "Current rate" : "Requires Sleep Mode"}
      footerValue={sensorData?.sleep?.heart_rate ? "Live" : "Waiting"}
      footerColor={sensorData?.sleep?.heart_rate ? "text-rose-600" : "text-gray-500"}
      iconBg="bg-rose-50"
      isActive={!!sensorData?.sleep?.heart_rate}
      />
      <StatCard
      title="Respiration"
      value={sensorData?.sleep?.respiration ? `${sensorData.sleep.respiration} bpm` : "N/A"}
      icon={<Wind className="w-6 h-6 text-emerald-600" />}
      footerLabel={sensorData?.sleep?.respiration ? "Current rate" : "Requires Sleep Mode"}
      footerValue={sensorData?.sleep?.respiration ? "Live" : "Waiting"}
      footerColor={sensorData?.sleep?.respiration ? "text-emerald-600" : "text-gray-500"}
      iconBg="bg-emerald-50"
      isActive={!!sensorData?.sleep?.respiration}
      />
    </>
  )}
 </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
  <div className="col-span-1 self-start">
  <RelayControl relayState={relayState} relayMode={relayMode} onToggle={handleRelayToggle} onModeChange={handleRelayModeChange} />
  </div>
  <div className="col-span-1 lg:col-span-2 grid gap-2 grid-cols-1 md:grid-cols-2">
  {!isStd && (
    <Card className="rounded-xl border border-gray-200 dark:border-border shadow-sm overflow-hidden h-full flex flex-col cursor-pointer transition-all hover:shadow-md hover:border-emerald-500/30 group glass-card" onClick={() => navigate("/health")}>
    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 dark:bg-background/20 group-hover:bg-emerald-500/5 transition-colors">
    <h3 className="text-gray-900 dark:text-zinc-200 text-sm">Vitals Preview</h3>
    <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/10">Click to expand</span>
    </div>
    <div className="flex-1 p-4 relative h-[250px] pointer-events-none">
    <VitalsChart 
    currentHeartRate={sensorData?.sleep?.heart_rate} 
    currentRespiration={sensorData?.sleep?.respiration} 
    />
    </div>
    </Card>
  )}
  
  <Card className={`rounded-xl border border-gray-200 dark:border-border shadow-sm overflow-hidden h-full flex flex-col cursor-pointer transition-all hover:shadow-md hover:border-emerald-500/30 group glass-card ${isStd ? "md:col-span-2" : ""}`} onClick={() => navigate("/security")}>
   <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 dark:bg-background/20 group-hover:bg-emerald-500/5 transition-colors">
   <h3 className="text-gray-900 dark:text-zinc-200 text-sm">Activity Preview</h3>
   <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/10">Click to expand</span>
   </div>
  <div className="flex-1 p-4 relative h-[250px] pointer-events-none">
  <ActivityChart 
  currentActivity={sensorData?.activity} 
  currentPresence={sensorData?.presence} 
  />
  </div>
  </Card>
  </div>
  </div>
 </main>
 </motion.div>
 );
}
