import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, icon, footerLabel, footerValue, footerColor = "text-emerald-600", iconBg = "bg-gray-100 dark:bg-background", iconColor = "text-gray-900 dark:text-primary", isAlert = false, isActive = false }) {
  const badgeBg = footerColor.includes('emerald') ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                  footerColor.includes('blue') ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                  footerColor.includes('rose') ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400' :
                  footerColor.includes('indigo') ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' :
                  'bg-gray-500/10 text-gray-700 dark:text-gray-400';

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md glass-card ${
        isAlert ? 'border-red-200/50 dark:border-red-500/30 ring-1 ring-red-500/10' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4 z-10">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} ${isActive ? 'ring-2 ring-emerald-500/20' : ''} shadow-sm`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider ">{title}</p>
      </div>
      
      <div className="flex flex-col z-10">
        <h4 className="text-xl  tracking-tight mb-4 text-black dark:text-primary">
          {value}
        </h4>
        
        <div className="flex items-center text-xs">
          <span className={`mr-2 px-2.5 py-0.5 rounded-lg  ${badgeBg}`}>
            {footerValue}
          </span>
          <span className="text-gray-500 dark:text-gray-400 truncate font-medium">{footerLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}
