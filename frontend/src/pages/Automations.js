import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
 Plus,
 Clock,
 Sun,
 Moon,
 Zap,
 Play,
 ShieldAlert,
 CalendarDays,
 ArrowRight,
 MoreVertical,
 SlidersHorizontal,
 Activity,
 Trash2,
 History
} from "lucide-react";
import DashboardNavbar from "../components/DashboardNavbar";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

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
 color: "bg-amber-50 border-amber-100",
 iconBg: "bg-white/80",
 secondaryLabel: "Scheduled"
 };
 }
 if (lowerTitle.includes("sleep") || lowerTitle.includes("bed")) {
 return {
 icon: <Moon className="w-5 h-5 text-indigo-500" />,
 color: "bg-indigo-50 border-indigo-100",
 iconBg: "bg-white/80",
 secondaryLabel: "Night"
 };
 }
 return {
 icon: <CalendarDays className="w-5 h-5 text-emerald-600" />,
 color: "bg-emerald-50 border-emerald-100",
 iconBg: "bg-white/80",
 secondaryLabel: "Routine"
 };
 }

 if (lowerTitle.includes("fall")) {
 return {
 icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
 color: "bg-rose-50 border-rose-100",
 iconBg: "bg-white/80",
 secondaryLabel: "Safety"
 };
 }

 if (lowerTitle.includes("focus") || lowerTitle.includes("movie")) {
 return {
 icon: <Play className="w-5 h-5 text-purple-600" />,
 color: "bg-purple-50 border-purple-100",
 iconBg: "bg-white/80",
 secondaryLabel: "Custom Logic"
 };
 }

 return {
 icon: <Zap className="w-5 h-5 text-emerald-600" />,
 color: "bg-emerald-50 border-emerald-100",
 iconBg: "bg-white/80",
 secondaryLabel: "Rule"
 };
}

