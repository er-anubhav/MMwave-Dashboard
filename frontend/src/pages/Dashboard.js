import { useEffect, useState, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import StatCard from "../components/ui/StatCard";
import RelayControl from "../components/RelayControl";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import PageHeader from "../components/ui/PageHeader";
import { LinkIcon, Plus, User, Settings2, Heart, Wind, ChevronDown, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import EmptyState from "../components/ui/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "../lib/utils";
import api from "../api/api";
import { toast } from "sonner";

function StatusItem({ dot, text, label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", text)}>{value}</span>
    </span>
  );
}

/** Compact live system-status strip — real state only, no decoration. */
function SystemStatusStrip({ isConnected, lastUpdated, mode, presence, relayState, relayMode }) {
  const packetAge = lastUpdated
    ? formatDistanceToNow(typeof lastUpdated === "string" ? parseISO(lastUpdated) : new Date(lastUpdated), { addSuffix: true })
    : null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-surface-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          System Status
        </span>
        <StatusItem
          dot={isConnected ? "bg-success animate-pulse-dot" : "bg-muted-foreground/50"}
          text={isConnected ? "text-success" : "text-muted-foreground"}
          label="Device"
          value={isConnected ? "Online" : "Offline"}
        />
        <StatusItem
          dot={mode === "fall" ? "bg-primary" : "bg-muted-foreground/40"}
          text={mode === "fall" ? "text-foreground" : "text-muted-foreground"}
          label="Fall watch"
          value={mode === "fall" ? "Active" : "Off"}
        />
        <StatusItem
          dot={mode === "sleep" ? "bg-primary" : "bg-muted-foreground/40"}
          text={mode === "sleep" ? "text-foreground" : "text-muted-foreground"}
          label="Sleep mode"
          value={mode === "sleep" ? "Active" : "Off"}
        />
        <StatusItem
          dot={presence ? "bg-primary" : "bg-muted-foreground/40"}
          text={presence ? "text-foreground" : "text-muted-foreground"}
          label="Presence"
          value={presence ? "Detected" : "Clear"}
        />
        <StatusItem
          dot={relayState ? "bg-success" : "bg-muted-foreground/40"}
          text={relayState ? "text-foreground" : "text-muted-foreground"}
          label={`Relay ${relayMode === "auto" ? "(auto)" : ""}`}
          value={relayState ? "ON" : "OFF"}
        />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-border" />
          Last packet: <span className="font-numeric text-foreground">{packetAge || "waiting"}</span>
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { setHeaderProps } = useOutletContext();
  const navigate = useNavigate();
  const { selectedDevice, devices = [], loadDevices } = useDevice();
  const { mode, sensorData, relayState, relayMode, lastUpdated, isConnected, handleModeChange, handleRelayToggle, handleRelayModeChange } = useDeviceData(selectedDevice);

  // Per-device mode dictionary to track local mode states
  const [deviceModes, setDeviceModes] = useState({});

  useEffect(() => {
    setHeaderProps({
      title: "Overview",
      mode,
      onModeChange: handleModeChange,
      isConnected,
      lastUpdated
    });
  }, [mode, handleModeChange, isConnected, lastUpdated, setHeaderProps]);

  const handleDeviceModeChange = useCallback(async (targetDeviceId, newMode) => {
    try {
      await api.post(`/mode`, {
        mode: newMode,
        device_id: targetDeviceId
      });

      setDeviceModes((prev) => ({
        ...prev,
        [targetDeviceId]: newMode
      }));

      // If the target device is the currently active device in header context, sync it
      if (selectedDevice?.device_id === targetDeviceId) {
        handleModeChange(newMode);
      }

      toast.success(`Mode changed to ${newMode.toUpperCase()} for device ${targetDeviceId}`);
      if (typeof loadDevices === "function") {
        loadDevices();
      }
    } catch (error) {
      console.error("Error setting device mode:", error);
      toast.error(error.response?.data?.detail || "Failed to change device mode");
    }
  }, [selectedDevice, handleModeChange, loadDevices]);

  const pageHeader = (
    <PageHeader
      title="Overview"
      description="Current system metrics and linked device management."
    />
  );

  if (devices.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {pageHeader}
        <Card>
          <CardContent>
            <EmptyState
              icon={<LinkIcon className="h-5 w-5" />}
              title="No devices linked"
              description="Link your first device to start monitoring presence, vitals, and activity."
              action={
                <Button onClick={() => navigate("/devices")}>
                  <Plus className="h-4 w-4" />
                  Go to Device Management
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className="flex flex-col gap-6">
        {pageHeader}
        <Card>
          <CardContent>
            <EmptyState
              icon={<LinkIcon className="h-5 w-5" />}
              title="Select a device"
              description="Use the device selector in the header to choose which device to monitor."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isStd = selectedDevice?.device_id?.toUpperCase().startsWith("STD");

  return (
    <div className="flex flex-col gap-6">
      {pageHeader}

      <SystemStatusStrip
        isConnected={isConnected}
        lastUpdated={lastUpdated}
        mode={mode}
        presence={!!sensorData?.presence}
        relayState={relayState}
        relayMode={relayMode}
      />

      {/* Overview KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Presence"
          value={sensorData?.presence ? "Detected" : "None"}
          icon={<User className="h-4 w-4" />}
          iconClassName="text-primary bg-secondary"
          accent={sensorData?.presence ? "bg-primary" : undefined}
          footerLabel={sensorData?.presence ? (sensorData?.activity ? `Activity score ${sensorData.activity}` : "Person in room") : "No movement"}
          footerValue={sensorData?.presence ? "Active" : "Clear"}
          footerColor={sensorData?.presence ? "text-primary" : "text-muted-foreground"}
          isActive={sensorData?.presence}
        />
        <StatCard
          title="Radar Mode"
          value={mode === "sleep" ? "Sleep" : mode === "fall" ? "Fall" : mode.toUpperCase()}
          icon={<Settings2 className="h-4 w-4" />}
          iconClassName="text-primary bg-secondary"
          footerLabel={`Relay is ${relayState ? "ON" : "OFF"}`}
          footerValue={relayMode === "auto" ? "AUTO" : mode.toUpperCase()}
          footerColor="text-foreground"
          isActive={relayState || relayMode === "auto"}
        />
        {!isStd && (
          <>
            <StatCard
              title="Heart Rate"
              value={sensorData?.sleep?.heart_rate ? `${sensorData.sleep.heart_rate} bpm` : "N/A"}
              icon={<Heart className="h-4 w-4" />}
              iconClassName="text-destructive bg-destructive-soft"
              footerLabel={sensorData?.sleep?.heart_rate ? "Current rate" : "Requires Sleep Mode"}
              footerValue={sensorData?.sleep?.heart_rate ? "Live" : "Waiting"}
              footerColor={sensorData?.sleep?.heart_rate ? "text-foreground" : "text-muted-foreground"}
              isAlert={false}
              status={sensorData?.sleep?.heart_rate ? "ok" : "muted"}
            />
            <StatCard
              title="Respiration"
              value={sensorData?.sleep?.respiration ? `${sensorData.sleep.respiration} bpm` : "N/A"}
              icon={<Wind className="h-4 w-4" />}
              iconClassName="text-primary bg-secondary"
              footerLabel={sensorData?.sleep?.respiration ? "Current rate" : "Requires Sleep Mode"}
              footerValue={sensorData?.sleep?.respiration ? "Live" : "Waiting"}
              footerColor={sensorData?.sleep?.respiration ? "text-foreground" : "text-muted-foreground"}
              isActive={!!sensorData?.sleep?.respiration}
            />
          </>
        )}
      </div>

      {/* Main Grid: Relay Control + Linked Devices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RelayControl
            relayState={relayState}
            relayMode={relayMode}
            onToggle={handleRelayToggle}
            onModeChange={handleRelayModeChange}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">Linked Devices</h2>
              <p className="text-xs text-muted-foreground">Operating status and per-device mode control.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/devices")}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Manage Links
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {devices.map((device) => {
              const isSelected = selectedDevice?.device_id === device.device_id;
              const isOnline = device.status === "online" || (isSelected && isConnected);
              const currentDevMode = deviceModes[device.device_id] || (isSelected ? mode : device.mode || "auto");
              const currentPresence = isSelected ? (sensorData?.presence ? "Detected" : "Clear") : "No Presence";
              const currentRelay = isSelected ? (relayState ? "ON" : "OFF") : "OFF";
              const roomName = device.room || device.location || (device.device_id?.toUpperCase().startsWith("STD") ? "Living Room" : "Primary Room");

              return (
                <Card
                  key={device.device_id}
                  className={cn(
                    "border-border bg-card shadow-surface transition-all flex flex-col justify-between",
                    isSelected && "border-primary/50 ring-1 ring-primary/20"
                  )}
                >
                  <CardHeader className="border-b border-border/60 pb-3 pt-4 px-4 sm:px-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-foreground truncate">{device.name}</CardTitle>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">{roomName}</span>
                          <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
                          <span className="font-mono text-[11px] truncate text-muted-foreground/80">{device.device_id}</span>
                        </div>
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0",
                        isOnline ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-success animate-pulse-dot" : "bg-muted-foreground/50")} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2 py-1 text-center bg-muted/30 rounded-lg p-2 border border-border/40">
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Presence</span>
                        <span className={cn("mt-0.5 block text-xs font-bold", currentPresence === "Detected" ? "text-primary" : "text-foreground")}>
                          {currentPresence}
                        </span>
                      </div>
                      <div className="border-x border-border/50 px-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Relay</span>
                        <span className={cn("mt-0.5 block text-xs font-bold", currentRelay === "ON" ? "text-success" : "text-muted-foreground")}>
                          {currentRelay}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mode</span>
                        <span className="mt-0.5 block text-xs font-bold text-primary uppercase">
                          {currentDevMode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Mode: <strong className="text-foreground uppercase font-semibold">{currentDevMode}</strong>
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
                            Change Mode
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-border bg-popover p-1 shadow-surface">
                          {[
                            { key: "fall", label: "Fall Mode" },
                            { key: "sleep", label: "Sleep Mode" },
                            { key: "auto", label: "Auto Mode" },
                          ].map((modeOption) => {
                            const isModeActive = currentDevMode?.toLowerCase() === modeOption.key;
                            return (
                              <DropdownMenuItem
                                key={modeOption.key}
                                onClick={() => handleDeviceModeChange(device.device_id, modeOption.key)}
                                className={cn(
                                  "flex items-center justify-between cursor-pointer text-xs font-medium rounded-md px-2.5 py-1.5",
                                  isModeActive ? "bg-secondary text-primary font-semibold" : "text-foreground hover:bg-accent"
                                )}
                              >
                                <span>{modeOption.label}</span>
                                {isModeActive && <Check className="h-3.5 w-3.5 text-primary" />}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

