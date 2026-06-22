import React from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Moon, ChevronDown, Link as LinkIcon, Plus } from "lucide-react";
import { useDevice } from "../contexts/DeviceContext";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function DashboardNavbar({ mode, onModeChange, isConnected, lastUpdated, title = "Overview" }) {
 const { devices, selectedDevice, selectDevice } = useDevice();
 const navigate = useNavigate();

 const handleModeChangeClick = (newMode) => {
 if (typeof onModeChange === 'function') {
 onModeChange(newMode);
 }
 };

 return (
 <nav className="flex flex-col-reverse justify-between mb-4 gap-2 md:flex-row md:items-center py-3.5 px-0 z-40 bg-transparent">
 {/* Breadcrumbs and Title */}
 <div className="capitalize">
 <nav aria-label="breadcrumb" className="w-max">
 <ol className="flex w-full flex-wrap items-center rounded-md bg-opacity-60 py-2">
 <li className="flex items-center text-sm text-white hover:text-gray-800 dark:text-white dark:hover:text-zinc-200 transition-colors cursor-pointer">
 <span>LYFSense</span>
 <span className="mx-2 text-white dark:text-white">/</span>
 </li>
 <li className="flex items-center text-sm text-gray-900 dark:text-zinc-200">
 {title}
 </li>
 </ol>
 </nav>
 <div className="flex items-center gap-3">
 <h6 className="text-base text-black dark:text-primary">
  {title}
  </h6>
  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-500/10' : 'bg-gray-100 dark:bg-background'} border ${isConnected ? 'border-emerald-500/20' : 'border-gray-200 dark:border-border'}`}>
  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 dark:bg-primary dark:text-black animate-pulse' : 'bg-gray-400'}`}></div>
  <span className="text-xs text-white">
 {isConnected ? 'LIVE' : 'WAITING'}
 </span>
 </div>
 </div>
 </div>

 {/* Right Side Controls */}
 <div className="flex items-center gap-4">
 {/* Device Selector */}
  {devices.length > 0 && (
  <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 transition-all py-2 px-4 rounded-xl border border-gray-200 dark:border-border bg-white/50 dark:bg-background/50 hover:bg-white dark:hover:bg-background/80 shadow-sm">
          <LinkIcon size={16} className="text-gray-400" />
          <span className="hidden lg:inline-block truncate max-w-[140px]">
            {selectedDevice ? selectedDevice.name : "Select Device"}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-none border border-gray-200 bg-white shadow-lg p-2 z-[100]">
        <DropdownMenuLabel className="text-gray-900 dark:text-zinc-200 px-2 pb-2">
          Your Devices
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-100" />
        {devices.map((device) => (
          <DropdownMenuItem
            key={device.device_id}
            onClick={() => selectDevice(device)}
            className={`rounded-none cursor-pointer my-1 ${selectedDevice?.device_id === device.device_id ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50"}`}
          >
            <div className="flex items-center justify-between w-full">
              <span>{device.name}</span>
              <span className={`ml-2 w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gray-100" />
      </DropdownMenuContent>
    </DropdownMenu>

    <button
      onClick={() => navigate("/devices")}
      className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-border bg-white/50 dark:bg-background/50 hover:bg-white dark:hover:bg-background/80 shadow-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-primary transition-colors shrink-0"
      title="Add Device"
    >
      <Plus size={16} />
    </button>
  </div>
  )}

 {/* Mode Toggle */}
 {selectedDevice && (
 <div className="flex items-center bg-gray-50/50 dark:bg-background/50 border border-gray-200 dark:border-border rounded-xl p-1">
 <button
 onClick={() => handleModeChangeClick("fall")}
 className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-sm ${mode === "fall" ? "bg-white dark:bg-background text-gray-900 dark:text-primary shadow-sm border border-gray-200/30 dark:border-border/30" : "text-gray-500 hover:text-gray-700 dark:text-zinc-300"
 }`}
 >
 <Activity size={16} className={mode === "fall" ? "text-emerald-500" : ""} />
 <span className="hidden xl:inline-block">Fall Mode</span>
 </button>
 <button
 onClick={() => handleModeChangeClick("sleep")}
 className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-sm ${mode === "sleep" ? "bg-white dark:bg-background text-gray-900 dark:text-primary shadow-sm border border-gray-200/30 dark:border-border/30" : "text-gray-500 hover:text-gray-700 dark:text-zinc-300"
 }`}
 >
 <Moon size={16} className={mode === "sleep" ? "text-emerald-500" : ""} />
 <span className="hidden xl:inline-block">Sleep Mode</span>
 </button>
 </div>
 )}
 </div>
 </nav>
 );
}
