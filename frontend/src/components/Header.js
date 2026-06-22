import React from "react";
import { Activity, Moon, ChevronDown, Settings, LogOut, Link as LinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useDevice } from "../contexts/DeviceContext";
import { useNavigate } from "react-router-dom";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

export default function Header({ mode, onModeChange, isConnected, lastUpdated }) {
 const { user, logout } = useAuth();
 const { devices, selectedDevice, selectDevice } = useDevice();
 const navigate = useNavigate();

 // Defensive check for onModeChange function
 const safeOnModeChange = typeof onModeChange === 'function' 
 ? onModeChange
 : (newMode) => console.warn('onModeChange handler not provided', newMode);

 const handleModeChangeClick = (newMode) => {
 safeOnModeChange(newMode);
 };

 const handleLogout = () => {
 logout();
 navigate("/login");
 };

 return (
 <header className="sticky top-0 z-50 bg-white dark:bg-background/80 backdrop-blur-md border-b border-[#E7E5E4]">
 <div className="container px-6 py-6 mx-auto md:px-12">
 <div className="flex items-center justify-between">
 {/* Logo */}
 <div>
 <h1 className="text-base tracking-tight text-black dark:text-primary">
 LYFSense Smart Switch
 </h1>
 <p className="text-sm text-[#78716C] font-mono mt-1">
 {lastUpdated ? `Updated ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}` : "Waiting for data..."}
 </p>
 </div>

 {/* Right Side Controls */}
 <div className="flex items-center gap-4">
 {/* Device Selector */}
 {devices.length > 0 && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="outline" className="gap-2">
 <LinkIcon size={16} />
 <span className="hidden md:inline">
 {selectedDevice ? selectedDevice.name : "Select Device"}
 </span>
 <ChevronDown size={16} />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56">
 <DropdownMenuLabel>Your Devices</DropdownMenuLabel>
 <DropdownMenuSeparator />
 {devices.map((device) => (
 <DropdownMenuItem
 key={device.device_id}
 onClick={() => selectDevice(device)}
 className={selectedDevice?.device_id === device.device_id ? "bg-accent" : ""}
 >
 <div className="flex items-center justify-between w-full">
 <span>{device.name}</span>
 <span className={`ml-2 w-2 h-2 rounded-full ${
 device.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
 }`}></span>
 </div>
 </DropdownMenuItem>
 ))}
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={() => navigate("/devices")}>
 Manage Devices
 <Settings className="w-4 h-4 mr-2" />
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 )}

 {/* Connection Status */}
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${
 isConnected ? "bg-[#16A34A]" : "bg-[#DC2626]"
 }`}></div>
 <span className="text-sm text-[#78716C] hidden md:inline">
 {isConnected ? "Connected" : "Disconnected"}
 </span>
 </div>

 {/* Mode Toggle */}
 {selectedDevice && (
 <div className="flex border border-[#E7E5E4] bg-white dark:bg-background">
 <button
 data-testid="fall-mode-button"
 onClick={() => handleModeChangeClick("fall")}
 className={`flex items-center gap-2 px-6 py-3 transition-colors ${
 mode === "fall" 
 ? "bg-primary dark:text-black text-white" 
 : "bg-white dark:bg-background text-[#78716C] hover:bg-[#F5F5F4]"
 }`}
 >
 <Activity size={18} strokeWidth={1.5} />
 <span className="hidden text-sm lg:inline">Fall Detection</span>
 </button>
 <button
 data-testid="sleep-mode-button"
 onClick={() => handleModeChangeClick("sleep")}
 className={`flex items-center gap-2 px-6 py-3 transition-colors ${
 mode === "sleep" 
 ? "bg-primary dark:text-black text-white" 
 : "bg-white dark:bg-background text-[#78716C] hover:bg-[#F5F5F4]"
 }`}
 >
 <Moon size={18} strokeWidth={1.5} />
 <span className="hidden text-sm lg:inline">Sleep Monitoring</span>
 </button>
 </div>
 )}

 {/* User Menu */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" className="gap-2">
 <div className="w-8 h-8 rounded-full bg-primary dark:text-black text-white flex items-center justify-center text-sm">
 {user?.name?.charAt(0).toUpperCase() || "U"}
 </div>
 <ChevronDown size={16} />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56">
 <DropdownMenuLabel>
 <div>
 <p className="">{user?.name}</p>
 <p className="text-sm text-gray-500">{user?.email}</p>
 </div>
 </DropdownMenuLabel>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={() => navigate("/devices")}>
 <Settings className="w-4 h-4 mr-2" />
 Device Management
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={handleLogout}>
 <LogOut className="w-4 h-4 mr-2" />
 Logout
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>
 </div>
 </header>
 );
}