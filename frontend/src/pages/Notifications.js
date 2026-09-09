import { useOutletContext } from "react-router-dom";
import React, { useEffect, useState, useCallback } from "react";
import { Bell, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import api from "../api/api";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import PageHeader from "../components/ui/PageHeader";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import { cn } from "../lib/utils";

const SEVERITY = {
  critical: { dot: "bg-destructive", text: "text-destructive", mark: "Critical", icon: ShieldAlert },
  error: { dot: "bg-destructive", text: "text-destructive", mark: "Error", icon: ShieldAlert },
  warning: { dot: "bg-warning", text: "text-warning", mark: "Warning", icon: AlertTriangle },
  success: { dot: "bg-success", text: "text-success", mark: "Success", icon: CheckCircle2 },
  info: { dot: "bg-primary", text: "text-primary", mark: "Info", icon: Info },
};

/** Compact SVG/CSS illustration for the empty alerts state: bell + status ring. */
function AlertsEmptyIllustration() {
  return (
    <svg width="112" height="96" viewBox="0 0 112 96" fill="none" aria-hidden="true">
      {/* status ring */}
      <circle cx="56" cy="46" r="34" stroke="hsl(213 39% 89%)" strokeWidth="1.5" strokeDasharray="4 5" />
      <circle cx="56" cy="46" r="26" fill="hsl(214 100% 96%)" />
      {/* bell */}
      <path
        d="M56 32c-5.5 0-9.5 4-9.5 9.5v5.5c0 1.2-.4 2.3-1.2 3.2l-2.4 2.8c-.8 1-.1 2.5 1.2 2.5h23.8c1.3 0 2-1.5 1.2-2.5l-2.4-2.8c-.8-.9-1.2-2-1.2-3.2v-5.5C65.5 36 61.5 32 56 32Z"
        fill="hsl(212 84% 35%)"
      />
      <path d="M52.5 58.5a3.5 3.5 0 0 0 7 0" stroke="hsl(212 84% 35%)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* live status dot on the ring */}
      <circle cx="56" cy="12" r="4" fill="hsl(154 76% 33%)" />
      <circle cx="90" cy="70" r="2.5" fill="hsl(213 39% 84%)" />
      <circle cx="22" cy="70" r="2.5" fill="hsl(213 39% 84%)" />
    </svg>
  );
}

export default function Notifications() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({ title: "Alerts" });
  }, [setHeaderProps]);

  const { selectedDevice } = useDevice();
  useDeviceData(selectedDevice); // keep header live status in sync
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/notifications/history`, {
        params: selectedDevice ? { device_id: selectedDevice.device_id } : {}
      });
      setNotifications(response.data?.notifications || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load notification history");
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description="Notifications queued from sensor events, automations, and test sends."
        actions={
          <Button variant="outline" size="sm" onClick={loadNotifications} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <Card className="overflow-hidden border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">Recent Notification Activity</h3>
          </div>
          {notifications.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {notifications.length} event{notifications.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading && notifications.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertsEmptyIllustration />
            <h3 className="text-base font-semibold tracking-tight text-foreground">No notification activity yet</h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Alerts from fall detection, presence changes, and automations will appear here the
              moment your device triggers them.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              channel ready · listening
            </p>
          </CardContent>
        ) : (
          <ul className="relative px-5 py-1">
            {/* timeline rail */}
            <span className="absolute bottom-5 left-[30px] top-5 w-px bg-border/70" aria-hidden="true" />
            {notifications.map((item) => {
              const sev = SEVERITY[item.metadata?.severity] || SEVERITY.info;
              const Icon = sev.icon;
              return (
                <li key={item.id} className="relative flex flex-col gap-1 px-0 py-3.5 pl-7 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span
                    className={cn(
                      "absolute left-[23px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[hsl(0,0%,100%)]",
                      sev.dot
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 pl-6">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", sev.text)} />
                      {item.event}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {(item.metadata?.provider_name || item.metadata?.provider || "Provider")} ·{" "}
                      <span className={cn("font-medium", sev.text)}>{sev.mark}</span>
                    </p>
                  </div>
                  <div className="shrink-0 pl-6 text-xs text-muted-foreground sm:pl-0 sm:text-right">
                    <p className="font-medium text-foreground">{item.status}</p>
                    <p className="font-numeric">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
