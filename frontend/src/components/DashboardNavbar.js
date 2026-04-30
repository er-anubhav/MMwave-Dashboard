import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Moon, ChevronDown, Settings, LogOut, Link as LinkIcon, User, Bell, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useDevice } from "../contexts/DeviceContext";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardNavbar({ mode, onModeChange, isConnected, lastUpdated, title = "Overview" }) {
 const { user, logout } = useAuth();
 const { devices, selectedDevice, selectDevice } = useDevice();
 const navigate = useNavigate();
 const [recentNotifications, setRecentNotifications] = useState([]);

 useEffect(() => {
 let isMounted = true;

 const loadRecentNotifications = async () => {
 try {
 const response = await axios.get(`${API}/notifications/history`, {
 params: selectedDevice ? { device_id: selectedDevice.device_id, limit: 5 } : { limit: 5 }
 });
 if (isMounted) {
 setRecentNotifications(response.data?.notifications || []);
 }
 } catch (error) {
 if (isMounted) {
 setRecentNotifications([]);
 }
 }
 };

 loadRecentNotifications();
 const interval = setInterval(loadRecentNotifications, 15000);
 return () => {
 isMounted = false;
 clearInterval(interval);
 };
 }, [selectedDevice]);

 const handleModeChangeClick = (newMode) => {
 if (typeof onModeChange === 'function') {
 onModeChange(newMode);
 }
 };

 const handleLogout = () => {
 logout();
 navigate("/login");
 };

 const getNotificationTone = (item) => {
 const severity = item.metadata?.severity;
 if (severity === "critical") {
 return "text-red-600 bg-red-500";
 }
 if (severity === "test") {
 return "text-blue-600 bg-blue-500";
 }
 return "text-gray-900 bg-emerald-500";
 };

 return (
 <nav className="flex flex-col-reverse justify-between mb-2 gap-2 md:flex-row md:items-center py-2 bg-white rounded-xl px-6 border border-gray-200 shadow-sm z-40">
 {/* Breadcrumbs and Title */}
 <div className="capitalize">
 <nav aria-label="breadcrumb" className="w-max">
 <ol className="flex w-full flex-wrap items-center rounded-md bg-opacity-60 py-2">
 <li className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
 <span>Dashboard</span>
 <span className="mx-2 text-gray-400">/</span>
 </li>
 <li className="flex items-center text-sm text-gray-900">
 {title}
 </li>
 </ol>
 </nav>
 <div className="flex items-center gap-3">
 <h6 className="text-base text-black">
 {title}
 </h6>
 <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-50' : 'bg-gray-100'} border ${isConnected ? 'border-emerald-100' : 'border-gray-200'}`}>
 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
 <span className="text-sm uppercase text-gray-500">
 {isConnected ? 'LIVE' : 'WAITING'}
 </span>
 </div>
 </div>
 </div>

 {/* Right Side Controls */}
 <div className="flex items-center gap-4">
 {/* Device Selector */}
 {devices.length > 0 && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="flex items-center gap-2 text-sm text-gray-700 transition-all hover:bg-gray-50 py-2 px-4 rounded-lg border border-gray-200 bg-white shadow-sm">
 <LinkIcon size={16} className="text-gray-400" />
 <span className="hidden lg:inline-block truncate max-w-[140px]">
 {selectedDevice ? selectedDevice.name : "Select Device"}
 </span>
 <ChevronDown size={14} className="text-gray-400" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-2 z-[100]">
 <DropdownMenuLabel className=" text-gray-900 px-2 pb-2">Your Devices</DropdownMenuLabel>
 <DropdownMenuSeparator className="bg-gray-100" />
 {devices.map((device) => (
 <DropdownMenuItem
 key={device.device_id}
 onClick={() => selectDevice(device)}
 className={`rounded-lg cursor-pointer my-1 ${selectedDevice?.device_id === device.device_id ? "bg-emerald-50 text-emerald-700 " : "text-gray-700 hover:bg-gray-50"}`}
 >
 <div className="flex items-center justify-between w-full">
 <span>{device.name}</span>
 <span className={`ml-2 w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'
 }`}></span>
 </div>
 </DropdownMenuItem>
 ))}
 <DropdownMenuSeparator className="bg-gray-100" />
 <DropdownMenuItem onClick={() => navigate("/devices")} className="rounded-lg cursor-pointer text-gray-600 hover:text-gray-900 mt-1">
 Manage Devices
 <Settings className="w-4 h-4 ml-auto" />
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 )}

 {/* Mode Toggle */}
 {selectedDevice && (
 <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
 <button
 onClick={() => handleModeChangeClick("fall")}
 className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all text-sm ${mode === "fall" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-500 hover:text-gray-700"
 }`}
 >
 <Activity size={16} className={mode === "fall" ? "text-emerald-500" : ""} />
 <span className="hidden xl:inline-block">Fall Mode</span>
 </button>
 <button
 onClick={() => handleModeChangeClick("sleep")}
 className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all text-sm ${mode === "sleep" ? "bg-white text-gray-900 shadow-sm border border-gray-200/50" : "text-gray-500 hover:text-gray-700"
 }`}
 >
 <Moon size={16} className={mode === "sleep" ? "text-emerald-500" : ""} />
 <span className="hidden xl:inline-block">Sleep Mode</span>
 </button>
 </div>
 )}

 {/* User Menu */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-600 transition-all hover:bg-gray-50">
 <User className="w-5 h-5" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56 rounded-xl bg-white border border-gray-200 shadow-lg p-2 z-[100]">
 <DropdownMenuLabel>
 <div className="flex flex-col text-left">
 <p className=" text-black">{user?.name || "User"}</p>
 <p className="text-sm text-gray-500 ">{user?.email}</p>
 </div>
 </DropdownMenuLabel>
 <DropdownMenuSeparator className="bg-gray-100" />
 <DropdownMenuItem onClick={() => navigate("/devices")} className="rounded-lg cursor-pointer hover:bg-gray-50 text-gray-700 ">
 <Settings className="w-4 h-4 mr-2" />
 Settings
 </DropdownMenuItem>
 <DropdownMenuSeparator className="bg-gray-100" />
 <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer hover:bg-red-50 text-red-600 ">
 <LogOut className="w-4 h-4 mr-2" />
 Logout
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-600 transition-all hover:bg-gray-50">
 <Bell className="w-5 h-5" />
 {recentNotifications.length > 0 && (
 <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border border-white rounded-full"></span>
 )}
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-80 rounded-xl bg-white border border-gray-200 shadow-lg p-2 z-[100] mt-2">
 <DropdownMenuLabel className=" text-gray-900 px-2 py-1 flex justify-between items-center">
 <span>Notifications</span>
 <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{recentNotifications.length} Recent</span>
 </DropdownMenuLabel>
 <DropdownMenuSeparator className="bg-gray-100" />
 <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto mt-1">
 {recentNotifications.length === 0 ? (
 <div className="flex flex-col items-center justify-center gap-2 p-5 text-center text-gray-500">
 <AlertCircle className="w-5 h-5 text-gray-400" />
 <span className="text-sm">No notification activity yet</span>
 </div>
 ) : recentNotifications.map((item) => {
 const tone = getNotificationTone(item);
 return (
 <DropdownMenuItem key={item.id} className="flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-700">
 <div className="flex items-center justify-between w-full">
 <span className={`text-sm ${tone.split(" ")[0]}`}>{item.event}</span>
 <span className={`w-2 h-2 rounded-full ${tone.split(" ")[1]}`}></span>
 </div>
 <span className="text-xs text-gray-500 mt-0.5">
 {(item.metadata?.provider_name || item.metadata?.provider || "Provider")} · {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : "just now"}
 </span>
 </DropdownMenuItem>
 );
 })}
 </div>
 <DropdownMenuSeparator className="bg-gray-100 mb-1" />
 <div className="px-2 pt-1 pb-1 space-y-1">
 <button
 className="w-full text-center text-sm text-emerald-600 hover:text-emerald-700 py-1 transition-colors"
 onClick={() => navigate("/notifications")}
 >
 View Notification Activity
 </button>
 <button
 className="w-full text-center text-sm text-gray-500 hover:text-gray-900 py-1 transition-colors flex items-center justify-center gap-1 border-t border-gray-50 mt-1 pt-1.5"
 onClick={() => navigate("/notifications")}
 >
 <Settings className="w-3.5 h-3.5" />
 Configure Alerts
 </button>
 </div>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </nav>
 );
}
