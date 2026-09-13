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
const SEVERITY = {
  critical: { dot: "bg-destructive", text: "text-destructive", mark: "Critical", icon: ShieldAlert },
  error: { dot: "bg-destructive", text: "text-destructive", mark: "Error", icon: ShieldAlert },
  warning: { dot: "bg-warning", text: "text-warning", mark: "Warning", icon: AlertTriangle },
  success: { dot: "bg-success", text: "text-success", mark: "Success", icon: CheckCircle2 },
  info: { dot: "bg-primary", text: "text-primary", mark: "Info", icon: Info },
};

export default function Notifications() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({ title: "Alerts" });
  }, [setHeaderProps]);

  const { selectedDevice } = useDevice();
  useDeviceData(selectedDevice);
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
      // quiet on load error
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <div className={`flex-1 flex flex-col ${notifications.length === 0 ? 'justify-center my-auto' : 'gap-3 sm:gap-4 pt-2'}`}>
      {/* Alert count bar only shown when alerts exist */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs sm:text-sm font-normal text-muted-foreground">
            {notifications.length} {notifications.length === 1 ? "Alert" : "Alerts"}
          </span>
        </div>
      )}

      {/* Empty State */}
      {notifications.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center py-12">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/80 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-normal tracking-tight text-foreground">
            All clear
          </h2>
          <p className="mt-1 max-w-xs text-xs sm:text-sm font-normal text-muted-foreground">
            Everything is quiet and running smoothly.
          </p>
        </div>
      ) : (
        /* Alerts List */
        <div className="grid gap-3">
          {notifications.map((item) => {
            const sevKey = item.metadata?.severity || item.severity || "info";
            const sev = SEVERITY[sevKey] || SEVERITY.info;
            const Icon = sev.icon;

            return (
              <Card
                key={item.id}
                className="border-border shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary/70 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-normal text-foreground">
                          {item.event}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {item.description || item.metadata?.provider || "BlareXSense detection trigger"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-normal ${
                          sevKey === "critical"
                            ? "bg-destructive-soft text-destructive"
                            : sevKey === "warning"
                            ? "bg-warning-soft text-warning"
                            : "bg-secondary text-primary"
                        }`}
                      >
                        {item.status || sev.mark}
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
