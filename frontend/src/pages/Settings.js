import { useOutletContext } from "react-router-dom";
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from "react-dom";
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Database,
  Clock,
  Activity,
  Download,
  Plus,
  Sun,
  Moon,
  Zap,
  Play,
  ShieldAlert,
  CalendarDays,
  ArrowRight,
  MoreVertical,
  SlidersHorizontal,
  Trash2,
  History,
  Loader2
} from 'lucide-react';
import api from "../api/api";
import { toast } from 'sonner';
import { motion } from "framer-motion";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";

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

function getAutomationUi(automationType, title) {
  const lowerTitle = (title || "").toLowerCase();

  if (automationType === "routine") {
    if (lowerTitle.includes("morning")) {
      return {
        icon: <Sun className="w-5 h-5 text-amber-500" />,
        color: "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20",
        iconBg: "bg-white dark:bg-background/80",
        secondaryLabel: "Scheduled"
      };
    }
    if (lowerTitle.includes("sleep") || lowerTitle.includes("bed")) {
      return {
        icon: <Moon className="w-5 h-5 text-indigo-500" />,
        color: "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20",
        iconBg: "bg-white dark:bg-background/80",
        secondaryLabel: "Night"
      };
    }
    return {
      icon: <CalendarDays className="w-5 h-5 text-emerald-600" />,
      color: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20",
      iconBg: "bg-white dark:bg-background/80",
      secondaryLabel: "Routine"
    };
  }

  if (lowerTitle.includes("fall")) {
    return {
      icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
      color: "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20",
      iconBg: "bg-white dark:bg-background/80",
      secondaryLabel: "Safety"
    };
  }

  if (lowerTitle.includes("focus") || lowerTitle.includes("movie")) {
    return {
      icon: <Play className="w-5 h-5 text-purple-600" />,
      color: "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20",
      iconBg: "bg-white dark:bg-background/80",
      secondaryLabel: "Custom Logic"
    };
  }

  return {
    icon: <Zap className="w-5 h-5 text-emerald-600" />,
    color: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20",
    iconBg: "bg-white dark:bg-background/80",
    secondaryLabel: "Rule"
  };
}

