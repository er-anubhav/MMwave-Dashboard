import React from 'react';
import { Clock } from 'lucide-react';

export default function ChartCard({ title, subtitle, footerText, chartBg = "bg-slate-50 dark:bg-background", children }) {
 return (
 <div className="flex flex-col bg-white dark:bg-background shadow-sm border border-gray-200 dark:border-border rounded-2xl h-full overflow-hidden transition-all duration-300 hover:shadow-md">
 <div className="p-6 pb-2">
 <h6 className="text-base text-black dark:text-primary capitalize">
 {title}
 </h6>
 <p className="text-sm text-gray-400 mt-1 mb-4">
 {subtitle}
 </p>
 </div>
 
 <div className="px-6 flex-grow">
 <div className={`relative w-full h-[280px] rounded-xl shadow-inner p-4 ${chartBg}`}>
 {children}
 </div>
 </div>
 
 <div className="p-6 pt-4 mt-auto">
 <div className="flex items-center gap-2 text-sm text-gray-400">
 <Clock className="w-3.5 h-3.5" />
 <span>{footerText}</span>
 </div>
 </div>
 </div>
 );
}