export default function Automations() {
 const { selectedDevice } = useDevice();
 const { mode, handleModeChange, isConnected, lastUpdated } = useDeviceData(selectedDevice);

 const [routines, setRoutines] = useState([]);
 const [rules, setRules] = useState([]);
 const [activeTab, setActiveTab] = useState("routines");
 const [loadingAutomations, setLoadingAutomations] = useState(false);
 const [automationHistory, setAutomationHistory] = useState([]);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingAutomation, setEditingAutomation] = useState(null);
 const [isSaving, setIsSaving] = useState(false);
 const [createForm, setCreateForm] = useState({
 title: "",
 description: "",
 trigger: "Time is 10:00 PM",
 action: "Set mode to Sleep",
 cooldownSeconds: 60
 });

 const formatLastRun = (value) => {
 if (!value) {
 return "Never run";
 }
 return new Date(value).toLocaleString();
 };

 const loadAutomations = async () => {
 if (!selectedDevice) {
 setRoutines([]);
 setRules([]);
 return;
 }

 setLoadingAutomations(true);
 try {
 const [response, historyResponse] = await Promise.all([
 axios.get(`${API}/automations`, {
 params: { device_id: selectedDevice.device_id }
 }),
 axios.get(`${API}/automations/history`, {
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
 };

 useEffect(() => {
 loadAutomations();
 }, [selectedDevice]);

 const updateAutomationActive = async (item, nextActive) => {
 try {
 await axios.put(`${API}/automations/${item.id}`, {
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
 if (!selected) {
 return;
 }

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
 if (!selected) {
 return;
 }

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
 trigger: "Time is 10:00 PM",
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

 setIsSaving(true);
 try {
 const automationType = editingAutomation
 ? editingAutomation.type
 : (activeTab === "routines" ? "routine" : "rule");
 const payload = {
 title: createForm.title.trim(),
 description: createForm.description.trim(),
 active: editingAutomation ? editingAutomation.active : true,
 data: {
 trigger: createForm.trigger,
 action: createForm.action,
 cooldown_seconds: Number(createForm.cooldownSeconds) || 60,
 tags: automationType === "routine" ? ["Time Constraint", "Relay Control"] : ["Activity Based", "Custom Logic"],
 time: automationType === "routine" ? createForm.trigger.replace("Time is ", "") : "Condition-driven"
 }
 };

 if (editingAutomation) {
 await axios.put(`${API}/automations/${editingAutomation.id}`, payload);
 toast.success("Automation updated");
 } else {
 await axios.post(`${API}/automations`, {
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
 if (!window.confirm("Delete this automation?")) {
 return;
 }

 try {
 await axios.delete(`${API}/automations/${id}`);
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
 trigger: item.data?.trigger || "Time is 10:00 PM",
 action: item.data?.action || "Set mode to Sleep",
 cooldownSeconds: item.data?.cooldown_seconds || 60
 });
 setIsModalOpen(true);
 };

 if (!selectedDevice) {
 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 <DashboardNavbar mode={mode} onModeChange={handleModeChange} isConnected={false} lastUpdated={null} title="Automations" />
 <main className="py-8">
 <Card className="rounded-xl border border-gray-100 shadow-sm">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <SlidersHorizontal className="h-16 w-16 text-gray-300 mb-4" />
 <h3 className="text-base text-gray-900 mb-2">Select a device</h3>
 <p className="text-gray-600 text-center">
 Use the device selector to choose a device to manage automations for.
 </p>
 </CardContent>
 </Card>
 </main>
 </motion.div>
 );
 }

 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full pb-10">
 <DashboardNavbar
 mode={mode}
 onModeChange={handleModeChange}
 isConnected={isConnected}
 lastUpdated={lastUpdated}
 title="Automations"
 />
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
 <TabsList className="bg-white border border-gray-200 shadow-sm p-1 rounded-lg h-auto">
 <TabsTrigger value="routines" className="rounded-md px-6 py-2.5 text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none transition-all">
 <CalendarDays className="w-4 h-4 mr-2" />
 Daily Routines
 </TabsTrigger>
 <TabsTrigger value="rules" className="rounded-md px-6 py-2.5 text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none transition-all">
 <Zap className="w-4 h-4 mr-2" />
 Activity Rules
 </TabsTrigger>
 </TabsList>
 <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 rounded-lg px-5">
 <Plus size={18} />
 Create New Rule
 </Button>
 </div>

 {/* --- DAILY ROUTINES TAB --- */}
 <TabsContent value="routines" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
 {routines.map((routine) => (
 <Card key={routine.id} className={`overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-md group ${routine.active ? routine.color : "bg-white border-gray-200 opacity-80"}`}>
 <div className="p-5">
 <div className="flex justify-between items-start mb-4">
 <div className={`p-2.5 rounded-xl shadow-sm border ${routine.active ? routine.iconBg + ' border-[#ffffff40]' : 'bg-gray-100 border-gray-200'}`}>
 {routine.icon}
 </div>
 <Switch
 checked={routine.active}
 onCheckedChange={() => toggleRoutine(routine.id)}
 className={routine.active ? "data-[state=checked]:bg-emerald-500" : ""}
 />
 </div>

 <div className="mb-4">
 <h3 className={`text-lg mb-1 ${routine.active ? 'text-gray-900' : 'text-gray-500'}`}>
 {routine.title}
 </h3>
 <p className={`text-sm leading-relaxed min-h-[40px] ${routine.active ? 'text-gray-700' : 'text-gray-400'}`}>
 {routine.description}
 </p>
 </div>

 <div className="flex items-center gap-2 mb-5">
 <Clock className={`w-4 h-4 ${routine.active ? 'text-gray-600' : 'text-gray-400'}`} />
 <span className={`text-sm ${routine.active ? 'text-gray-700' : 'text-gray-400'}`}>
 {routine.time}
 </span>
 </div>

 <div className="mb-5 text-xs text-gray-500">
 <p>Last run: {formatLastRun(routine.lastRunAt)}</p>
 <p>Runs: {routine.runCount}{routine.lastStatus ? ` · ${routine.lastStatus}` : ""}</p>
 </div>

 <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
 {routine.tags.map((tag, i) => (
 <Badge key={i} variant="secondary" className={` text-xs px-2.5 py-0.5 rounded-md ${routine.active ? 'bg-white/60 text-gray-700' : 'bg-gray-100 text-gray-400'}`}>
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
 <Card className="flex flex-col items-center justify-center p-6 border border-gray-200 bg-white min-h-[260px] rounded-xl">
 <p className="text-gray-700">No routines yet for this device</p>
 <p className="text-sm text-gray-500 mt-1">Create your first routine automation</p>
 </Card>
 )}

 {/* Empty State / Add New */}
 <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer min-h-[260px] rounded-xl group" onClick={() => setIsModalOpen(true)}>
 <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
 <Plus className="w-6 h-6" />
 </div>
 <p className=" text-gray-700">Add New Routine</p>
 <p className="text-sm text-gray-500 mt-1 max-w-[200px] text-center">Create a schedule-based automation</p>
 </Card>
 </div>
 </TabsContent>

 {/* --- ACTIVITY RULES TAB --- */}
 <TabsContent value="rules" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
 {rules.map((rule) => (
 <Card key={rule.id} className={`overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-md group ${rule.active ? rule.color : "bg-white border-gray-200 opacity-80"}`}>
 <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">

 <div className={`p-3 rounded-xl shadow-sm border shrink-0 ${rule.active ? rule.iconBg + ' border-[#ffffff40]' : 'bg-gray-100 border-gray-200'}`}>
 {rule.icon}
 </div>

 <div className="flex-1 w-full">
 <div className="flex justify-between items-start mb-1">
 <h3 className={`text-lg ${rule.active ? 'text-gray-900' : 'text-gray-500'}`}>
 {rule.title}
 </h3>
 <Switch
 checked={rule.active}
 onCheckedChange={() => toggleRule(rule.id)}
 className={rule.active ? "data-[state=checked]:bg-emerald-500" : ""}
 />
 </div>

 <p className={`text-sm mb-4 leading-relaxed ${rule.active ? 'text-gray-700' : 'text-gray-400'}`}>
 {rule.description}
 </p>

 <div className="mb-4 text-xs text-gray-500">
 <p>Last run: {formatLastRun(rule.lastRunAt)}</p>
 <p>Runs: {rule.runCount}{rule.lastStatus ? ` · ${rule.lastStatus}` : ""}</p>
 </div>

 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto pt-4 border-t border-black/5">
 <div className="flex flex-wrap gap-2">
 {rule.tags.map((tag, i) => (
 <Badge key={i} variant="outline" className={` text-xs px-2.5 py-0.5 rounded-md border-black/10 ${rule.active ? 'bg-white/50 text-gray-700' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
 {tag}
 </Badge>
 ))}
 </div>

 <Button variant="ghost" size="sm" onClick={() => handleEditAutomation(rule)} className={`gap-1 text-xs h-8 hover:bg-white/50 ${rule.active ? 'text-gray-700' : 'text-gray-400'}`}>
 Configure <ArrowRight className="w-3 h-3" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDeleteAutomation(rule.id)} className="gap-1 text-xs h-8 text-red-600 hover:bg-red-50">
 Remove
 </Button>
 </div>
 </div>
 </div>
 </Card>
 ))}

 {!loadingAutomations && rules.length === 0 && (
 <Card className="flex flex-col items-center justify-center p-6 border border-gray-200 bg-white min-h-[180px] rounded-xl">
 <p className="text-gray-700">No activity rules yet for this device</p>
 <p className="text-sm text-gray-500 mt-1">Create your first condition-based rule</p>
 </Card>
 )}

 {/* Empty State / Add New */}
 <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer min-h-[180px] rounded-xl group" onClick={() => setIsModalOpen(true)}>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
 <Plus className="w-5 h-5" />
 </div>
 <div className="text-left">
 <p className=" text-gray-700">Add Custom Rule</p>
 <p className="text-sm text-gray-500 mt-0.5">Define logic based on activity & vitals</p>
 </div>
 </div>
 </Card>
 </div>
 </TabsContent>

 </Tabs>

 <Card className="mt-2 border border-gray-200 bg-white shadow-sm">
 <CardContent className="p-5">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <History className="w-4 h-4 text-emerald-600" />
 <h3 className="text-base text-gray-900">Automation Run History</h3>
 </div>
 <Button variant="ghost" size="sm" onClick={loadAutomations}>Refresh</Button>
 </div>
 <div className="grid gap-2">
 {automationHistory.length === 0 ? (
 <p className="text-sm text-gray-500">No automation runs recorded yet.</p>
 ) : automationHistory.map((item) => (
 <div key={item.id} className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <p className="text-sm text-gray-900">{item.event}</p>
 <p className="text-xs text-gray-500">
 {(item.metadata?.action || "Action")} {item.metadata?.result ? `· ${item.metadata.result}` : ""}
 </p>
 </div>
 <div className="text-xs text-gray-500">
 {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 {/* Mock Modal overlay for UI demo purposes */}
 {isModalOpen && createPortal(
 <div
 className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
 style={{ zIndex: 9999 }}
 onClick={() => setIsModalOpen(false)}
 >
 <Card className="w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
 <div className="p-6 border-b border-gray-100 bg-white">
 <h2 className="text-xl text-gray-900">{editingAutomation ? "Edit Automation" : "Create New Automation"}</h2>
 <p className="text-sm text-gray-500">This will be saved to your selected device</p>
 </div>
 <CardContent className="p-6 bg-gray-50 flex flex-col gap-4">
 <div className="grid gap-2">
 <label className="text-sm text-gray-700">Automation Title</label>
 <input
 type="text"
 placeholder="e.g. Nightlight mode"
 value={createForm.title}
 onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
 className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file: placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
 />
 </div>
 <div className="grid gap-2">
 <label className="text-sm text-gray-700">Description</label>
 <input
 type="text"
 placeholder="What this automation does"
 value={createForm.description}
 onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
 className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file: placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
 />
 </div>
 <div className="grid gap-2">
 <label className="text-sm text-gray-700">When this happens (Trigger)</label>
 <select
 value={createForm.trigger}
 onChange={(e) => setCreateForm((prev) => ({ ...prev, trigger: e.target.value }))}
 className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
 >
 <option>Time is 10:00 PM</option>
 <option>Presence detected</option>
 <option>Fall detected</option>
 <option>Sleep state is Deep Sleep</option>
 </select>
 </div>
 <div className="grid gap-2 mb-4">
 <label className="text-sm text-gray-700">Do this (Action)</label>
 <select
 value={createForm.action}
 onChange={(e) => setCreateForm((prev) => ({ ...prev, action: e.target.value }))}
 className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
 >
 <option>Set mode to Sleep</option>
 <option>Set mode to Fall Detection</option>
 <option>Turn Relay ON</option>
 <option>Turn Relay OFF</option>
 </select>
 </div>
 <div className="grid gap-2 mb-4">
 <label className="text-sm text-gray-700">Cooldown seconds</label>
 <input
 type="number"
 min="5"
 step="5"
 value={createForm.cooldownSeconds}
 onChange={(e) => setCreateForm((prev) => ({ ...prev, cooldownSeconds: e.target.value }))}
 className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
 />
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
 <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingAutomation(null); resetCreateForm(); }}>Cancel</Button>
 <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSaving} onClick={handleCreateAutomation}>
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
