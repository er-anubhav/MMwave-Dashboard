import { useEffect, useState } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { Switch } from '../components/ui/switch';
import {
  Plus,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Sliders,
  Moon,
  ShieldCheck,
  Bot,
  Power,
  Info
} from 'lucide-react';
import api from "../api/api";
import { toast } from 'sonner';

// Child component for each device card with live telemetry & switch toggle
function ConsumerDeviceCard({ device, navigate, handleChangeMode }) {
  const isPro = device.device_id?.toUpperCase().startsWith("PRO");
  const [data, setData] = useState(null);
  const [togglingRelay, setTogglingRelay] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchLiveData = async () => {
      try {
        const res = await api.get(`/data`, { params: { device_id: device.device_id } });
        if (mounted) setData(res.data);
      } catch (err) {
        // silent fail on poller
      }
    };

    fetchLiveData();
    const timer = setInterval(fetchLiveData, 2000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [device.device_id]);

  const relayState = data?.relay ?? false;
  const isOccupied = data?.sensor_data?.presence ?? false;
  const isOnline = device.status === "online";

  const toggleRelay = async (checked) => {
    const nextState = typeof checked === "boolean" ? checked : !relayState;
    setTogglingRelay(true);
    // Optimistic local state update to prevent switch UI jitter
    setData((prev) => prev ? { ...prev, relay: nextState } : prev);
    try {
      await api.post(`/relay`, {
        device_id: device.device_id,
        relay: nextState,
        relay_mode: "manual",
      });
      toast.success(`${device.name} switch turned ${nextState ? "ON" : "OFF"}`);
    } catch (err) {
      // Revert on error
      setData((prev) => prev ? { ...prev, relay: relayState } : prev);
      toast.error("Failed to update switch");
    } finally {
      setTogglingRelay(false);
    }
  };

  const copyApiKey = (key, e) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key).then(() => toast.success('API key copied'));
    }
  };

  return (
    <Card
      onClick={() => navigate(`/devices/${device.device_id}`)}
      className="group relative border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer rounded-2xl p-5 flex flex-col justify-between min-h-[160px]"
    >
      {/* Top Row: Room Name, Status, and Controls */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/40"
              }`}
            />
            <h3 className="text-base sm:text-lg font-normal text-foreground truncate group-hover:text-primary transition-colors">
              {device.name}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 pl-4">
            {isOnline ? "Online & Monitoring" : "Offline"}
          </p>
        </div>

        {/* Action Controls: Switch & Info */}
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-2 bg-secondary/40 hover:bg-secondary/70 px-2.5 py-1.5 rounded-full border border-border/60 transition-colors"
            title="Controls connected light/appliance. Radar runs 24/7."
          >
            <span className="text-[11px] text-muted-foreground">Appliance</span>
            <Switch
              checked={relayState}
              disabled={togglingRelay}
              onCheckedChange={toggleRelay}
              aria-label={`Toggle appliance switch for ${device.name}`}
            />
          </div>

          <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                title="Device info"
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Info className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{device.name} - Technical Info</DialogTitle>
                <DialogDescription>
                  Hardware and connectivity details for this device.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2.5 py-3 text-xs sm:text-sm font-normal">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={isOnline ? "text-success font-medium" : "text-muted-foreground"}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device ID:</span>
                  <span className="font-mono text-xs text-foreground">{device.device_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linked:</span>
                  <span className="text-foreground">
                    {new Date(device.linked_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Seen:</span>
                  <span className="text-foreground">
                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : "Never"}
                  </span>
                </div>
                {device.api_key && (
                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 mt-2">
                    <span className="text-muted-foreground">API Key:</span>
                    <button
                      onClick={(e) => copyApiKey(device.api_key, e)}
                      className="flex items-center gap-1 text-primary hover:underline text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Key
                    </button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Middle: Subtle Status line without heavy boxes */}
      <div className="flex items-center gap-2 my-4 text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-foreground font-normal border border-border/50">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {data?.mode === "sleep" ? "Sleep Tracking" : "Fall Guard Active"}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-foreground font-normal border border-border/50">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              data?.sensor_data?.presence ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
            }`}
          />
          {data?.sensor_data?.presence ? "Occupied" : "Vacant"}
        </span>
      </div>

      {/* Bottom Footer: Quick actions without clunky stacked buttons */}
      <div
        className="flex items-center justify-between pt-2 border-t border-border/40 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {isPro && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 px-1.5 rounded hover:bg-secondary transition-colors"
                >
                  <Sliders className="h-3 w-3 text-primary" />
                  <span>{data?.mode === "sleep" ? "Sleep" : "Fall"} Mode</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5">
                <DropdownMenuItem
                  className="text-xs flex flex-col items-start gap-0.5 cursor-pointer font-normal p-2 rounded"
                  onClick={() => handleChangeMode(device, "fall")}
                >
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Fall Detection Mode
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-5">
                    Whole-room radar floor & fall monitoring
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs flex flex-col items-start gap-0.5 cursor-pointer font-normal p-2 rounded mt-1"
                  onClick={() => handleChangeMode(device, "sleep")}
                >
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <Moon className="h-3.5 w-3.5 text-primary" />
                    Sleep Tracking Mode
                  </div>
                  <span className="text-[11px] text-muted-foreground pl-5">
                    In-bed vitals, respiration & sleep phases
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 px-1.5 rounded hover:bg-secondary transition-colors"
            onClick={() => navigate(`/devices/${device.device_id}/automations`)}
          >
            <Bot className="h-3 w-3 text-primary" />
            <span>Automations</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/devices/${device.device_id}`)}
          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline py-1 px-1.5 rounded hover:bg-secondary/50 transition-colors"
        >
          <span>View Room</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </Card>
  );
}

export default function DeviceManagement() {
  const navigate = useNavigate();
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({ title: "Devices" });
  }, [setHeaderProps]);

  const { devices, linkDevice } = useDevice();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });

  const ROOM_SUGGESTIONS = ["Living Room", "Master Bedroom", "Kids Room", "Kitchen", "Office"];

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

  const handleChangeMode = async (device, newMode) => {
    try {
      await api.post(`/mode`, {
        mode: newMode,
        device_id: device.device_id,
      });
      toast.success(
        `${device.name} switched to ${newMode === "fall" ? "Fall Detection" : "Sleep Monitoring"} mode`
      );
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change mode");
    }
  };

  const closeAndResetDialog = () => {
    setLinkDialogOpen(false);
    setLinkForm({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
  };

  return (
    <div className={`flex-1 flex flex-col ${devices.length === 0 ? 'justify-center my-auto py-12' : 'pt-2'}`}>

      {/* Reusable Link Device Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link New Room Device</DialogTitle>
            <DialogDescription>
              Pair a new radar sensor and assign it to a room or location.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkDevice}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  placeholder="e.g. STD-A8C3 or PRO-B102"
                  value={linkForm.deviceId}
                  onChange={(e) => setLinkForm({ ...linkForm, deviceId: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Printed on the bottom sticker of your radar sensor (e.g. STD-XXXX or PRO-XXXX)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Room / Location</Label>
                <Input
                  id="name"
                  placeholder="e.g. Living Room"
                  value={linkForm.name}
                  onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                  required
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">Quick pick:</span>
                  {ROOM_SUGGESTIONS.map((room) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => setLinkForm({ ...linkForm, name: room })}
                      className="text-[11px] font-normal px-2 py-0.5 rounded-full border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                    >
                      {room}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={closeAndResetDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90">
                Link Device
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg max-w-md mx-auto">
          <div className="p-3 rounded-full bg-secondary text-primary">
            <LinkIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-normal text-foreground mt-4">No Devices Linked</h3>
          <p className="text-sm font-normal text-muted-foreground mt-2 max-w-sm">
            Connect a BlareXSense mmWave radar device to begin monitoring presence, safety, and automations.
          </p>
          <div className="mt-6">
            <Button
              size="lg"
              onClick={() => setLinkDialogOpen(true)}
              className="h-11 px-6 text-base font-normal bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="h-5 w-5 mr-2" />
              Link Device
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {devices.map((device) => (
            <ConsumerDeviceCard
              key={device.device_id}
              device={device}
              navigate={navigate}
              handleChangeMode={handleChangeMode}
            />
          ))}

          {/* Link New Device Card */}
          <div
            onClick={() => setLinkDialogOpen(true)}
            className="group relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border/80 bg-secondary/10 p-5 text-center rounded-2xl hover:border-primary/50 hover:bg-secondary/30 transition-all duration-200 min-h-[160px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary transition-all duration-200 group-hover:bg-primary group-hover:text-white group-hover:scale-105">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="mt-2.5 text-sm sm:text-base font-normal text-foreground group-hover:text-primary transition-colors">
              Link New Device
            </h3>
            <p className="mt-0.5 text-xs font-normal text-muted-foreground">
              Add a sensor to another room
            </p>
          </div>
        </div>
      )}
    </div>
  );
}