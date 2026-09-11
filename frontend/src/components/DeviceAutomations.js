import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import EmptyState from "./ui/EmptyState";
import {
  Clock,
  Plus,
  Sun,
  Moon,
  Bot,
  Play,
  ShieldAlert,
  CalendarDays,
  MoreVertical,
  Trash2,
  History,
} from "lucide-react";
import api from "../api/api";
import { toast } from "sonner";

function getAutomationUi(automationType, title) {
  const lowerTitle = (title || "").toLowerCase();

  if (automationType === "routine") {
    if (lowerTitle.includes("morning")) {
      return { icon: <Sun className="h-4 w-4 text-amber-500" />, secondaryLabel: "Scheduled" };
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

  return { icon: <Bot className="h-4 w-4 text-primary" />, secondaryLabel: "Rule" };
}

export default function DeviceAutomations({ device }) {
  const [routines, setRoutines] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeAutoTab, setActiveAutoTab] = useState("rules");
  const [loadingAutomations, setLoadingAutomations] = useState(false);
  const [automationHistory, setAutomationHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isStd = device?.device_id?.toUpperCase().startsWith("STD");

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    trigger: "Presence detected",
    timeInput: "22:00",
    action: isStd ? "Turn Relay OFF" : "Set mode to Sleep",
    cooldownSeconds: 60,
  });

  const loadAutomations = useCallback(async () => {
    if (!device?.device_id) return;

    setLoadingAutomations(true);
    try {
      const [response, historyResponse] = await Promise.all([
        api.get(`/automations`, {
          params: { device_id: device.device_id },
        }),
        api.get(`/automations/history`, {
          params: { device_id: device.device_id, limit: 10 },
        }),
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
          icon: ui.icon,
        };
      });

      setRoutines(mapped.filter((item) => item.type === "routine"));
      setRules(mapped.filter((item) => item.type === "rule"));
      setAutomationHistory(historyResponse.data?.history || []);
    } catch (error) {
      console.warn("Could not load automations for device:", error);
    } finally {
      setLoadingAutomations(false);
    }
  }, [device?.device_id]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const updateAutomationActive = async (item, nextActive) => {
    try {
      await api.put(`/automations/${item.id}`, {
        title: item.title,
        description: item.description,
        active: nextActive,
        data: item.data || {},
      });
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Failed to update automation");
    }
  };

  const toggleRoutine = async (id) => {
    const selected = routines.find((item) => item.id === id);
    if (!selected) return;

    const nextActive = !selected.active;
    setRoutines(routines.map((item) => (item.id === id ? { ...item, active: nextActive } : item)));
    try {
      await updateAutomationActive(selected, nextActive);
      toast.success(`Routine ${nextActive ? "enabled" : "disabled"}`);
    } catch (error) {
      setRoutines(routines.map((item) => (item.id === id ? { ...item, active: selected.active } : item)));
      toast.error(error.message);
    }
  };

  const toggleRule = async (id) => {
    const selected = rules.find((item) => item.id === id);
    if (!selected) return;

    const nextActive = !selected.active;
    setRules(rules.map((item) => (item.id === id ? { ...item, active: nextActive } : item)));
    try {
      await updateAutomationActive(selected, nextActive);
      toast.success(`Rule ${nextActive ? "enabled" : "disabled"}`);
    } catch (error) {
      setRules(rules.map((item) => (item.id === id ? { ...item, active: selected.active } : item)));
      toast.error(error.message);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      description: "",
      trigger: "Presence detected",
      timeInput: "22:00",
      action: isStd ? "Turn Relay OFF" : "Set mode to Sleep",
      cooldownSeconds: 60,
    });
  };

  const handleCreateAutomation = async () => {
    if (!device?.device_id) return;
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

    const isRoutine = createForm.trigger === "Specific Time";
    const automationType = isRoutine ? "routine" : "rule";

    const payload = {
      title: createForm.title.trim(),
      description:
        createForm.description.trim() ||
        (isRoutine
          ? `At ${formatTimeLabel(createForm.timeInput)}, ${createForm.action}`
          : `When ${createForm.trigger.toLowerCase()}, ${createForm.action}`),
      automation_type: automationType,
      active: true,
      tags: [isRoutine ? "Schedule" : "Event", isStd ? "Switch" : "Sensor"],
      data: {
        trigger: createForm.trigger,
        action: createForm.action,
        cooldown_seconds: parseInt(createForm.cooldownSeconds, 10) || 60,
        ...(isRoutine
          ? {
              time: formatTimeLabel(createForm.timeInput),
              raw_time: createForm.timeInput,
              days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
            }
          : {}),
      },
    };

    setIsSaving(true);
    try {
      if (editingAutomation) {
        await api.put(`/automations/${editingAutomation.id}`, payload);
        toast.success("Automation updated successfully");
      } else {
        await api.post(`/automations`, {
          ...payload,
          device_id: device.device_id,
        });
        toast.success("New automation rule created");
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

  const handleEditAutomation = (item) => {
    setEditingAutomation(item);
    setCreateForm({
      title: item.title,
      description: item.description,
      trigger: item.data?.trigger || "Presence detected",
      timeInput: item.data?.raw_time || "22:00",
      action: item.data?.action || (isStd ? "Turn Relay OFF" : "Set mode to Sleep"),
      cooldownSeconds: item.data?.cooldown_seconds || 60,
    });
    setIsModalOpen(true);
  };

  const handleDeleteAutomation = async (id) => {
    try {
      await api.delete(`/automations/${id}`);
      toast.success("Automation removed");
      setDeleteTarget(null);
      await loadAutomations();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete automation");
    }
  };

  const renderCards = (items, toggleFn) => (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.id} className="group border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary">
                    {item.icon}
                  </div>
                  <h4 className="font-normal text-sm text-foreground">{item.title}</h4>
                </div>
                <Switch
                  checked={item.active}
                  onCheckedChange={() => toggleFn(item.id)}
                  aria-label={`Toggle ${item.title}`}
                />
              </div>
              <p className="mt-2 text-xs font-normal text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                <Clock className="h-3 w-3" />
                <span>{item.time || item.condition}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleEditAutomation(item)}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-normal tracking-tight text-foreground flex items-center gap-2">
            Device Automations
          </h2>
          <p className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
            Smart rules and automations linked exclusively to {device.name}
          </p>
        </div>

        <Button
          size="sm"
          className="h-8 text-xs font-normal bg-primary text-white hover:bg-primary/90 gap-1.5 self-start sm:self-auto"
          onClick={() => {
            setEditingAutomation(null);
            resetCreateForm();
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Automation Rule
        </Button>
      </div>

      <Tabs value={activeAutoTab} onValueChange={setActiveAutoTab} className="w-full">
        <TabsList className="bg-secondary/60 p-0.5 h-8">
          <TabsTrigger value="rules" className="text-xs font-normal h-7 px-3">
            Activity & Sensor Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="routines" className="text-xs font-normal h-7 px-3">
            Scheduled Routines ({routines.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-3 outline-none">
          {loadingAutomations ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading rules...</p>
          ) : rules.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                <EmptyState
                  icon={<Bot className="h-5 w-5 text-primary" />}
                  title="No activity rules active"
                  description={
                    isStd
                      ? "Create a rule to turn off switch when room is vacant for 5 minutes, or turn on upon presence."
                      : "Create a rule to respond to room presence, subtle motion, or vital changes."
                  }
                  action={
                    <Button
                      size="sm"
                      className="h-8 text-xs font-normal bg-primary text-white"
                      onClick={() => {
                        setEditingAutomation(null);
                        resetCreateForm();
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Rule
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            renderCards(rules, toggleRule)
          )}
        </TabsContent>

        <TabsContent value="routines" className="mt-3 outline-none">
          {loadingAutomations ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading routines...</p>
          ) : routines.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="p-6">
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5 text-primary" />}
                  title="No scheduled routines"
                  description="Set time-of-day schedules for night safety, power saving, or morning wake-up."
                  action={
                    <Button
                      size="sm"
                      className="h-8 text-xs font-normal bg-primary text-white"
                      onClick={() => {
                        setEditingAutomation(null);
                        setCreateForm({
                          title: "Night Routine",
                          description: "",
                          trigger: "Specific Time",
                          timeInput: "23:00",
                          action: isStd ? "Turn Relay OFF" : "Set mode to Sleep",
                          cooldownSeconds: 60,
                        });
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Scheduled Routine
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            renderCards(routines, toggleRoutine)
          )}
        </TabsContent>
      </Tabs>

      {/* Automation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-normal">
              {editingAutomation ? "Edit Automation Rule" : "Create New Automation"}
            </DialogTitle>
            <DialogDescription className="text-xs font-normal">
              Applied exclusively to {device.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-normal text-muted-foreground">Title</Label>
              <Input
                placeholder="e.g., Turn off switch on room vacancy"
                className="text-xs font-normal h-8"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-normal text-muted-foreground">When this happens (Trigger)</Label>
              <select
                value={createForm.trigger}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, trigger: e.target.value }))}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-normal text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Presence detected">Presence detected</option>
                <option value="No presence for 5 mins">No presence for 5 mins</option>
                <option value="Fall detected">Fall detected</option>
                <option value="Specific Time">Specific Scheduled Time</option>
              </select>
            </div>

            {createForm.trigger === "Specific Time" && (
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  className="text-xs font-normal h-8"
                  value={createForm.timeInput}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, timeInput: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-normal text-muted-foreground">Take this action</Label>
              <select
                value={createForm.action}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, action: e.target.value }))}
                className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-normal text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Turn Relay ON">Turn Smart Relay ON</option>
                <option value="Turn Relay OFF">Turn Smart Relay OFF</option>
                {!isStd && <option value="Set mode to Sleep">Set mode to Sleep Monitoring</option>}
                {!isStd && <option value="Set mode to Fall Detection">Set mode to Fall Detection</option>}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-normal h-8"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs font-normal h-8 bg-primary text-white hover:bg-primary/90"
              onClick={handleCreateAutomation}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingAutomation ? "Update Rule" : "Save Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-normal">Delete Automation?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-normal">
              This automation rule will be permanently deleted from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-normal">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs font-normal bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDeleteAutomation(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
