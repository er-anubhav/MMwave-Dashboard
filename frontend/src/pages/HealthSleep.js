import { useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import StatCard from "../components/ui/StatCard";
import ChartCard from "../components/ui/ChartCard";
import VitalsChart from "../components/VitalsChart";
import { Card, CardContent } from "../components/ui/card";
import PageHeader from "../components/ui/PageHeader";
import { LinkIcon, Plus, Heart, Wind, MoonStar } from "lucide-react";
import { Button } from "../components/ui/button";
import EmptyState from "../components/ui/EmptyState";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "../lib/utils";

const RED = "hsl(0 65% 55%)";
const RED_SOFT = "hsl(0 72% 96%)";
const BLUE = "hsl(212 84% 35%)";
const BLUE_SOFT = "hsl(214 100% 96%)";

export default function HealthSleep() {
  const { setHeaderProps } = useOutletContext();
  const navigate = useNavigate();
  const { selectedDevice, devices = [] } = useDevice();
  const { mode, sensorData, lastUpdated, isConnected, history, handleModeChange } = useDeviceData(selectedDevice);

  useEffect(() => {
    setHeaderProps({
      title: "Health & Sleep",
      mode,
      onModeChange: handleModeChange,
      isConnected,
      lastUpdated
    });
  }, [mode, handleModeChange, isConnected, lastUpdated, setHeaderProps]);

  const pageHeader = (
    <PageHeader
      title="Health & Sleep"
      description="Heart rate, respiration, and sleep quality for the selected device."
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
              description="Link a Pro device to start tracking heart rate, respiration, and sleep."
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
  if (isStd) {
    return (
      <div className="flex flex-col gap-6">
        {pageHeader}
        <Card>
          <CardContent>
            <EmptyState
              icon={<Heart className="h-5 w-5" />}
              title="Vitals & Sleep tracking disabled"
              description="This device is registered as a Standard (STD) device. Vitals, heartbeat, and sleep tracking are only available on Pro (PRO) devices."
              action={
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go to Dashboard
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const heartRate = sensorData?.sleep?.heart_rate;
  const respiration = sensorData?.sleep?.respiration;
  const sleepScore = sensorData?.sleep?.score;
  const hasScore = sleepScore != null && sleepScore !== "";

  return (
    <div className="flex flex-col gap-6">
      {pageHeader}

      {/* Compact live session strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-card px-4 py-2.5 shadow-surface-sm">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Session</span>
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-success animate-pulse-dot" : "bg-muted-foreground/50")} />
          <span className={cn("font-medium", isConnected ? "text-success" : "text-muted-foreground")}>
            {isConnected ? "Live" : "Waiting"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Mode: <span className="font-medium text-foreground">{mode === "sleep" ? "Sleep" : "Fall"}</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Updated:{" "}
          <span className="font-numeric text-foreground">
            {lastUpdated
              ? formatDistanceToNow(typeof lastUpdated === "string" ? parseISO(lastUpdated) : new Date(lastUpdated), { addSuffix: true })
              : "waiting"}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Heart Rate"
          value={heartRate ? `${heartRate} bpm` : "N/A"}
          icon={<Heart className="h-4 w-4" />}
          iconClassName="text-destructive bg-destructive-soft"
          footerLabel={heartRate ? "Current rate" : "Requires Sleep Mode"}
          footerValue={heartRate ? "Live" : "Waiting"}
          footerColor={heartRate ? "text-foreground" : "text-muted-foreground"}
          status={heartRate ? "ok" : "muted"}
          sparkline={{ data: history.map((h) => h.heartRate), color: RED, softColor: RED_SOFT, emptyLabel: "Waiting for heart rate" }}
        />
        <StatCard
          title="Respiration"
          value={respiration ? `${respiration} bpm` : "N/A"}
          icon={<Wind className="h-4 w-4" />}
          iconClassName="text-primary bg-secondary"
          footerLabel={respiration ? "Current rate" : "Requires Sleep Mode"}
          footerValue={respiration ? "Live" : "Waiting"}
          footerColor={respiration ? "text-foreground" : "text-muted-foreground"}
          isActive={!!respiration}
          sparkline={{ data: history.map((h) => h.respiration), color: BLUE, softColor: BLUE_SOFT, emptyLabel: "Waiting for respiration" }}
        />
        <StatCard
          title="Sleep Quality"
          value={sleepScore || "N/A"}
          icon={<MoonStar className="h-4 w-4" />}
          iconClassName={hasScore ? "text-success bg-success-soft" : "text-warning bg-warning-soft"}
          footerLabel="Nightly score"
          footerValue={hasScore ? "Available" : "Processing"}
          footerColor={hasScore ? "text-success" : "text-warning"}
          status={hasScore ? "ok" : "warn"}
        />
      </div>

      <ChartCard
        title="Vitals Trends"
        subtitle="Heart rate and respiration over the live window"
        footerText="Live — updates every second"
        chartBg="bg-plot"
      >
        <VitalsChart history={history} />
      </ChartCard>
    </div>
  );
}