export default function Settings() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({
      title: "Settings"
    });
  }, [setHeaderProps]);

  const { selectedDevice } = useDevice();
  const { mode, handleModeChange, isConnected, lastUpdated } = useDeviceData(selectedDevice);
  const isStd = selectedDevice?.device_id?.toUpperCase().startsWith("STD");

  useEffect(() => {
    if (isStd) {
      setCreateForm((prev) => {
        let updated = { ...prev };
        if (prev.trigger === "Sleep state is Deep Sleep") {
          updated.trigger = "Presence detected";
        }
        if (prev.action === "Set mode to Sleep") {
          updated.action = "Set mode to Fall Detection";
        }
        return updated;
      });
    }
  }, [selectedDevice, isStd]);

  // System & Diagnostics states
  const [diagnostics, setDiagnostics] = useState(null);
  const [retention, setRetention] = useState({ sensor_record_limit: 1000, log_limit: 1000 });

  // Automations states
  const [routines, setRoutines] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeAutoTab, setActiveAutoTab] = useState("routines");
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [automationHistory, setAutomationHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    trigger: "Presence detected",
    timeInput: "22:00",
    action: "Set mode to Sleep",
    cooldownSeconds: 60
  });

  // Load settings data
  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const [diagnosticsResponse, retentionResponse] = await Promise.all([
          api.get(`/diagnostics`),
          api.get(`/settings/retention`)
        ]);
        setDiagnostics(diagnosticsResponse.data);
        setRetention(retentionResponse.data);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to load settings data');
      }
    };
    loadSettingsData();
  }, []);

  // Automations loader
  const loadAutomations = useCallback(async () => {
    if (!selectedDevice) {
      setRoutines([]);
      setRules([]);
      return;
    }

    setLoadingAutomations(true);
    try {
      const [response, historyResponse] = await Promise.all([
        api.get(`/automations`, {
          params: { device_id: selectedDevice.device_id }
        }),
        api.get(`/automations/history`, {
          params: { device_id: selectedDevice.device_id, limit: 10 }
        })
      ]);

      const items = response.data?.automations || [];
      const mapped = items.map((item) => {
        const ui = getAutomationUi(item.automation_type, item.title);
        return {
          id: item.id,
          title: item.title,
          description: item.description || "No description",
          active: !!item.active,
          tags: item.tags || item.data?.tags || [ui.secondaryLabel],
          condition: item.data?.trigger || ui.secondaryLabel,
          time: item.data?.time || "Not set",
          data: item.data || {},
          lastRunAt: item.last_run_at,
          runCount: item.run_count || 0,
          lastStatus: item.last_status,
          type: item.automation_type,
          color: ui.color,
          icon: ui.icon,
          iconBg: ui.iconBg
        };
      });

      setRoutines(mapped.filter((item) => item.type === "routine"));
      setRules(mapped.filter((item) => item.type === "rule"));
      setAutomationHistory(historyResponse.data?.history || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load automations");
    } finally {
      setLoadingAutomations(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadAutomations();
  }, [selectedDevice, loadAutomations]);

  const updateAutomationActive = async (item, nextActive) => {
    try {
      await api.put(`/automations/${item.id}`, {
        title: item.title,
        description: item.description,
        active: nextActive,
        data: item.data || {}
      });
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Failed to update automation");
    }
  };

  const toggleRoutine = async (id) => {
    const selected = routines.find((item) => item.id === id);
    if (!selected) return;

    const nextActive = !selected.active;
    setRoutines(routines.map((item) => item.id === id ? { ...item, active: nextActive } : item));
    try {
      await updateAutomationActive(selected, nextActive);
    } catch (error) {
      setRoutines(routines.map((item) => item.id === id ? { ...item, active: selected.active } : item));
      toast.error(error.message);
    }
  };

  const toggleRule = async (id) => {
    const selected = rules.find((item) => item.id === id);
    if (!selected) return;

    const nextActive = !selected.active;
    setRules(rules.map((item) => item.id === id ? { ...item, active: nextActive } : item));
    try {
      await updateAutomationActive(selected, nextActive);
    } catch (error) {
      setRules(rules.map((item) => item.id === id ? { ...item, active: selected.active } : item));
      toast.error(error.message);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      description: "",
      trigger: "Presence detected",
      timeInput: "22:00",
      action: "Set mode to Sleep",
      cooldownSeconds: 60
    });
  };

  const handleCreateAutomation = async () => {
    if (!selectedDevice) {
      toast.error("No device selected");
      return;
    }
    if (!createForm.title.trim()) {
      toast.error("Automation title is required");
      return;
    }

    const formatTimeLabel = (timeStr) => {
      if (!timeStr) return "10:00 PM";
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    };

    setIsSaving(true);
    try {
      const automationType = editingAutomation
        ? editingAutomation.type
        : (activeAutoTab === "routines" ? "routine" : "rule");
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        active: editingAutomation ? editingAutomation.active : true,
        data: {
          trigger: createForm.trigger === "Specific Time" ? `Time is ${formatTimeLabel(createForm.timeInput)}` : createForm.trigger,
          action: createForm.action,
          cooldown_seconds: Number(createForm.cooldownSeconds) || 60,
          tags: automationType === "routine" ? ["Time Constraint", "Relay Control"] : ["Activity Based", "Custom Logic"],
          time: automationType === "routine" ? (createForm.trigger === "Specific Time" ? formatTimeLabel(createForm.timeInput) : createForm.trigger.replace("Time is ", "")) : "Condition-driven"
        }
      };

      if (editingAutomation) {
        await api.put(`/automations/${editingAutomation.id}`, payload);
        toast.success("Automation updated");
      } else {
        await api.post(`/automations`, {
          device_id: selectedDevice.device_id,
          automation_type: automationType,
          ...payload
        });
        toast.success("Automation created");
      }

      setIsModalOpen(false);
      setEditingAutomation(null);
      resetCreateForm();
      await loadAutomations();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save automation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAutomation = async (id) => {
    if (!window.confirm("Delete this automation?")) return;

    try {
      await api.delete(`/automations/${id}`);
      toast.success("Automation deleted");
      await loadAutomations();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete automation");
    }
  };

  const handleEditAutomation = (item) => {
    setEditingAutomation(item);
    setCreateForm({
      title: item.title || "",
      description: item.description || "",
      trigger: item.data?.trigger?.startsWith("Time is") ? "Specific Time" : (item.data?.trigger || "Time is 10:00 PM"),
      timeInput: item.data?.trigger?.startsWith("Time is")
        ? (() => {
          const timeMatch = item.data.trigger.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!timeMatch) return "22:00";
          let h = parseInt(timeMatch[1], 10);
          const m = timeMatch[2];
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          return `${h.toString().padStart(2, "0")}:${m}`;
        })()
        : "22:00",
      action: item.data?.action || "Set mode to Sleep",
      cooldownSeconds: item.data?.cooldown_seconds || 60
    });
    setIsModalOpen(true);
  };

  const downloadBackup = async (includeSecrets = false) => {
    try {
      const response = await api.get(`/backup/export`, {
        params: { include_secrets: includeSecrets }
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = includeSecrets ? 'mmwave-dashboard-backup-with-secrets.json' : 'mmwave-dashboard-backup.json';
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to export backup');
    }
  };

  const saveRetention = async () => {
    try {
      const response = await api.put(`/settings/retention`, {
        sensor_record_limit: Number(retention.sensor_record_limit) || 1000,
        log_limit: Number(retention.log_limit) || 1000
      });
      setRetention(response.data);
      toast.success('Retention settings saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save retention settings');
    }
  };

  const formatLastRun = (value) => {
    if (!value) return "Never run";
    return new Date(value).toLocaleString();
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full pb-10">
      <main className="flex-1 space-y-8">
        
        {/* --- SYSTEM & BACKUPS SECTION --- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-primary mb-1">System & Backup</h2>
            <p className="text-sm text-gray-500">Manage database retention, backups, and view local server diagnostics.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Local Backup */}
            <Card className="rounded-xl border border-gray-100 dark:border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Local Backup
                </CardTitle>
                <CardDescription>Export dashboard data from this local backend.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" className="dark:text-primary dark:border-primary/30 dark:hover:bg-primary/10" onClick={() => downloadBackup(false)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Backup
                </Button>
                <Button variant="ghost" onClick={() => downloadBackup(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export With Keys
                </Button>
              </CardContent>
            </Card>

            {/* Retention */}
            <Card className="rounded-xl border border-gray-100 dark:border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Retention
                </CardTitle>
                <CardDescription>Control local database growth.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="sensorLimit" className="text-xs">Sensor records</Label>
                    <Input
                      id="sensorLimit"
                      type="number"
                      min="100"
                      max="100000"
                      value={retention.sensor_record_limit}
                      onChange={(e) => setRetention({ ...retention, sensor_record_limit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="logLimit" className="text-xs">Logs</Label>
                    <Input
                      id="logLimit"
                      type="number"
                      min="100"
                      max="100000"
                      value={retention.log_limit}
                      onChange={(e) => setRetention({ ...retention, log_limit: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={saveRetention} className="w-full">Save Retention</Button>
              </CardContent>
            </Card>

            {/* Diagnostics */}
            <Card className="rounded-xl border border-gray-100 dark:border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Diagnostics
                </CardTitle>
                <CardDescription>Quick local backend status.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Devices</p>
                  <p className="text-gray-900 dark:text-primary font-medium">{diagnostics?.devices?.online || 0} online / {diagnostics?.devices?.total || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">DB size</p>
                  <p className="text-gray-900 dark:text-primary font-medium">{diagnostics?.database?.database_size_mb ?? 0} MB</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Scheduler</p>
                  <p className="text-gray-900 dark:text-primary font-medium">{diagnostics?.scheduler?.interval_seconds || 30}s</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Recent errors</p>
                  <p className="text-gray-900 dark:text-primary font-medium">{diagnostics?.logs?.recent_errors?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="border-t border-gray-200 dark:border-border" />

        {/* --- AUTOMATIONS SECTION --- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-primary mb-1">Automations</h2>
            <p className="text-sm text-gray-500">Configure daily routines and automation rules triggered by sensor events.</p>
          </div>

          {!selectedDevice ? (
            <Card className="rounded-xl border border-gray-100 dark:border-border shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <SlidersHorizontal className="h-16 w-16 text-gray-300 dark:text-primary mb-4" />
                <h3 className="text-base text-gray-900 dark:text-primary mb-2">Select a device</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Use the device selector to choose a device to manage automations for.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Tabs value={activeAutoTab} onValueChange={setActiveAutoTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
                  <TabsList className="bg-white dark:bg-background border border-gray-200 dark:border-border shadow-sm p-1 rounded-lg h-auto">
                    <TabsTrigger value="routines" className="rounded-md px-6 py-2.5 text-sm data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-slate-800 dark:bg-background data-[state=active]:text-gray-900 dark:text-primary data-[state=active]:shadow-none transition-all">
                      <CalendarDays className="w-4 h-4 mr-2" />
                      Daily Routines
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="rounded-md px-6 py-2.5 text-sm data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-slate-800 dark:bg-background data-[state=active]:text-gray-900 dark:text-primary data-[state=active]:shadow-none transition-all">
                      <Zap className="w-4 h-4 mr-2" />
                      Activity Rules
                    </TabsTrigger>
                  </TabsList>
                  <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 dark:bg-primary dark:text-black hover:bg-emerald-700 dark:hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 rounded-lg px-5">
                    <Plus size={18} />
                    Create New Rule
                  </Button>
                </div>

                {/* Routines View */}
                <TabsContent value="routines" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {routines.map((routine) => (
                      <Card key={routine.id} className={`overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-md group ${routine.active ? routine.color : "bg-white dark:bg-background border-gray-200 dark:border-border opacity-80"}`}>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-xl shadow-sm border ${routine.active ? routine.iconBg + ' border-[#ffffff40]' : 'bg-gray-100 dark:bg-background border-gray-200 dark:border-border'}`}>
                              {routine.icon}
                            </div>
                            <Switch
                              checked={routine.active}
                              onCheckedChange={() => toggleRoutine(routine.id)}
                              className={routine.active ? "data-[state=checked]:bg-emerald-500" : ""}
                            />
                          </div>

                          <div className="mb-4">
                            <h3 className={`text-lg mb-1 ${routine.active ? 'text-gray-900 dark:text-primary' : 'text-gray-500'}`}>
                              {routine.title}
                            </h3>
                            <p className={`text-sm leading-relaxed min-h-[40px] ${routine.active ? 'text-gray-700 dark:text-zinc-300' : 'text-gray-400'}`}>
                              {routine.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 mb-5">
                            <Clock className={`w-4 h-4 ${routine.active ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400'}`} />
                            <span className={`text-sm ${routine.active ? 'text-gray-700 dark:text-zinc-300' : 'text-gray-400'}`}>
                              {routine.time}
                            </span>
                          </div>

                          <div className="mb-5 text-xs text-gray-500">
                            <p>Last run: {formatLastRun(routine.lastRunAt)}</p>
                            <p>Runs: {routine.runCount}{routine.lastStatus ? ` · ${routine.lastStatus}` : ""}</p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                            {routine.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className={` text-xs px-2.5 py-0.5 rounded-md ${routine.active ? 'bg-white dark:bg-background/60 text-gray-700 dark:text-zinc-300' : 'bg-gray-100 dark:bg-background text-gray-400'}`}>
                                {tag}
                              </Badge>
                            ))}
                            <button onClick={() => handleEditAutomation(routine)} className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5`}>
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            <button onClick={() => handleDeleteAutomation(routine.id)} className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5`}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {!loadingAutomations && routines.length === 0 && (
                      <Card className="flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-border bg-white dark:bg-background min-h-[260px] rounded-xl">
                        <p className="text-gray-700 dark:text-zinc-300">No routines yet for this device</p>
                        <p className="text-sm text-gray-500 mt-1">Create your first routine automation</p>
                      </Card>
                    )}

                    <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 border-gray-200 dark:border-border bg-gray-50 dark:bg-background/50 hover:bg-gray-50 dark:bg-background transition-colors cursor-pointer min-h-[260px] rounded-xl group" onClick={() => setIsModalOpen(true)}>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="text-gray-700 dark:text-zinc-300">Add New Routine</p>
                      <p className="text-sm text-gray-500 mt-1 max-w-[200px] text-center">Create a schedule-based automation</p>
                    </Card>
                  </div>
                </TabsContent>

                {/* Rules View */}
                <TabsContent value="rules" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {rules.map((rule) => (
                      <Card key={rule.id} className={`overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-md group ${rule.active ? rule.color : "bg-white dark:bg-background border-gray-200 dark:border-border opacity-80"}`}>
                        <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">
                          <div className={`p-3 rounded-xl shadow-sm border shrink-0 ${rule.active ? rule.iconBg + ' border-[#ffffff40]' : 'bg-gray-100 dark:bg-background border-gray-200 dark:border-border'}`}>
                            {rule.icon}
                          </div>
                          <div className="flex-1 w-full">
                            <div className="flex justify-between items-start mb-1">
                              <h3 className={`text-lg ${rule.active ? 'text-gray-900 dark:text-primary' : 'text-gray-500'}`}>
                                {rule.title}
                              </h3>
                              <Switch
                                checked={rule.active}
                                onCheckedChange={() => toggleRule(rule.id)}
                                className={rule.active ? "data-[state=checked]:bg-emerald-500" : ""}
                              />
                            </div>
                            <p className={`text-sm mb-4 leading-relaxed ${rule.active ? 'text-gray-700 dark:text-zinc-300' : 'text-gray-400'}`}>
                              {rule.description}
                            </p>
                            <div className="mb-4 text-xs text-gray-500">
                              <p>Last run: {formatLastRun(rule.lastRunAt)}</p>
                              <p>Runs: {rule.runCount}{rule.lastStatus ? ` · ${rule.lastStatus}` : ""}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto pt-4 border-t border-black/5">
                              <div className="flex flex-wrap gap-2">
                                {rule.tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className={` text-xs px-2.5 py-0.5 rounded-md border-black/10 ${rule.active ? 'bg-white dark:bg-background/50 text-gray-700 dark:text-zinc-300' : 'bg-gray-50 dark:bg-background text-gray-400 border-gray-200 dark:border-border'}`}>
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditAutomation(rule)} className={`gap-1 text-xs h-8 hover:bg-white dark:bg-background/50 ${rule.active ? 'text-gray-700 dark:text-zinc-300' : 'text-gray-400'}`}>
                                  Configure <ArrowRight className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteAutomation(rule.id)} className="gap-1 text-xs h-8 text-red-600 hover:bg-red-50">
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {!loadingAutomations && rules.length === 0 && (
                      <Card className="flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-border bg-white dark:bg-background min-h-[180px] rounded-xl">
                        <p className="text-gray-700 dark:text-zinc-300">No activity rules yet for this device</p>
                        <p className="text-sm text-gray-500 mt-1">Create your first condition-based rule</p>
                      </Card>
                    )}

                    <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 border-gray-200 dark:border-border bg-gray-50 dark:bg-background/50 hover:bg-gray-50 dark:bg-background transition-colors cursor-pointer min-h-[180px] rounded-xl group" onClick={() => setIsModalOpen(true)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-gray-700 dark:text-zinc-300">Add Custom Rule</p>
                          <p className="text-sm text-gray-500 mt-0.5">Define logic based on activity & vitals</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Automation Run History */}
              <Card className="border border-gray-200 dark:border-border bg-white dark:bg-background shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-base text-gray-900 dark:text-primary">Automation Run History</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadAutomations}>Refresh</Button>
                  </div>
                  <div className="grid gap-2">
                    {automationHistory.length === 0 ? (
                      <p className="text-sm text-gray-500">No automation runs recorded yet.</p>
                    ) : (
                      automationHistory.map((item) => (
                        <div key={item.id} className="flex flex-col gap-1 rounded-lg border border-gray-100 dark:border-border bg-gray-50 dark:bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-primary">{item.event}</p>
                            <p className="text-xs text-gray-500">
                              {(item.metadata?.action || "Action")} {item.metadata?.result ? `· ${item.metadata.result}` : ""}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </main>

      {/* Automations Modal Portal */}
      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: 9999 }}
          onClick={() => { setIsModalOpen(false); setEditingAutomation(null); resetCreateForm(); }}
        >
          <Card className="w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-border bg-white dark:bg-background">
              <h2 className="text-xl text-gray-900 dark:text-primary">{editingAutomation ? "Edit Automation" : "Create New Automation"}</h2>
              <p className="text-sm text-gray-500">This will be saved to your selected device</p>
            </div>
            <CardContent className="p-6 bg-gray-50 dark:bg-background flex flex-col gap-4">
              <div className="grid gap-2">
                <label className="text-sm text-gray-700 dark:text-zinc-300">Automation Title</label>
                <input
                  type="text"
                  placeholder="e.g. Nightlight mode"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file: placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-gray-700 dark:text-zinc-300">Description</label>
                <input
                  type="text"
                  placeholder="What this automation does"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file: placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-gray-700 dark:text-zinc-300">When this happens (Trigger)</label>
                <select
                  value={createForm.trigger}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, trigger: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <option value="Specific Time">Specific Time</option>
                  <option>Presence detected</option>
                  <option>Fall detected</option>
                  {!isStd && <option>Sleep state is Deep Sleep</option>}
                </select>
              </div>
              {createForm.trigger === "Specific Time" && (
                <div className="grid gap-2 animate-in slide-in-from-top-1 duration-200">
                  <label className="text-sm text-gray-700 dark:text-zinc-300">Select Time</label>
                  <input
                    type="time"
                    value={createForm.timeInput}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, timeInput: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  />
                </div>
              )}
              <div className="grid gap-2 mb-4">
                <label className="text-sm text-gray-700 dark:text-zinc-300">Do this (Action)</label>
                <select
                  value={createForm.action}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, action: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  {!isStd && <option>Set mode to Sleep</option>}
                  <option>Set mode to Fall Detection</option>
                  <option>Turn Relay ON</option>
                  <option>Turn Relay OFF</option>
                </select>
              </div>
              <div className="grid gap-2 mb-4">
                <label className="text-sm text-gray-700 dark:text-zinc-300">Cooldown seconds</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={createForm.cooldownSeconds}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, cooldownSeconds: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border">
                <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingAutomation(null); resetCreateForm(); }}>Cancel</Button>
                <Button className="bg-emerald-600 dark:bg-primary dark:text-black hover:bg-emerald-700 dark:hover:bg-primary/90 text-white" disabled={isSaving} onClick={handleCreateAutomation}>
                  {isSaving ? "Saving..." : (editingAutomation ? "Update Automation" : "Save Rule")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
