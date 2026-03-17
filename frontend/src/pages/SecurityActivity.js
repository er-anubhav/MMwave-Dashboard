import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import DashboardNavbar from "../components/DashboardNavbar";
import StatCard from "../components/ui/StatCard";
import ChartCard from "../components/ui/ChartCard";
import ActivityChart from "../components/ActivityChart";
import SystemLogsTable from "../components/SystemLogsTable";
import { Card, CardContent } from "../components/ui/card";
import { LinkIcon, Plus, User, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
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

export default function SecurityActivity() {
 const navigate = useNavigate();
 const { selectedDevice, devices = [] } = useDevice();
 const { mode, sensorData, lastUpdated, isConnected, handleModeChange } = useDeviceData(selectedDevice);

 if (devices.length === 0) {
 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 <DashboardNavbar
 mode={mode}
 onModeChange={handleModeChange}
 isConnected={false}
 lastUpdated={null}
 title="Security & Activity"
 />
 <main className="py-8">
 <Card className="rounded-xl border border-gray-100 shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="h-16 w-16 text-gray-300 mb-4" />
 <h3 className="text-base text-gray-900 mb-2">No devices linked</h3>
 <Button onClick={() => navigate("/devices")} className="bg-[#1C1917] hover:bg-[#292524] mt-4">
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
 <DashboardNavbar
 mode={mode}
 onModeChange={handleModeChange}
 isConnected={false}
 lastUpdated={null}
 title="Security & Activity"
 />
 <main className="py-8">
 <Card className="rounded-xl border border-gray-100 shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="h-16 w-16 text-gray-300 mb-4" />
 <h3 className="text-base text-gray-900 mb-2">Select a device</h3>
 </CardContent>
 </Card>
 </main>
 </motion.div>
 );
 }

 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 <DashboardNavbar
 mode={mode}
 onModeChange={handleModeChange}
 isConnected={isConnected}
 lastUpdated={lastUpdated}
 title="Security & Activity"
 />

 <main className="">
 <div className="mb-2 grid gap-2 md:grid-cols-2">
 <StatCard
 title="Presence"
 value={sensorData?.presence ? "Detected" : "None"}
 icon={<User className="w-6 h-6 text-indigo-600" />}
 footerLabel={sensorData?.presence ? (sensorData?.activity ? `Activity score: ${sensorData.activity}` : "Person in room") : "No movement"}
 footerValue={sensorData?.presence ? "Active" : "Clear"}
 footerColor={sensorData?.presence ? "text-emerald-600" : "text-gray-500"}
 iconBg="bg-indigo-50"
 isActive={sensorData?.presence}
 />
 <StatCard
 title="Security Status"
 value={mode === "fall" ? "Armed (Fall Mode)" : "Disarmed"}
 icon={<Shield className="w-6 h-6 text-blue-600" />}
 footerLabel="System monitoring"
 footerValue="Monitoring"
 footerColor="text-blue-600"
 iconBg="bg-blue-50"
 isActive={mode === "fall"}
 />
 </div>

 <div className="mb-2 grid grid-cols-1">
 <ChartCard
 title="Activity History"
 subtitle="Real-time movement tracking"
 footerText="just updated"
 chartBg="bg-indigo-50"
 >
 <ActivityChart currentActivity={sensorData?.activity || 0} />
 </ChartCard>
 </div>

 <div className="grid grid-cols-1">
 <SystemLogsTable />
 </div>
 </main>
 </motion.div>
 );
}
