import React, { useState, useCallback, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  Bell,
  Settings,
  LogOut,
  Plus,
  Radio,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { devices } = useDevice();
  const [selectedSpace, setSelectedSpace] = useState('All Spaces');
  const [headerProps, setHeaderPropsState] = useState({ title: 'Overview' });

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Compute unique rooms from linked devices for the location selector
  const availableRooms = useMemo(() => {
    const rooms = new Set(['All Spaces', 'Home', 'Office']);
    devices.forEach((d) => {
      if (d.room) rooms.add(d.room);
      if (d.name) {
        // extract room name if in device name (e.g. "Living Room Sense")
        const match = d.name.match(/(Living Room|Bedroom|Kitchen|Office|Hall|Master)/i);
        if (match) rooms.add(match[0]);
      }
    });
    return Array.from(rooms);
  }, [devices]);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Devices', path: '/devices', icon: LayoutGrid },
    { name: 'Activity', path: '/notifications', icon: Bell },
    { name: 'Settings', path: '/profile', icon: Settings },
  ];

  const isPathActive = (itemPath) => {
    if (itemPath === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === itemPath;
  };

  const contextValue = useMemo(() => ({
    setHeaderProps,
    selectedSpace,
    setSelectedSpace
  }), [setHeaderProps, selectedSpace]);

  // Online devices indicator
  const onlineCount = useMemo(() => {
    return devices.filter((d) => d.status === 'online').length;
  }, [devices]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 bg-card border-r border-border/80 px-4 py-6 z-40 select-none">
        {/* Brandmark & Title */}
        <div className="flex items-center gap-3 px-2 pb-6 border-b border-border/60">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <b className="block text-base font-semibold tracking-tight text-foreground">
              BlareX Sense
            </b>
            <span className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Smart Presence
            </span>
          </div>
        </div>

        {/* Navigation Group */}
        <nav className="flex-1 py-6 space-y-1.5">
          {navItems.map(({ name, path, icon: Icon }) => {
            const active = isPathActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Icon size={18} className={active ? 'text-primary-foreground' : 'text-muted-foreground'} />
                <span>{name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="pt-4 mt-auto border-t border-border/60 text-xs text-muted-foreground space-y-2">
          <div>
            <b className="text-foreground font-semibold">BlareX Sense V1</b>
            <p className="text-[11px] text-muted-foreground/90 leading-relaxed mt-0.5">
              Presence • Relay Control • Alerts
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>Cloud connected ({onlineCount} online)</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-xs font-normal text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2 mt-2"
          >
            <LogOut size={14} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border/80 bg-card/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Mobile Brand / Left Space Selector */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Brand Logo */}
            <div className="flex items-center gap-2 lg:hidden mr-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                <Radio size={16} />
              </div>
              <span className="font-semibold text-sm tracking-tight text-foreground hidden sm:inline">
                BlareXSense
              </span>
            </div>

            {/* Location / Space Selector */}
            <div className="flex items-center gap-2 bg-secondary/50 border border-border/70 rounded-xl px-2.5 py-1 text-xs font-medium text-foreground">
              <MapPin size={14} className="text-primary shrink-0" />
              <select
                value={selectedSpace}
                onChange={(e) => setSelectedSpace(e.target.value)}
                className="bg-transparent border-0 font-medium text-foreground text-xs focus:outline-none cursor-pointer pr-1"
                aria-label="Filter by space"
              >
                {availableRooms.map((room) => (
                  <option key={room} value={room} className="bg-card text-foreground">
                    {room}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notifications Shortcut */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-xl border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground relative"
              title="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
            </Button>

            {/* Quick Add Device Shortcut */}
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/devices')}
              className="h-9 px-3 rounded-xl font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90 hidden sm:flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>Add Device</span>
            </Button>

            {/* User Profile Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer select-none"
                  aria-label="User account menu"
                >
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BX'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 bg-card border-border shadow-lg">
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">{user?.name || 'BlareX User'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.email || 'user@blarexsense.com'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-border/60" />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg text-xs">
                  <Settings size={14} className="mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/notifications')} className="cursor-pointer rounded-lg text-xs">
                  <Bell size={14} className="mr-2" />
                  Alerts & Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border/60" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut size={14} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1440px] w-full mx-auto pb-24 lg:pb-8">
          <Outlet context={contextValue} />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (matches prototype layout) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border grid grid-cols-4 py-2 px-1 safe-area-pb">
        {navItems.map(({ name, path, icon: Icon }) => {
          const active = isPathActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors ${
                active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={19} className={active ? 'text-primary' : 'text-muted-foreground'} />
              <span>{name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
