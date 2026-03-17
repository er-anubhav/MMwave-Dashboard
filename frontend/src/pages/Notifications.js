import React, { useState } from "react";
import DashboardNavbar from "../components/DashboardNavbar";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Send, MessageCircle, Mail, Globe, Check, Save, AlertCircle } from "lucide-react";

export default function Notifications() {
 const [providers, setProviders] = useState({
 telegram: {
 enabled: false,
 botToken: "",
 chatId: "",
 status: "disconnected",
 },
 whatsapp: {
 enabled: false,
 apiKey: "",
 phoneNumber: "",
 status: "disconnected",
 },
 email: {
 enabled: false,
 smtpServer: "",
 emailAddress: "",
 status: "disconnected",
 },
 webhook: {
 enabled: false,
 url: "",
 secret: "",
 status: "disconnected",
 },
 });

 const [saving, setSaving] = useState(null);

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

 const handleSave = (key) => {
 setSaving(key);
 // Simulate API call
 setTimeout(() => {
 setProviders((prev) => ({
 ...prev,
 [key]: {
 ...prev[key],
 status: "connected",
 },
 }));
 setSaving(null);
 }, 1000);
 };

 const providerConfigs = [
 {
 key: "telegram",
 name: "Telegram",
 description: "Receive instant alerts via Telegram Bot",
 icon: Send,
 color: "text-blue-500",
 bgColor: "bg-blue-50",
 borderColor: "border-blue-100",
 activeBorderColor: "border-blue-500",
 fields: [
 { label: "Bot Token", key: "botToken", type: "password", placeholder: "123456789:ABCDefghIJKLmnopQRSTuvwxYZ" },
 { label: "Chat ID", key: "chatId", type: "text", placeholder: "e.g., -1001234567890" },
 ],
 },
 {
 key: "whatsapp",
 name: "WhatsApp",
 description: "Get critical alerts directly on WhatsApp",
 icon: MessageCircle,
 color: "text-green-500",
 bgColor: "bg-green-50",
 borderColor: "border-green-100",
 activeBorderColor: "border-green-500",
 fields: [
 { label: "API Key (Twilio/Meta)", key: "apiKey", type: "password", placeholder: "Enter API Key" },
 { label: "Target Phone Number", key: "phoneNumber", type: "text", placeholder: "+1234567890" },
 ],
 },
 {
 key: "email",
 name: "Email",
 description: "Daily summaries and system notifications",
 icon: Mail,
 color: "text-purple-500",
 bgColor: "bg-purple-50",
 borderColor: "border-purple-100",
 activeBorderColor: "border-purple-500",
 fields: [
 { label: "Target Email", key: "emailAddress", type: "email", placeholder: "user@example.com" },
 { label: "SMTP Server (Optional)", key: "smtpServer", type: "text", placeholder: "smtp.example.com" },
 ],
 },
 {
 key: "webhook",
 name: "Custom Webhook",
 description: "POST JSON payloads to your own server",
 icon: Globe,
 color: "text-orange-500",
 bgColor: "bg-orange-50",
 borderColor: "border-orange-100",
 activeBorderColor: "border-orange-500",
 fields: [
 { label: "Endpoint URL", key: "url", type: "url", placeholder: "https://your-server.com/webhook" },
 { label: "Secret Header (Optional)", key: "secret", type: "password", placeholder: "Enter secret" },
 ],
 },
 ];

 return (
 <div className="w-full">
 <DashboardNavbar title="Notification Settings" isConnected={true} />

 <div className="max-w-8xl mx-auto space-y-2">
 <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
 <div>
 <h2 className="text-lg border-b border-gray-100 pb-2 mb-2 text-gray-900 flex items-center gap-2">
 <Bell className="w-6 h-6 text-emerald-600" />
 Configure Alert Channels
 </h2>
 <p className="text-sm text-gray-500 mt-2">
 Choose where you want to receive alerts for events like fall detection, presence changes, and system errors.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
 {providerConfigs.map((config) => {
 const state = providers[config.key];
 const Icon = config.icon;

 return (
 <motion.div
 key={config.key}
 layout
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${state.enabled ? config.activeBorderColor + " shadow-md" : "border-gray-100"
 }`}
 >
 {/* Card Header */}
 <div className="p-5 flex items-start justify-between">
 <div className="flex items-center gap-4">
 <div className={`p-3 rounded-xl ${config.bgColor} ${config.color}`}>
 <Icon className="w-6 h-6" />
 </div>
 <div>
 <h3 className=" text-gray-900 text-lg">{config.name}</h3>
 <p className="text-sm text-gray-500">{config.description}</p>
 </div>
 </div>
 <label className="relative inline-flex items-center cursor-pointer mt-2">
 <input
 type="checkbox"
 className="sr-only peer"
 checked={state.enabled}
 onChange={() => toggleProvider(config.key)}
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
 </label>
 </div>

 {/* Status Indicator */}
 {state.enabled && (
 <div className={`px-5 py-2 text-xs border-y ${state.status === "connected" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-orange-50 text-orange-700 border-orange-100"
 } flex items-center gap-2`}>
 {state.status === "connected" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
 {state.status === "connected" ? "Connected and active" : "Configuration required"}
 </div>
 )}

 {/* Configuration Dropdown */}
 <AnimatePresence>
 {state.enabled && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden bg-gray-50/50"
 >
 <div className="p-5 space-y-4">
 {config.fields.map((field) => (
 <div key={field.key} className="space-y-1.5">
 <label className="text-sm text-gray-700">
 {field.label}
 </label>
 <input
 type={field.type}
 value={state[field.key]}
 onChange={(e) => updateField(config.key, field.key, e.target.value)}
 placeholder={field.placeholder}
 className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
 />
 </div>
 ))}

 <div className="pt-2 flex justify-end">
 <button
 onClick={() => handleSave(config.key)}
 disabled={saving === config.key}
 className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
 >
 {saving === config.key ? (
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
 </div>
 </div>
 );
}
