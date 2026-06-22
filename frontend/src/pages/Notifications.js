import { useOutletContext } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Send, MessageCircle, Mail, Globe, Check, Save, AlertCircle, Loader2 } from "lucide-react";
import api from "../api/api";
import { toast } from "sonner";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";




export default function Notifications() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({
      title: "Notifications"
    });
  }, [setHeaderProps]);

 const { selectedDevice } = useDevice();
 const { mode, handleModeChange, isConnected, lastUpdated } = useDeviceData(selectedDevice);
 const [providers, setProviders] = useState({});
 const [providerOrder, setProviderOrder] = useState([]);
 const [notifications, setNotifications] = useState([]);

 const [saving, setSaving] = useState(null);
 const [testing, setTesting] = useState(null);
 const [loading, setLoading] = useState(false);

 const providerUi = {
 telegram: { icon: Send, color: "text-blue-500", bgColor: "bg-blue-50", activeBorderColor: "border-blue-500" },
 whatsapp: { icon: MessageCircle, color: "text-green-500", bgColor: "bg-green-50", activeBorderColor: "border-green-500" },
 email: { icon: Mail, color: "text-purple-500", bgColor: "bg-purple-50", activeBorderColor: "border-purple-500" },
 webhook: { icon: Globe, color: "text-orange-500", bgColor: "bg-orange-50", activeBorderColor: "border-orange-500" },
 };

 const loadProviders = async () => {
 setLoading(true);
 try {
 const response = await api.get(`/notifications/providers`);
 const serverProviders = response.data?.providers || [];

 const updated = {};
 for (const provider of serverProviders) {
 const config = provider.config || {};
 updated[provider.provider] = {
 ...provider,
 ...config,
 enabled: !!provider.enabled,
 status: provider.status || "disconnected",
 fields: provider.fields || []
 };
 }
 setProviders(updated);
 setProviderOrder(serverProviders.map((provider) => provider.provider));
 } catch (error) {
 toast.error(error.response?.data?.detail || "Failed to load notification settings");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadProviders();
 loadNotifications();
 }, []);

 const loadNotifications = async () => {
 try {
 const response = await api.get(`/notifications/history`, {
 params: selectedDevice ? { device_id: selectedDevice.device_id } : {}
 });
 setNotifications(response.data?.notifications || []);
 } catch (error) {
 toast.error(error.response?.data?.detail || "Failed to load notification history");
 }
 };

 useEffect(() => {
 loadNotifications();
 }, [selectedDevice]);

 const toggleProvider = (key) => {
 setProviders((prev) => ({
 ...prev,
 [key]: {
 ...prev[key],
 enabled: !prev[key].enabled,
 },
 }));
 };

 const updateField = (providerKey, field, value) => {
 setProviders((prev) => ({
 ...prev,
 [providerKey]: {
 ...prev[providerKey],
 [field]: value,
 },
 }));
 };

 const handleSave = async (key) => {
 setSaving(key);
 try {
 const providerState = providers[key];
 const { enabled, status, provider, name, description, fields, updated_at, config: _serverConfig, ...config } = providerState;

 if (enabled) {
 const missingField = (fields || []).find((field) => !field.label.includes("Optional") && !config[field.key]?.trim());
 if (missingField) {
 throw new Error(`${name} requires ${missingField.label}`);
 }
 }

 await api.put(`/notifications/providers/${key}`, {
 enabled,
 status: enabled ? "connected" : "disconnected",
 config
 });

 setProviders((prev) => ({
 ...prev,
 [key]: {
 ...prev[key],
 status: enabled ? "connected" : "disconnected"
 }
 }));
 toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} settings saved`);
 } catch (error) {
 toast.error(error.response?.data?.detail || error.message || "Failed to save notification settings");
 } finally {
 setSaving(null);
 }
 };

 const handleTest = async (key) => {
 setTesting(key);
 try {
 await api.post(`/notifications/test`, {
 provider: key,
 device_id: selectedDevice?.device_id,
 message: `Test notification for ${providers[key]?.name || key}`
 });
 toast.success("Test notification queued");
 await loadNotifications();
 } catch (error) {
 toast.error(error.response?.data?.detail || "Failed to queue test notification");
 } finally {
 setTesting(null);
 }
 };

 return (
 <div className="w-full">
 

 <div className="max-w-8xl mx-auto space-y-2">
  {false && (
    <>
      <div className="bg-white dark:bg-background rounded-2xl p-6 border border-gray-100 dark:border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg border-b border-gray-100 dark:border-border pb-2 mb-2 text-gray-900 dark:text-primary flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            Configure Alert Channels
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Choose where you want to receive alerts for events like fall detection, presence changes, and system errors.
          </p>
          {loading && <p className="text-sm text-gray-500 mt-2">Loading saved settings...</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {providerOrder.map((key) => {
          const config = providers[key];
          const ui = providerUi[key] || providerUi.webhook;
          const Icon = ui.icon;

          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-background rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${config.enabled ? ui.activeBorderColor + " shadow-md" : "border-gray-100 dark:border-border"
              }`}
            >
              {/* Card Header */}
              <div className="p-5 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${ui.bgColor} ${ui.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-primary text-lg">{config.name}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.enabled}
                    onChange={() => toggleProvider(key)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-background after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Status Indicator */}
              {config.enabled && (
                <div className={`px-5 py-2 text-xs border-y ${config.status === "connected" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-orange-50 text-orange-700 border-orange-100"
                } flex items-center gap-2`}>
                  {config.status === "connected" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {config.status === "connected" ? "Connected and active" : "Configuration required"}
                </div>
              )}

              {/* Configuration Dropdown */}
              <AnimatePresence>
                {config.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-gray-50 dark:bg-background/50"
                  >
                    <div className="p-5 space-y-4">
                      {(config.fields || []).map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-sm text-gray-700 dark:text-zinc-300">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            value={config[field.key] || ""}
                            onChange={(e) => updateField(key, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-border rounded-lg text-sm bg-white dark:bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
                          />
                        </div>
                      ))}

                      <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
                        <button
                          onClick={() => handleTest(key)}
                          disabled={testing === key || config.status !== "connected"}
                          className="flex items-center justify-center gap-2 bg-white dark:bg-background hover:bg-gray-50 dark:bg-background text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-border px-5 py-2 rounded-lg text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {testing === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                          Send Test
                        </button>
                        <button
                          onClick={() => handleSave(key)}
                          disabled={saving === key}
                          className="flex items-center gap-2 bg-emerald-600 dark:bg-primary dark:text-black hover:bg-emerald-700 dark:hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {saving === key ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save {config.name} Settings
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </>
  )}

 <div className="bg-white dark:bg-background rounded-2xl border border-gray-100 dark:border-border shadow-sm overflow-hidden">
 <div className="p-5 border-b border-gray-100 dark:border-border flex items-center justify-between">
 <div>
 <h3 className="text-base text-gray-900 dark:text-primary">Recent Notification Activity</h3>
 <p className="text-sm text-gray-500 mt-1">Queued from sensor events, automations, and test sends.</p>
 </div>
 <button onClick={loadNotifications} className="text-sm text-emerald-700 hover:text-emerald-800">
 Refresh
 </button>
 </div>
 <div className="divide-y divide-gray-100">
 {notifications.length === 0 ? (
 <div className="p-6 text-sm text-gray-500">No notification activity yet.</div>
 ) : notifications.map((item) => (
 <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <p className="text-sm text-gray-900 dark:text-primary">{item.event}</p>
 <p className="text-xs text-gray-500 mt-1">
 {(item.metadata?.provider_name || item.metadata?.provider || "Provider")} · {item.metadata?.severity || "info"}
 </p>
 </div>
 <div className="text-xs text-gray-500 sm:text-right">
 <p>{item.status}</p>
 <p>{item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
