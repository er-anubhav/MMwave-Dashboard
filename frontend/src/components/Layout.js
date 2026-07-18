import React, { useState, useCallback, useMemo } from 'react';
import Sidenav from './Sidenav';
import DashboardNavbar from './DashboardNavbar';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  const [headerProps, setHeaderPropsState] = useState({ title: "Overview" });

  const setHeaderProps = useCallback((props) => {
    setHeaderPropsState((prev) => {
      // Shallow check to avoid setting state if nothing changed
      const keys = Object.keys(props);
      const prevKeys = Object.keys(prev);
      if (keys.length === prevKeys.length && keys.every(k => prev[k] === props[k])) {
        return prev;
      }
      return props;
    });
  }, []);

  const contextValue = useMemo(() => ({ setHeaderProps }), [setHeaderProps]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background relative isolate overflow-hidden">
      {/* Ambient glowing background orbs */}
      <motion.div 
        animate={{
          x: [0, 15, -15, 0],
          y: [0, -20, 20, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="glow-orb bg-emerald-500 top-[-10%] left-[-10%]" 
      />
      <motion.div 
        animate={{
          x: [0, -20, 20, 0],
          y: [0, 15, -15, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear"
        }}
        className="glow-orb bg-blue-500 bottom-[-10%] right-[-10%]" 
      />

      <Sidenav />
      
      {/* Persistent Static Header */}
      <div className="lg:ml-[266px] p-4 px-4 md:px-8 pb-0 sticky top-0 z-30 bg-transparent">
        <DashboardNavbar {...headerProps} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="p-4 px-4 md:px-8 pt-2 lg:ml-[266px] relative z-10 text-gray-900 dark:text-primary"
      >
        <Outlet context={contextValue} />
      </motion.div>
    </div>
  );
}
