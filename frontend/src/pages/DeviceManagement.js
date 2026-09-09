import { useEffect, useState } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import { useOutletContext } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { Trash2, Plus, Edit2, AlertCircle, Link as LinkIcon, Sliders, Copy } from 'lucide-react';
import api from "../api/api";
import { toast } from 'sonner';

export default function DeviceManagement() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({ title: "Devices" });
  }, [setHeaderProps]);

  const { devices, linkDevice, unlinkDevice, updateDevice } = useDevice();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [calibrateTarget, setCalibrateTarget] = useState(null);
  const [linkForm, setLinkForm] = useState({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });

  const handleLinkDevice = async (e) => {
    e.preventDefault();

    const result = await linkDevice(
      linkForm.deviceId,
      linkForm.name,
      linkForm.deviceType
    );

    if (result.success) {
      if (result.apiKey) {
        toast.success(
          'Device linked successfully',
          { description: `Save this API key to configure the device: ${result.apiKey}` }
        );
      } else {
        toast.success('Device linked successfully!');
      }
      setLinkDialogOpen(false);
      setLinkForm({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
    } else {
      toast.error(result.error);
    }
  };

  const handleUnlinkDevice = async (deviceId, deviceName) => {
    const result = await unlinkDevice(deviceId);
    setUnlinkTarget(null);
    if (result.success) {
      toast.success('Device unlinked successfully');
    } else {
      toast.error(result.error);
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

  const handleCalibrateDevice = async (device) => {
    setCalibrateTarget(null);
    try {
      await api.post(`/devices/${device.device_id}/calibrate`);
      toast.success('Calibration command sent successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to trigger calibration');
    }
  };

  const copyApiKey = (key) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key).then(() => toast.success('API key copied'));
    }
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const closeAndResetDialog = () => {
    setLinkDialogOpen(false);
    setLinkForm({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Devices"
        description="Configure new BlareXSense hardware and manage active device links."
        actions={
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
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

              <form onSubmit={handleLinkDevice}>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="deviceId">Device ID</Label>
                    <Input
                      id="deviceId"
                      placeholder="ESP32_ABC123"
                      value={linkForm.deviceId}
                      onChange={(e) => setLinkForm({ ...linkForm, deviceId: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
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
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeAndResetDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">Link Device</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {devices.length === 0 ? (
        <Card className="rounded-lg border border-border bg-card">
          <CardContent>
            <EmptyState
              icon={<LinkIcon className="h-5 w-5" />}
              title="No devices linked"
              description="Link your first BlareXSense device to start monitoring."
              action={
                <Button onClick={() => setLinkDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Link Your First Device
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {devices.map((device) => (
            <Card key={device.device_id} className="border-border">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base text-foreground">{device.name}</CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">{device.device_id}</CardDescription>
                  </div>
                  <Badge
                    variant={device.status === 'online' ? 'default' : 'destructive'}
                    className={`border-transparent text-xs ${
                      device.status === 'online' ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'
                    }`}
                  >
                    {device.status === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device Type:</span>
                    <span className="font-medium text-foreground">
                      {device.device_id?.toUpperCase().startsWith("STD")
                        ? "Standard (STD)"
                        : device.device_id?.toUpperCase().startsWith("PRO")
                        ? "Pro (PRO)"
                        : device.device_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Linked:</span>
                    <span className="font-medium text-foreground">
                      {new Date(device.linked_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <span className="font-medium text-foreground">
                      {formatLastSeen(device.last_seen)}
                    </span>
                  </div>
                  {device.api_key && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">API Key:</span>
                      <button
                        onClick={() => copyApiKey(device.api_key)}
                        className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        title="Copy API key"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  <Dialog open={editingDevice?.device_id === device.device_id} onOpenChange={(open) => !open && setEditingDevice(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingDevice({ ...device })}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
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
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            * Tier is determined by the prefix of the Device ID (e.g. STD or PRO).
                          </p>
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
                    onClick={() => setCalibrateTarget(device)}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Calibrate
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setUnlinkTarget(device)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Unlink
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unlink confirmation */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {unlinkTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the device from your account. Sensor data already recorded remains in your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleUnlinkDevice(unlinkTarget.device_id, unlinkTarget.name)}
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Calibrate confirmation */}
      <AlertDialog open={!!calibrateTarget} onOpenChange={(open) => !open && setCalibrateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Calibrate {calibrateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Make sure the room is empty and stand clear for 5 seconds while calibration runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCalibrateDevice(calibrateTarget)}>
              Start Calibration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}