import { useOutletContext } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { useDevice } from "../contexts/DeviceContext";
import api from "../api/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { 
  RefreshCw, 
  Terminal, 
  Database, 
  Cpu, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  FileCode,
  Activity,
  Heart,
  Wind,
  Table as TableIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
};

export default function RawData() {
  const { setHeaderProps } = useOutletContext();
  const { selectedDevice, devices = [] } = useDevice();
  const [history, setHistory] = useState([]);


  useEffect(() => {
    setHeaderProps({
      title: "Raw Telemetry logs",
      isConnected: history.length > 0,
      lastUpdated: history[0]?.timestamp
    });
  }, [history, setHeaderProps]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  const fetchHistory = useCallback(async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const response = await api.get("/data/history", {
        params: { device_id: selectedDevice.device_id, limit: 30 }
      });
      setHistory(response.data.history || []);
    } catch (error) {
      console.error("Error fetching telemetry history:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!autoRefresh || !selectedDevice) return;
    const interval = setInterval(() => {
      fetchHistory();
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedDevice, fetchHistory]);

  const toggleRow = (index) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const getStatusBadge = (presence, fall) => {
    if (fall) {
      return <Badge className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100/50 uppercase tracking-wider text-[10px] rounded-none">FALL DETECTED</Badge>;
    }
    if (presence) {
      return <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100/50 uppercase tracking-wider text-[10px] rounded-none">PRESENCE</Badge>;
    }
    return <Badge variant="outline" className="text-gray-400 border-gray-300 dark:border-border uppercase tracking-wider text-[10px] rounded-none">CLEAR</Badge>;
  };

  if (devices.length === 0) {
    return (
      <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
        
        <main className="py-8">
          <Card className="rounded-2xl border border-gray-250/50 dark:border-border/50 shadow-sm glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="h-16 w-16 text-gray-300 dark:text-primary mb-4 animate-pulse" />
              <h3 className="text-base  text-gray-900 dark:text-primary mb-2">No active devices</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Link a device in Device Management to view telemetry data logs.
              </p>
            </CardContent>
          </Card>
        </main>
      </motion.div>
    );
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">

      <main className="py-2">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 rounded-2xl shadow-sm glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm  text-black dark:text-primary">Device Logs Console</h2>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{selectedDevice?.device_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-200/50 dark:border-border/50 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-background/50 p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs  transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-background text-gray-955 dark:text-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                onClick={() => setViewMode("json")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs  transition-colors ${
                  viewMode === "json"
                    ? "bg-white dark:bg-background text-gray-955 dark:text-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Raw JSON
              </button>
            </div>

            {/* Auto Refresh Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-xs text-gray-600 dark:text-gray-400  cursor-pointer">
                Auto-Refresh (2s)
              </Label>
            </div>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={loading}
              className="gap-2 rounded-xl border-gray-250 bg-white/50 dark:bg-background/50 hover:bg-white dark:hover:bg-background  text-xs py-1.5 px-3 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Console / Grid */}
        <Card className="rounded-2xl shadow-sm overflow-hidden glass-card">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No telemetry data packets received yet.</p>
              <p className="text-xs text-gray-400 mt-1">Ensure the hardware is powered and connected to the internet.</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] table-auto text-left">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-background/20 border-b border-gray-200/50 dark:border-border/50">
                    <th className="py-3.5 px-6 text-xs  uppercase tracking-wider text-gray-400">Timestamp</th>
                    <th className="py-3.5 px-6 text-xs  uppercase tracking-wider text-gray-400">Status</th>
                    <th className="py-3.5 px-6 text-xs  uppercase tracking-wider text-gray-400">Mode</th>
                    <th className="py-3.5 px-6 text-xs  uppercase tracking-wider text-gray-400">Activity</th>
                    {!(selectedDevice?.name?.toUpperCase().includes("STD")) && (
                      <th className="py-3.5 px-6 text-xs  uppercase tracking-wider text-gray-400">Vitals</th>
                    )}
                    <th className="py-3.5 px-6 text-xs  uppercase tracking-wider text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((packet, idx) => {
                    const sensor = packet.sensor_data || {};
                    const isExpanded = expandedRow === idx;
                    const formattedTime = packet.timestamp 
                      ? formatDistanceToNow(new Date(packet.timestamp), { addSuffix: true })
                      : "Unknown";

                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-gray-50/30 dark:hover:bg-background/10 transition-colors border-b border-gray-200/30 dark:border-border/30">
                          <td className="py-3.5 px-6 text-sm">
                            <span className="text-black dark:text-primary font-medium">
                              {packet.timestamp ? new Date(packet.timestamp).toLocaleTimeString() : "N/A"}
                            </span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">{formattedTime}</span>
                          </td>
                          <td className="py-3.5 px-6">
                            {getStatusBadge(sensor.presence, sensor.fall_detected)}
                          </td>
                          <td className="py-3.5 px-6 text-sm text-gray-750 dark:text-gray-300">
                            <Badge variant="secondary" className="text-[10px] uppercase  rounded-md">
                              {packet.mode || "N/A"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-6 text-sm">
                            <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                              <Activity className="w-3.5 h-3.5 text-blue-500" />
                              <span>{sensor.activity ?? "0"}</span>
                            </div>
                          </td>
                          {!(selectedDevice?.name?.toUpperCase().includes("STD")) && (
                            <td className="py-3.5 px-6 text-sm">
                              {sensor.sleep ? (
                                <div className="flex items-center gap-3 text-xs ">
                                  <span className="flex items-center gap-1 text-rose-500">
                                    <Heart className="w-3.5 h-3.5" />
                                    {sensor.sleep.heart_rate ?? "N/A"}
                                  </span>
                                  <span className="flex items-center gap-1 text-emerald-500">
                                    <Wind className="w-3.5 h-3.5" />
                                    {sensor.sleep.respiration ?? "N/A"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">N/A</span>
                              )}
                            </td>
                          )}
                          <td className="py-3.5 px-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(idx)}
                              className="h-8 px-3 rounded-lg text-xs  text-gray-500 hover:text-black dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-background"
                            >
                              {isExpanded ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                              {isExpanded ? "Hide" : "JSON"}
                            </Button>
                          </td>
                        </tr>
                        
                        {/* Collapsible JSON Row */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan="6" className="bg-gray-50/20 dark:bg-background/20 p-4 border-b border-gray-250/20 dark:border-border/20">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="rounded-xl border border-gray-200/60 dark:border-border/60 overflow-hidden bg-white/40 dark:bg-zinc-900/40">
                                    <div className="bg-gray-50/80 dark:bg-background/40 px-4 py-2 border-b border-gray-200/60 dark:border-border/60 flex justify-between items-center">
                                      <span className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                                        <Cpu className="w-3.5 h-3.5" />
                                        Packet Payload
                                      </span>
                                      <span className="text-[10px] font-mono text-gray-400">
                                        Size: {JSON.stringify(packet).length} B
                                      </span>
                                    </div>
                                    <pre className="p-4 text-xs font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto max-h-[350px]">
                                      {JSON.stringify(packet, null, 2)}
                                    </pre>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // Full Raw JSON list
            <div className="p-4 bg-gray-50/50 dark:bg-background/30 max-h-[600px] overflow-y-auto font-mono text-xs border-t border-gray-200/30 dark:border-border/30">
              <pre className="text-emerald-600 dark:text-emerald-400 leading-relaxed">
                {JSON.stringify(history, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </main>
    </motion.div>
  );
}
