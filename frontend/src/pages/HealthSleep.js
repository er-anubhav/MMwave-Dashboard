import { useEffect } from "react";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import StatCard from "../components/ui/StatCard";
import ChartCard from "../components/ui/ChartCard";
import VitalsChart from "../components/VitalsChart";
import { Card, CardContent } from "../components/ui/card";
import { LinkIcon, Plus, Heart, Wind, Flame } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate, useOutletContext } from "react-router-dom";
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

export default function HealthSleep() {
  const { setHeaderProps } = useOutletContext();
 const navigate = useNavigate();
 const { selectedDevice, devices = [] } = useDevice();
 const { mode, sensorData, lastUpdated, isConnected, handleModeChange } = useDeviceData(selectedDevice);


  useEffect(() => {
    setHeaderProps({
      title: "Health & Sleep",
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
 <Card className="rounded-xl border border-gray-100 dark:border-border shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="h-16 w-16 text-gray-300 dark:text-primary mb-4" />
 <h3 className="text-base text-gray-900 dark:text-primary mb-2">No devices linked</h3>
 <Button onClick={() => navigate("/devices")} className="bg-primary dark:text-black hover:bg-primary/90 mt-4">
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
 <Card className="rounded-xl border border-gray-100 dark:border-border shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="h-16 w-16 text-gray-300 dark:text-primary mb-4" />
 <h3 className="text-base text-gray-900 dark:text-primary mb-2">Select a device</h3>
 <p className="text-gray-600 dark:text-gray-400 text-center">
 Use the device selector in the header to choose which device to monitor
 </p>
 </CardContent>
 </Card>
 </main>
 </motion.div>
 );
 }

 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 

 <main className="">
 <div className="mb-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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
 <StatCard
 title="Sleep Quality"
 value={sensorData?.sleep?.score || "N/A"}
 icon={<Flame className="w-6 h-6 text-orange-600" />}
 footerLabel={"Nightly score"}
 footerValue={"Processing"}
 footerColor={"text-orange-600"}
 iconBg="bg-orange-50"
 />
 </div>

 <div className="grid grid-cols-1">
 <ChartCard
 title="Vitals Trends"
 subtitle="Heart rate and respiration tracking over time"
 footerText="just updated"
 chartBg="bg-slate-50 dark:bg-background"
 >
 <VitalsChart
 currentHeartRate={sensorData?.sleep?.heart_rate}
 currentRespiration={sensorData?.sleep?.respiration}
 />
 </ChartCard>
 </div>
 </main>
 </motion.div>
 );
}
