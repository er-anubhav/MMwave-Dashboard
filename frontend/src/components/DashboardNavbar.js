import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Moon, ChevronDown, Link as LinkIcon, Plus, Menu, LogOut } from "lucide-react";
import { useDevice } from "../contexts/DeviceContext";
import { useAuth } from "../contexts/AuthContext";
import StatusPill from "./ui/StatusPill";
import NavList, { DeviceStatusLine } from "./NavItems";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Small brand tile used in the header and the mobile drawer. */
function BrandMark({ size = 36 }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"
      style={{ height: size, width: size, fontSize: size * 0.5, fontWeight: 800 }}
    >
      B
    </span>
  );
}

export default function DashboardNavbar({ mode, onModeChange, isConnected }) {
  const { devices, selectedDevice, selectDevice } = useDevice();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const canChangeMode = typeof onModeChange === "function" && !!mode;
  const isStd = selectedDevice?.device_id?.toUpperCase().startsWith("STD");

  const deviceName = selectedDevice?.name;
  const deviceId = selectedDevice?.device_id;
  const hasDevice = devices.length > 0 && !!selectedDevice;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const modeButtons = [
    { key: "fall", label: "Fall Mode", icon: Activity },
    { key: "sleep", label: "Sleep Mode", icon: Moon },
  ];

  return (
    <nav className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      {/* Left: mobile menu + live device identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                type="button"
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="z-[150] flex w-72 flex-col border-r border-border bg-card p-0">
              <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5">
                <BrandMark />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold tracking-tight text-foreground">
                    {hasDevice ? deviceName : "BlareXSense Console"}
                  </p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {hasDevice ? deviceId : "Monitoring Console"}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-6">
                <NavList onNavigate={() => setSheetOpen(false)} />
              </div>
              <div className="shrink-0 px-2 py-1.5">
                <DeviceStatusLine />
              </div>
              <div className="shrink-0 border-t border-border p-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                  type="button"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Device identity (reference header lockup) */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden sm:block">
            <BrandMark />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-foreground">
              {hasDevice ? deviceName : "BlareXSense Console"}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {hasDevice ? deviceId : "Monitoring Console"}
            </p>
          </div>
        </div>
      </div>

      {/* Right: status + device + mode */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill
          status={isConnected ? "online" : "waiting"}
          label={isConnected ? "Online" : "Waiting"}
          pulse={isConnected}
        />

        {devices.length > 0 && (
          <>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-surface-sm transition-colors hover:bg-secondary"
                    type="button"
                  >
                    <LinkIcon size={13} className="text-muted-foreground" />
                    <span className="hidden max-w-[150px] truncate sm:inline">
                      {selectedDevice ? selectedDevice.name : "Select device"}
                    </span>
                    <ChevronDown size={13} className="text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 border-border bg-popover p-2 shadow-surface">
                  <DropdownMenuLabel className="px-2 pb-2 text-xs font-semibold text-muted-foreground">
                    Your devices
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  {devices.map((device) => (
                    <DropdownMenuItem
                      key={device.device_id}
                      onClick={() => selectDevice(device)}
                      className={`my-0.5 cursor-pointer rounded-lg ${
                        selectedDevice?.device_id === device.device_id
                          ? "bg-secondary font-medium text-primary"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="truncate">{device.name}</span>
                        <span
                          className={`ml-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                            device.status === "online" ? "bg-success" : "bg-muted-foreground/50"
                          }`}
                        />
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              onClick={() => navigate("/devices")}
              aria-label="Manage devices"
              title="Manage devices"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-surface-sm transition-colors hover:bg-secondary hover:text-foreground"
              type="button"
            >
              <Plus size={16} />
            </button>
          </>
        )}

        {/* Mode toggle */}
        {selectedDevice && !isStd && canChangeMode && (
          <div className="flex h-9 items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-surface-sm">
            {modeButtons.map(({ key, label, icon: Icon }) => {
              const isActive = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => onModeChange(key)}
                  className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  type="button"
                >
                  <Icon size={13} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                  <span className="hidden xl:inline">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="hidden h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground shadow-surface-sm transition-colors hover:bg-destructive-soft hover:text-destructive sm:inline-flex"
          type="button"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
