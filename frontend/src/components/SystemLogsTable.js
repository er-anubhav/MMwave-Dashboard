import React from 'react';
import { Card } from './ui/card';
import { CheckCircle2, MoreVertical, Activity, AlertTriangle, Moon, Info } from 'lucide-react';

export default function SystemLogsTable({ logs = [] }) {
 // If no logs are provided, use dummy data
 const defaultLogs = [
 { id: 1, event: 'Fall Detected', type: 'alert', time: '10 mins ago', status: 'Resolved' },
 { id: 2, event: 'System Online', type: 'info', time: '1 hour ago', status: 'Active' },
 { id: 3, event: 'Sleep Mode Engaged', type: 'mode', time: 'Yesterday', status: 'Completed' },
 { id: 4, event: 'Relay Turned ON', type: 'action', time: 'Yesterday', status: 'Success' },
 ];

 const displayLogs = logs.length > 0 ? logs : defaultLogs;

 const getIcon = (type) => {
 switch (type) {
 case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
 case 'mode': return <Moon className="w-4 h-4 text-purple-500" />;
 case 'action': return <Activity className="w-4 h-4 text-green-500" />;
 case 'info': return <Info className="w-4 h-4 text-blue-500" />;
 default: return <CheckCircle2 className="w-4 h-4 text-gray-500" />;
 }
 };

 return (
 <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white h-full">
 <div className="p-6 border-b border-gray-100 flex justify-between items-center">
 <div>
 <h6 className="text-base text-black">
 System Logs
 </h6>
 <p className="flex items-center gap-1 text-sm text-gray-500 mt-1 ">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
 <span>All systems nominal</span>
 </p>
 </div>
 <button className="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-lg">
 <MoreVertical className="w-5 h-5" />
 </button>
 </div>
 <div className="p-0 overflow-x-auto">
 <table className="w-full min-w-[640px] table-auto text-left">
 <thead>
 <tr>
 <th className="border-b border-gray-100/50 py-4 px-6">
 <p className="text-sm uppercase text-gray-400">Event</p>
 </th>
 <th className="border-b border-gray-100/50 py-4 px-6">
 <p className="text-sm uppercase text-gray-400">Time</p>
 </th>
 <th className="border-b border-gray-100/50 py-4 px-6">
 <p className="text-sm uppercase text-gray-400">Status</p>
 </th>
 </tr>
 </thead>
 <tbody>
 {displayLogs.map((log, key) => {
 const className = `py-4 px-6 ${key === displayLogs.length - 1 ? "" : "border-b border-gray-50"}`;

 return (
 <tr key={log.id} className="hover:bg-white/50 transition-colors group">
 <td className={className}>
 <div className="flex items-center gap-4">
 <div className="rounded-xl p-2.5 bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
 {getIcon(log.type)}
 </div>
 <p className="text-sm text-black">
 {log.event}
 </p>
 </div>
 </td>
 <td className={className}>
 <p className="text-sm text-gray-500">
 {log.time}
 </p>
 </td>
 <td className={className}>
 <div className="w-full">
 <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-gray-100 text-gray-700">
 {log.status}
 </p>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </Card>
 );
}
