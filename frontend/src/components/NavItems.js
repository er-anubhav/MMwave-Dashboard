import { Link, useLocation } from "react-router-dom";
import { Home, Bell, Heart, Shield, Settings } from "lucide-react";
import { useDevice } from "../contexts/DeviceContext";
import { cn } from "../lib/utils";

export function useNavGroups() {
  const { selectedDevice } = useDevice();
  const isStd = selectedDevice?.device_id?.toUpperCase().startsWith("STD");

  return [
    {
      label: "Monitor",
      items: [
        { name: "Overview", path: "/", icon: Home },
        { name: "Alerts", path: "/notifications", icon: Bell },
        ...(!isStd ? [{ name: "Health & Sleep", path: "/health", icon: Heart }] : []),
        { name: "Security & Activity", path: "/security", icon: Shield },
      ],
    },
    {
      label: "Manage",
      items: [
        { name: "Settings", path: "/settings", icon: Settings },
      ],
    },
  ];
}

/**
 * Real connection state from DeviceContext — rendered only when a device
 * exists, never fabricated. Shown near the bottom of the sidebar.
 */
export function DeviceStatusLine() {
  const { devices, selectedDevice } = useDevice();
  if (!devices.length || !selectedDevice) return null;
  const online = selectedDevice.status === "online";

  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          online ? "bg-success animate-pulse-dot" : "bg-destructive"
        )}
      />
      <span className="min-w-0 text-xs leading-tight">
        <span className={cn("block font-semibold", online ? "text-success" : "text-destructive")}>
          {online ? "Device connected" : "Device offline"}
        </span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {selectedDevice.device_id}
        </span>
      </span>
    </div>
  );
}

export default function NavList({ onNavigate }) {
  const location = useLocation();
  const groups = useNavGroups();

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ name, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-secondary font-semibold text-primary"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-foreground/55")}
                      strokeWidth={isActive ? 2.2 : 2}
                    />
                    <span className="truncate">{name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
