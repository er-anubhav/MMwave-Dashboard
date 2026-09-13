import React, { useState, useCallback, useMemo } from 'react';
import DashboardNavbar from './DashboardNavbar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  const [headerProps, setHeaderPropsState] = useState({ title: "Overview" });

  const setHeaderProps = useCallback((props) => {
    setHeaderPropsState((prev) => {
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky top header: preserved previous header navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <DashboardNavbar {...headerProps} />
        </div>
      </header>

      {/* Main content: comfortable max-w-7xl container matching layout */}
      <main className="mx-auto w-full max-w-7xl flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet context={contextValue} />
      </main>
    </div>
  );
}
