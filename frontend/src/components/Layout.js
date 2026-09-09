import React, { useState, useCallback, useMemo } from 'react';
import Sidenav from './Sidenav';
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
    <div className="min-h-screen bg-background">
      {/* Full-width top header: brand + live device identity */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <DashboardNavbar {...headerProps} />
        </div>
      </header>

      {/* Content shell: floating nav card + page content */}
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[236px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Sidenav />
          </aside>

          <main className="min-w-0">
            <Outlet context={contextValue} />
          </main>
        </div>
      </div>
    </div>
  );
}
