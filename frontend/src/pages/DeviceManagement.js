import { useState } from 'react';
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
import { Trash2, Plus, Edit2, Copy, CheckCircle2, AlertCircle, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import DashboardNavbar from '../components/DashboardNavbar';
import { motion } from "framer-motion";

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

 const [linkForm, setLinkForm] = useState({
 deviceId: '',
 name: '',
 deviceType: 'mmwave_switch'
 });

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
 setLinkForm({ deviceId: '', name: '', deviceType: 'mmwave_switch' });
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

 const closeAndResetDialog = () => {
 setLinkDialogOpen(false);
 setApiKey('');
 setCopiedKey(false);
 setLinkForm({ deviceId: '', name: '', deviceType: 'mmwave_switch' });
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

 <DialogFooter>
 <Button onClick={closeAndResetDialog}>Done</Button>
 </DialogFooter>
 </div>
 )}
 </DialogContent>
 </Dialog>
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
 {devices.map((device) => (
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
 <div className="space-y-1 text-sm">
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

 <div className="flex gap-2 mt-4">
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
 ))}
 </div>
 )}
 </div>
 </main>
 </motion.div>
 );
}
