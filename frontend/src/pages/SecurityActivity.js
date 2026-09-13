import { useEffect, useState } from "react";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import StatCard from "../components/ui/StatCard";
import SystemLogsTable from "../components/SystemLogsTable";
import { Card, CardContent } from "../components/ui/card";
import PageHeader from "../components/ui/PageHeader";
import { LinkIcon, Plus, User, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import EmptyState from "../components/ui/EmptyState";
import { useNavigate, useOutletContext } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "../lib/utils";
import api from "../api/api";

export default function SecurityActivity() {
  const { setHeaderProps } = useOutletContext();
  const navigate = useNavigate();
  const { selectedDevice, devices = [] } = useDevice();
  const { mode, sensorData, lastUpdated, isConnected, handleModeChange } = useDeviceData(selectedDevice);

  useEffect(() => {
    setHeaderProps({
      title: "Security & Activity",
      mode,
      onModeChange: handleModeChange,
      isConnected,
      lastUpdated
    });
  }, [mode, handleModeChange, isConnected, lastUpdated, setHeaderProps]);

  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!selectedDevice) {
      setLogs([]);
      return;
    }

    const loadLogs = async () => {
      try {
        const response = await api.get(`/logs`, {
          params: { device_id: selectedDevice.device_id, limit: 30 }
        });
        const serverLogs = response.data?.logs || [];
        const normalized = serverLogs.map((log) => ({
          id: log.id,
          event: log.event,
          type: log.log_type || "info",
          time: log.created_at
            ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
            : "just now",
          status: log.status || "Active"
        }));
        setLogs(normalized);
      } catch {
        setLogs([]);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const pageHeader = (
    <PageHeader
      title="Security & Activity"
      description="Presence, movement history, and security events for the selected device."
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
              description="Link a device to monitor presence, activity, and security events."
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

  const armed = mode === "fall";

  return (
    <div className="flex flex-col gap-6">
      {pageHeader}

      {/* Compact live strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-card px-4 py-2.5 shadow-surface-sm">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Monitor</span>
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-success animate-pulse-dot" : "bg-muted-foreground/50")} />
          <span className={cn("font-medium", isConnected ? "text-success" : "text-muted-foreground")}>
            {isConnected ? "Live" : "Waiting"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Presence:{" "}
          <span className={cn("font-medium", sensorData?.presence ? "text-primary" : "text-foreground")}>
            {sensorData?.presence ? "Detected" : "Clear"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Updated:{" "}
          <span className="font-numeric text-foreground">
            {lastUpdated
              ? formatDistanceToNow(typeof lastUpdated === "string" ? parseISO(lastUpdated) : new Date(lastUpdated), { addSuffix: true })
              : "waiting"}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          title="Security Status"
          value={armed ? "Armed" : "Disarmed"}
          icon={<Shield className="h-4 w-4" />}
          iconClassName={armed ? "text-success bg-success-soft" : "text-muted-foreground bg-muted/60"}
          accent={armed ? "bg-success" : undefined}
          footerLabel="System monitoring"
          footerValue={armed ? "Fall detection on" : "Fall detection off"}
          footerColor={armed ? "text-success" : "text-muted-foreground"}
          isActive={armed}
        />
      </div>

      <SystemLogsTable logs={logs} />
    </div>
  );
}

