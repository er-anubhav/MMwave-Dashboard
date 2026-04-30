import { useEffect, useState } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Trash2, Plus, Edit2, Copy, CheckCircle2, AlertCircle, Link as LinkIcon, Bluetooth, Wifi, RotateCcw, Download, Database, Activity, Signal, Clock, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import DashboardNavbar from '../components/DashboardNavbar';
import { motion } from "framer-motion";

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

export default function DeviceManagement() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const { devices, linkDevice, unlinkDevice, updateDevice, loadDevices } = useDevice();
 const [linkDialogOpen, setLinkDialogOpen] = useState(false);
 const [editingDevice, setEditingDevice] = useState(null);
 const [copiedKey, setCopiedKey] = useState(false);
 const [apiKey, setApiKey] = useState('');
 const [provisioning, setProvisioning] = useState(false);
 const [provisionStatus, setProvisionStatus] = useState('');
 const [provisionDevice, setProvisionDevice] = useState(null);
 const [healthByDevice, setHealthByDevice] = useState({});
 const [diagnostics, setDiagnostics] = useState(null);
 const [retention, setRetention] = useState({ sensor_record_limit: 1000, log_limit: 1000 });
 const [rotatedKey, setRotatedKey] = useState('');
 const [rotatedDeviceId, setRotatedDeviceId] = useState('');
 const [publicConfig, setPublicConfig] = useState({
 ble_provisioning: {
 service_uuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
 rx_characteristic_uuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
 device_name_prefixes: ['mmWave', 'ESP32']
 }
 });
 const [wifiForm, setWifiForm] = useState({
 ssid: '',
 password: ''
 });

 const [linkForm, setLinkForm] = useState({
 deviceId: '',
 name: '',
 deviceType: 'mmwave_switch'
 });

 useEffect(() => {
 const loadPublicConfig = async () => {
 try {
 const response = await axios.get(`${API}/config/public`);
 setPublicConfig((prev) => ({
 ...prev,
 ...(response.data || {})
 }));
 } catch {
 // Keep local defaults when backend config is not reachable yet.
 }
 };
 loadPublicConfig();
 }, []);

 useEffect(() => {
 const loadOperationsData = async () => {
 if (!devices.length) {
 setHealthByDevice({});
 return;
 }

 try {
 const [diagnosticsResponse, retentionResponse, ...healthResponses] = await Promise.all([
 axios.get(`${API}/diagnostics`),
 axios.get(`${API}/settings/retention`),
 ...devices.map((device) => axios.get(`${API}/devices/${device.device_id}/health`))
 ]);

 setDiagnostics(diagnosticsResponse.data);
 setRetention(retentionResponse.data);
 const nextHealth = {};
 healthResponses.forEach((response) => {
 const deviceId = response.data?.device?.device_id;
 if (deviceId) {
 nextHealth[deviceId] = response.data;
 }
 });
 setHealthByDevice(nextHealth);
 } catch (error) {
 toast.error(error.response?.data?.detail || 'Failed to load diagnostics');
 }
 };

 loadOperationsData();
 }, [devices]);

 const handleLinkDevice = async (e) => {
 e.preventDefault();

 const result = await linkDevice(
 linkForm.deviceId,
 linkForm.name,
 linkForm.deviceType
 );

 if (result.success) {
 toast.success('Device linked successfully!');
 setApiKey(result.apiKey);
 setProvisionDevice({
 deviceId: linkForm.deviceId,
 name: linkForm.name,
 deviceType: linkForm.deviceType,
 apiKey: result.apiKey
 });
 // Don't close dialog yet, show API key
 } else {
 toast.error(result.error);
 }
 };

 const handleUnlinkDevice = async (deviceId, deviceName) => {
 if (window.confirm(`Are you sure you want to unlink ${deviceName}?`)) {
 const result = await unlinkDevice(deviceId);

 if (result.success) {
 toast.success('Device unlinked successfully');
 } else {
 toast.error(result.error);
 }
 }
 };

 const handleUpdateDevice = async (e) => {
 e.preventDefault();

 const result = await updateDevice(editingDevice.device_id, editingDevice.name);

 if (result.success) {
 toast.success('Device updated successfully');
 setEditingDevice(null);
 } else {
 toast.error(result.error);
 }
 };

 const copyApiKey = () => {
 navigator.clipboard.writeText(apiKey);
 setCopiedKey(true);
 toast.success('API key copied to clipboard');
 setTimeout(() => setCopiedKey(false), 2000);
 };

 const copyRotatedKey = () => {
 navigator.clipboard.writeText(rotatedKey);
 toast.success('New API key copied');
 };

 const rotateDeviceKey = async (device) => {
 if (!window.confirm(`Rotate API key for ${device.name}? The device must be reprovisioned with the new key.`)) {
 return;
 }

 try {
 const response = await axios.post(`${API}/devices/${device.device_id}/rotate-key`);
 setRotatedKey(response.data.api_key);
 setRotatedDeviceId(device.device_id);
 toast.success('Device API key rotated');
 } catch (error) {
 toast.error(error.response?.data?.detail || 'Failed to rotate API key');
 }
 };

 const downloadBackup = async (includeSecrets = false) => {
 try {
 const response = await axios.get(`${API}/backup/export`, {
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
 const response = await axios.put(`${API}/settings/retention`, {
 sensor_record_limit: Number(retention.sensor_record_limit) || 1000,
 log_limit: Number(retention.log_limit) || 1000
 });
 setRetention(response.data);
 toast.success('Retention settings saved');
 } catch (error) {
 toast.error(error.response?.data?.detail || 'Failed to save retention settings');
 }
 };

 const formatSeen = (device) => {
 if (!device.last_seen) {
 return 'Never seen';
 }
 if (device.status === 'online') {
 return 'Live now';
 }
 return `Offline since ${new Date(device.last_seen).toLocaleString()}`;
 };

 const formatUptime = (seconds) => {
 if (!seconds && seconds !== 0) {
 return 'Unknown';
 }
 const hours = Math.floor(seconds / 3600);
 const minutes = Math.floor((seconds % 3600) / 60);
 return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
 };

 const closeAndResetDialog = () => {
 setLinkDialogOpen(false);
 setApiKey('');
 setCopiedKey(false);
 setProvisionDevice(null);
 setProvisionStatus('');
 setProvisioning(false);
 setWifiForm({ ssid: '', password: '' });
 setLinkForm({ deviceId: '', name: '', deviceType: 'mmwave_switch' });
 };

 const provisionWithBle = async () => {
 if (!provisionDevice) {
 toast.error('Link a device first');
 return;
 }
 if (!wifiForm.ssid.trim()) {
 toast.error('WiFi SSID is required');
 return;
 }
 if (!navigator.bluetooth) {
 toast.error('Web Bluetooth is not available in this browser');
 return;
 }

 setProvisioning(true);
 setProvisionStatus('Searching for nearby provisioning device...');

 try {
 const bleConfig = publicConfig.ble_provisioning;
 const serviceUuid = bleConfig.service_uuid;
 const rxCharacteristicUuid = bleConfig.rx_characteristic_uuid;
 const namePrefixes = bleConfig.device_name_prefixes || [];
 const bleDevice = await navigator.bluetooth.requestDevice({
 filters: [
 { services: [serviceUuid] },
 ...namePrefixes.map((prefix) => ({ namePrefix: prefix }))
 ],
 optionalServices: [serviceUuid]
 });

 setProvisionStatus(`Connecting to ${bleDevice.name || 'device'}...`);
 const server = await bleDevice.gatt.connect();
 const service = await server.getPrimaryService(serviceUuid);
 const characteristic = await service.getCharacteristic(rxCharacteristicUuid);

 const payload = {
 type: 'provision',
 device_id: provisionDevice.deviceId,
 api_key: provisionDevice.apiKey,
 backend_url: BACKEND_URL,
 wifi_ssid: wifiForm.ssid.trim(),
 wifi_password: wifiForm.password
 };
 const encoded = new TextEncoder().encode(JSON.stringify(payload));

 setProvisionStatus('Sending WiFi and dashboard credentials...');
 for (let index = 0; index < encoded.length; index += 180) {
 const chunk = encoded.slice(index, index + 180);
 if (characteristic.writeValueWithoutResponse) {
 await characteristic.writeValueWithoutResponse(chunk);
 } else {
 await characteristic.writeValue(chunk);
 }
 }

 bleDevice.gatt.disconnect();
 setProvisionStatus('Provisioning payload sent');
 toast.success('BLE provisioning sent to device');
 } catch (error) {
 const message = error?.message || 'BLE provisioning failed';
 setProvisionStatus(message);
 toast.error(message);
 } finally {
 setProvisioning(false);
 }
 };

 return (
 <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col w-full h-full">
 <DashboardNavbar title="Device Management" />
 <main className="">
 <div className="grid gap-2">
 <div className="flex justify-start">
 <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
 <DialogTrigger asChild>
 <Button>
 <Plus className="w-4 h-4 mr-2" />
 Link Device
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Link New Device</DialogTitle>
 <DialogDescription>
 Enter the device ID and a friendly name for your device
 </DialogDescription>
 </DialogHeader>

 {!apiKey ? (
 <form onSubmit={handleLinkDevice}>
 <div className="py-2 space-y-4">
 <div className="space-y-2">
 <Label htmlFor="deviceId">Device ID</Label>
 <Input
 id="deviceId"
 placeholder="ESP32_ABC123"
 value={linkForm.deviceId}
 onChange={(e) => setLinkForm({ ...linkForm, deviceId: e.target.value })}
 required
 />
 <p className="text-xs text-gray-500">
 Find this ID on your device or in the device settings
 </p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="name">Device Name</Label>
 <Input
 id="name"
 placeholder="Living Room Switch"
 value={linkForm.name}
 onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
 required
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="deviceType">Device Type</Label>
 <select
 id="deviceType"
 className="w-full px-3 py-2 border"
 value={linkForm.deviceType}
 onChange={(e) => setLinkForm({ ...linkForm, deviceType: e.target.value })}
 >
 <option value="mmwave_switch">MMWave Switch</option>
 <option value="mmwave_sensor">MMWave Sensor</option>
 </select>
 </div>
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
 Cancel
 </Button>
 <Button type="submit">Link Device</Button>
 </DialogFooter>
 </form>
 ) : (
 <div className="py-2 space-y-4">
 <Alert>
 <AlertCircle className="w-4 h-4" />
 <AlertDescription>
 <strong>Important:</strong> Save this API key. You'll need to configure it on your device. This key won't be shown again.
 </AlertDescription>
 </Alert>

 <div className="space-y-2">
 <Label>API Key</Label>
 <div className="flex gap-2">
 <Input value={apiKey} readOnly className="font-mono text-sm" />
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={copyApiKey}
 >
 {copiedKey ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
 </Button>
 </div>
 </div>

 <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
 <div className="flex items-start gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
 <Bluetooth className="h-5 w-5" />
 </div>
 <div>
 <h3 className="text-sm text-gray-900">BLE Provisioning</h3>
 <p className="text-xs text-gray-500 mt-1">
 Send WiFi, backend URL, device ID, and API key directly to the ESP32.
 </p>
 </div>
 </div>

 <div className="grid gap-3">
 <div className="space-y-2">
 <Label htmlFor="wifiSsid">WiFi SSID</Label>
 <div className="relative">
 <Wifi className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
 <Input
 id="wifiSsid"
 className="pl-9"
 placeholder="Home WiFi"
 value={wifiForm.ssid}
 onChange={(e) => setWifiForm({ ...wifiForm, ssid: e.target.value })}
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="wifiPassword">WiFi Password</Label>
 <Input
 id="wifiPassword"
 type="password"
 placeholder="Password"
 value={wifiForm.password}
 onChange={(e) => setWifiForm({ ...wifiForm, password: e.target.value })}
 />
 </div>
 </div>

 {provisionStatus && (
 <p className="text-xs text-gray-500">{provisionStatus}</p>
 )}

 <Button
 type="button"
 variant="outline"
 className="w-full"
 onClick={provisionWithBle}
 disabled={provisioning}
 >
 <Bluetooth className="w-4 h-4 mr-2" />
 {provisioning ? 'Provisioning...' : 'Provision with BLE'}
 </Button>
 </div>

 <DialogFooter>
 <Button onClick={closeAndResetDialog}>Done</Button>
 </DialogFooter>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>

 {rotatedKey && (
 <Alert className="border-amber-200 bg-amber-50">
 <ShieldCheck className="w-4 h-4 text-amber-600" />
 <AlertDescription>
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
 <span>
 New API key for <strong>{rotatedDeviceId}</strong>. Provision this key to the device before it sends data again.
 </span>
 <div className="flex gap-2">
 <Input value={rotatedKey} readOnly className="font-mono text-xs bg-white" />
 <Button type="button" size="icon" variant="outline" onClick={copyRotatedKey}>
 <Copy className="w-4 h-4" />
 </Button>
 </div>
 </div>
 </AlertDescription>
 </Alert>
 )}

 <div className="grid gap-2 lg:grid-cols-3">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="flex items-center gap-2 text-base">
 <Database className="w-4 h-4 text-emerald-600" />
 Local Backup
 </CardTitle>
 <CardDescription>Export dashboard data from this local backend.</CardDescription>
 </CardHeader>
 <CardContent className="flex flex-col gap-2">
 <Button variant="outline" onClick={() => downloadBackup(false)}>
 <Download className="w-4 h-4 mr-2" />
 Export Backup
 </Button>
 <Button variant="ghost" onClick={() => downloadBackup(true)}>
 <Download className="w-4 h-4 mr-2" />
 Export With Keys
 </Button>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="flex items-center gap-2 text-base">
 <Clock className="w-4 h-4 text-blue-600" />
 Retention
 </CardTitle>
 <CardDescription>Control local database growth.</CardDescription>
 </CardHeader>
 <CardContent className="grid gap-3">
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label htmlFor="sensorLimit">Sensor records</Label>
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
 <Label htmlFor="logLimit">Logs</Label>
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
 <Button onClick={saveRetention}>Save Retention</Button>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="flex items-center gap-2 text-base">
 <Activity className="w-4 h-4 text-purple-600" />
 Diagnostics
 </CardTitle>
 <CardDescription>Quick local backend status.</CardDescription>
 </CardHeader>
 <CardContent className="grid grid-cols-2 gap-2 text-sm">
 <div>
 <p className="text-gray-500">Devices</p>
 <p className="text-gray-900">{diagnostics?.devices?.online || 0} online / {diagnostics?.devices?.total || devices.length}</p>
 </div>
 <div>
 <p className="text-gray-500">DB size</p>
 <p className="text-gray-900">{diagnostics?.database?.database_size_mb ?? 0} MB</p>
 </div>
 <div>
 <p className="text-gray-500">Scheduler</p>
 <p className="text-gray-900">{diagnostics?.scheduler?.interval_seconds || 30}s</p>
 </div>
 <div>
 <p className="text-gray-500">Recent errors</p>
 <p className="text-gray-900">{diagnostics?.logs?.recent_errors?.length || 0}</p>
 </div>
 </CardContent>
 </Card>
 </div>

 {devices.length === 0 ? (
 <Card className="rounded-xl shadow-sm border-gray-100">
 <CardContent className="flex flex-col items-center justify-center py-12">
 <LinkIcon className="w-16 h-16 mb-4 text-gray-300" />
 <h3 className="mb-2 text-base text-gray-900">No devices linked</h3>
 <p className="mb-6 text-center text-gray-600">
 Link your first MMWave device to start monitoring
 </p>
 <Button onClick={() => setLinkDialogOpen(true)}>
 <Plus className="w-4 h-4 mr-2" />
 Link Your First Device
 </Button>
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-2">
 {devices.map((device) => {
 const health = healthByDevice[device.device_id];
 const healthDevice = health?.device || device;
 const latestSleep = health?.latest_data?.sensor_data?.sleep || {};
 return (
 <Card key={device.device_id}>
 <CardHeader>
 <div className="flex items-start justify-between">
 <div>
 <CardTitle>{device.name}</CardTitle>
 <CardDescription className="mt-2 text-sm">
 {device.device_id}
 </CardDescription>
 </div>
 <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
 {device.status === 'online' ? 'Online' : 'Offline'}
 </Badge>
 </div>
 </CardHeader>
 <CardContent>
 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
 <div className="flex items-center gap-2 text-gray-500 text-xs">
 <Clock className="w-3.5 h-3.5" />
 Availability
 </div>
 <p className="mt-1 text-sm text-gray-900">{formatSeen(healthDevice)}</p>
 </div>
 <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
 <div className="flex items-center gap-2 text-gray-500 text-xs">
 <Signal className="w-3.5 h-3.5" />
 WiFi
 </div>
 <p className="mt-1 text-sm text-gray-900">{healthDevice.wifi_rssi ? `${healthDevice.wifi_rssi} dBm` : 'Unknown'}</p>
 </div>
 <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
 <div className="flex items-center gap-2 text-gray-500 text-xs">
 <Activity className="w-3.5 h-3.5" />
 Firmware
 </div>
 <p className="mt-1 text-sm text-gray-900">{healthDevice.firmware_version || 'Unknown'}</p>
 </div>
 <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
 <div className="flex items-center gap-2 text-gray-500 text-xs">
 <Database className="w-3.5 h-3.5" />
 Records
 </div>
 <p className="mt-1 text-sm text-gray-900">{health?.sensor_record_count ?? 0}</p>
 </div>
 </div>

 <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
 <div className="space-y-1">
 <div className="flex justify-between">
 <span className="text-gray-600">Device Type:</span>
 <span className="">{device.device_type}</span>
 </div>
 <div className="flex justify-left">
 <span className="text-gray-600">Linked:</span>
 <span className="">
 {new Date(device.linked_at).toLocaleDateString()}
 </span>
 </div>
 {device.last_seen && (
 <div className="flex justify-between">
 <span className="text-gray-600">Last Seen:</span>
 <span className="">
 {new Date(device.last_seen).toLocaleString()}
 </span>
 </div>
 )}
 </div>
 <div className="space-y-1">
 <div className="flex justify-between">
 <span className="text-gray-600">IP Address:</span>
 <span>{healthDevice.ip_address || 'Unknown'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Uptime:</span>
 <span>{formatUptime(healthDevice.uptime_seconds)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Respiration:</span>
 <span>{latestSleep.respiration ? `${latestSleep.respiration} bpm` : 'No data'}</span>
 </div>
 </div>
 </div>

 <div className="flex flex-wrap gap-2 mt-4">
 <Dialog open={editingDevice?.device_id === device.device_id} onOpenChange={(open) => !open && setEditingDevice(null)}>
 <DialogTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setEditingDevice({ ...device })}
 >
 <Edit2 className="w-4 h-4 mr-2" />
 Rename
 </Button>
 </DialogTrigger>
 <DialogContent>
 <form onSubmit={handleUpdateDevice}>
 <DialogHeader>
 <DialogTitle>Rename Device</DialogTitle>
 <DialogDescription>
 Choose a new name for {device.name}
 </DialogDescription>
 </DialogHeader>

 <div className="py-2">
 <Label htmlFor="editName">Device Name</Label>
 <Input
 id="editName"
 value={editingDevice?.name || ''}
 onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
 required
 />
 </div>

 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => setEditingDevice(null)}>
 Cancel
 </Button>
 <Button type="submit">Save</Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <Button
 variant="outline"
 size="sm"
 onClick={() => rotateDeviceKey(device)}
 >
 <RotateCcw className="w-4 h-4 mr-2" />
 Rotate Key
 </Button>

 <Button
 variant="destructive"
 size="sm"
 onClick={() => handleUnlinkDevice(device.device_id, device.name)}
 >
 <Trash2 className="w-4 h-4 mr-2" />
 Unlink
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </div>
 </main>
 </motion.div>
 );
}
