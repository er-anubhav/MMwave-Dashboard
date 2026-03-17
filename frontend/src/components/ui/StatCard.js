import React from 'react';

export default function StatCard({ title, value, icon, footerLabel, footerValue, footerColor = "text-emerald-600", iconBg = "bg-gray-100", iconColor = "text-gray-900", isAlert = false, isActive = false }) {
 return (
 <div className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:shadow-md bg-white border ${
 isAlert ? 'border-red-200' : 'border-gray-200'
 }`}>
 <div className="flex items-center justify-between mb-4 z-10">
 <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-emerald-600 ${iconBg} ${isActive ? 'ring-2 ring-emerald-500/20' : ''}`}>
 {icon}
 </div>
 <p className="text-sm text-gray-400 uppercase tracking-wider">{title}</p>
 </div>
 
 <div className="flex flex-col z-10">
 <h4 className={`text-base mb-4 text-black`}>
 {value}
 </h4>
 
 <div className="flex items-center text-sm">
 <span className={` mr-2 px-2 py-0.5 rounded-md ${footerColor} ${footerColor.replace('text-', 'bg-').replace('600', '50').replace('500', '50')}`}>
 {footerValue}
 </span>
 <span className="text-gray-500 truncate text-sm">{footerLabel}</span>
 </div>
 </div>
 </div>
 );
}
