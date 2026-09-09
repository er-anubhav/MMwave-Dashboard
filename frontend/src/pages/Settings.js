import { useOutletContext } from "react-router-dom";
import { useEffect, useState, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import Section from "../components/ui/Section";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import {
  Clock,
  Download,
  Plus,
  Sun,
  Moon,
  Zap,
  Play,
  ShieldAlert,
  CalendarDays,
  MoreVertical,
  SlidersHorizontal,
  Trash2,
  History,
  DatabaseBackup,
  DatabaseZap,
  Stethoscope,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from "../api/api";
import { toast } from 'sonner';
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";

function getAutomationUi(automationType, title) {
  const lowerTitle = (title || "").toLowerCase();

  if (automationType === "routine") {
    if (lowerTitle.includes("morning")) {
      return { icon: <Sun className="h-4 w-4 text-warning" />, secondaryLabel: "Scheduled" };
    }
    if (lowerTitle.includes("sleep") || lowerTitle.includes("bed")) {
      return { icon: <Moon className="h-4 w-4 text-primary" />, secondaryLabel: "Night" };
    }
    return { icon: <CalendarDays className="h-4 w-4 text-primary" />, secondaryLabel: "Routine" };
  }

  if (lowerTitle.includes("fall")) {
    return { icon: <ShieldAlert className="h-4 w-4 text-destructive" />, secondaryLabel: "Safety" };
  }

  if (lowerTitle.includes("focus") || lowerTitle.includes("movie")) {
    return { icon: <Play className="h-4 w-4 text-primary" />, secondaryLabel: "Custom Logic" };
  }

  return { icon: <Zap className="h-4 w-4 text-primary" />, secondaryLabel: "Rule" };
}

const fieldClass =
  "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

export default function Settings() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({ title: "Settings" });
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
  const [deleteTarget, setDeleteTarget] = useState(null);
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
          icon: ui.icon
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

  const renderAutomationCards = (items, toggleFn, isRule) => (
    <div className={isRule ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"}>
      {items.map((item) => (
        <Card key={item.id} className={`group overflow-hidden ${item.active ? "" : "opacity-70"}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/60">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.condition}</p>
                </div>
              </div>
              <Switch
                checked={item.active}
                onCheckedChange={() => toggleFn(item.id)}
                aria-label={`Toggle ${item.title}`}
              />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{item.time}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {item.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="px-2 py-0.5 text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEditAutomation(item)}
                  aria-label={`Edit ${item.title}`}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(item.id)}
                  aria-label={`Delete ${item.title}`}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const addTile = (label, onClick, compact = false) => (
    <button
      onClick={onClick}
      type="button"
      className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-transparent text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${compact ? "py-4" : "py-8"}`}
    >
      <Plus className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        title="Settings"
        description="Automation rules, system retention, backups, and local diagnostics."
      />

      {/* ── SYSTEM & BACKUP ── */}
      <Section
        title="System & Backup"
        description="Manage database retention, backups, and local server diagnostics."
      >
        <div className="rounded-lg border border-border bg-card shadow-surface-sm">
          {/* Backup */}
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <DatabaseBackup className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Backup</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Export dashboard data from this local backend.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadBackup(false)}>
                  <Download className="h-3.5 w-3.5" />
                  Export Backup
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadBackup(true)}>
                  Export With Keys
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Retention */}
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                <DatabaseZap className="h-4 w-4 text-primary" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">Retention</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Control local database growth.</p>
              </div>
            </div>
            <div className="mt-4 grid max-w-xl grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sensorLimit" className="text-xs text-muted-foreground">Sensor records</Label>
                <Input
                  id="sensorLimit"
                  type="number"
                  min="100"
                  max="100000"
                  value={retention.sensor_record_limit}
                  onChange={(e) => setRetention({ ...retention, sensor_record_limit: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logLimit" className="text-xs text-muted-foreground">Logs</Label>
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
            <Button variant="secondary" className="mt-4" onClick={saveRetention}>Save Retention</Button>
          </div>

          <div className="h-px bg-border" />

          {/* Diagnostics */}
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success-soft">
                <Stethoscope className="h-4 w-4 text-success" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">Diagnostics</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Quick local backend status.</p>
              </div>
            </div>
            <div className="mt-4 grid max-w-xl grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Devices</p>
                <p className="mt-0.5 font-numeric text-sm font-semibold text-foreground">
                  {diagnostics?.devices?.online || 0} online / {diagnostics?.devices?.total || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Database size</p>
                <p className="mt-0.5 font-numeric text-sm font-semibold text-foreground">
                  {diagnostics?.database?.database_size_mb ?? 0} MB
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduler</p>
                <p className="mt-0.5 font-numeric text-sm font-semibold text-foreground">
                  {diagnostics?.scheduler?.interval_seconds || 30}s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recent errors</p>
                <p
                  className={cn(
                    "mt-0.5 font-numeric text-sm font-semibold",
                    (diagnostics?.logs?.recent_errors?.length || 0) > 0 ? "text-destructive" : "text-success"
                  )}
                >
                  {diagnostics?.logs?.recent_errors?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── AUTOMATIONS ── */}
      <Section
        title="Automations"
        description="Configure daily routines and automation rules triggered by sensor events."
        action={
          <Button onClick={() => { setEditingAutomation(null); resetCreateForm(); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Create New Rule
          </Button>
        }
      >
        {!selectedDevice ? (
          <Card className="rounded-lg border border-border bg-card">
            <CardContent>
              <EmptyState
                icon={<SlidersHorizontal className="h-5 w-5" />}
                title="Select a device"
                description="Use the device selector to choose a device to manage automations for."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Tabs value={activeAutoTab} onValueChange={setActiveAutoTab} className="w-full">
              <TabsList className="flex h-auto w-full justify-start gap-6 border-b border-border bg-transparent p-0">
                <TabsTrigger
                  value="routines"
                  className="rounded-none border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Daily Routines
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="rounded-none border-b-2 border-transparent pb-2.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Activity Rules
                </TabsTrigger>
              </TabsList>

              {/* Routines View */}
              <TabsContent value="routines" className="mt-5 outline-none">
                {loadingAutomations ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Loading routines…</p>
                ) : routines.length === 0 ? (
                  <Card className="rounded-lg border border-border bg-card">
                    <CardContent>
                      <EmptyState
                        icon={<CalendarDays className="h-5 w-5" />}
                        title="No routines configured"
                        description="Create a routine to automatically respond to sensor events and daily schedules."
                        action={
                          <Button size="sm" onClick={() => { setEditingAutomation(null); resetCreateForm(); setIsModalOpen(true); }}>
                            <Plus className="h-4 w-4" />
                            Create routine
                          </Button>
                        }
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {renderAutomationCards(routines, toggleRoutine, false)}
                    {addTile("Add routine", () => { setEditingAutomation(null); resetCreateForm(); setIsModalOpen(true); }, true)}
                  </>
                )}
              </TabsContent>

              {/* Rules View */}
              <TabsContent value="rules" className="mt-5 outline-none">
                {loadingAutomations ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Loading rules…</p>
                ) : rules.length === 0 ? (
                  <Card className="rounded-lg border border-border bg-card">
                    <CardContent>
                      <EmptyState
                        icon={<Zap className="h-5 w-5" />}
                        title="No activity rules configured"
                        description="Create a rule that responds to sensor activity and vital events."
                        action={
                          <Button size="sm" onClick={() => { setEditingAutomation(null); resetCreateForm(); setIsModalOpen(true); }}>
                            <Plus className="h-4 w-4" />
                            Create rule
                          </Button>
                        }
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {renderAutomationCards(rules, toggleRule, true)}
                    {addTile("Add rule", () => { setEditingAutomation(null); resetCreateForm(); setIsModalOpen(true); }, true)}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Automation Run History */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold tracking-tight text-foreground">Automation Run History</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadAutomations}>Refresh</Button>
                </div>
                <div className="grid gap-1.5">
                  {automationHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No automation runs recorded yet.</p>
                  ) : (
                    automationHistory.map((item) => (
                      <div key={item.id} className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.event}</p>
                          <p className="text-xs text-muted-foreground">
                            {(item.metadata?.action || "Action")} {item.metadata?.result ? `· ${item.metadata.result}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
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
      </Section>

      {/* ── Automation Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) { setEditingAutomation(null); resetCreateForm(); }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? "Edit Automation" : "Create New Automation"}</DialogTitle>
            <DialogDescription>
              {editingAutomation ? "Update the automation configuration." : "This will be saved to your selected device."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="automation-title" className="text-sm text-foreground">Automation Title</Label>
              <Input
                id="automation-title"
                type="text"
                placeholder="e.g. Nightlight mode"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="automation-desc" className="text-sm text-foreground">Description</Label>
              <Input
                id="automation-desc"
                type="text"
                placeholder="What this automation does"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="automation-trigger" className="text-sm text-foreground">When this happens (Trigger)</Label>
              <select
                id="automation-trigger"
                value={createForm.trigger}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, trigger: e.target.value }))}
                className={fieldClass}
              >
                <option value="Specific Time">Specific Time</option>
                <option>Presence detected</option>
                <option>Fall detected</option>
                {!isStd && <option>Sleep state is Deep Sleep</option>}
              </select>
            </div>

            {createForm.trigger === "Specific Time" && (
              <div className="grid gap-2">
                <Label htmlFor="automation-time" className="text-sm text-foreground">Select Time</Label>
                <Input
                  id="automation-time"
                  type="time"
                  value={createForm.timeInput}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, timeInput: e.target.value }))}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="automation-action" className="text-sm text-foreground">Do this (Action)</Label>
              <select
                id="automation-action"
                value={createForm.action}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, action: e.target.value }))}
                className={fieldClass}
              >
                {!isStd && <option>Set mode to Sleep</option>}
                <option>Set mode to Fall Detection</option>
                <option>Turn Relay ON</option>
                <option>Turn Relay OFF</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="automation-cooldown" className="text-sm text-foreground">Cooldown seconds</Label>
              <Input
                id="automation-cooldown"
                type="number"
                min="5"
                step="5"
                value={createForm.cooldownSeconds}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, cooldownSeconds: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingAutomation(null); resetCreateForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateAutomation} disabled={isSaving}>
              {isSaving ? "Saving…" : (editingAutomation ? "Update Automation" : "Save Rule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the automation and its run history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDeleteAutomation(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}