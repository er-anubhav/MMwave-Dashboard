import { useEffect, useState, useMemo } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import {
  Plus,
  Radio,
  Sliders,
  Power,
  LayoutGrid,
  List,
  Sparkles,
  Moon,
  ShieldAlert,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Bot
} from 'lucide-react';
import api from '../api/api';
import { toast } from 'sonner';
import DeviceInspectDrawer from '../components/DeviceInspectDrawer';

// Child component for live device card in the 3-column grid
function PrototypeDeviceCard({ device, onInspect, navigate, handleChangeMode }) {
  const [data, setData] = useState(null);
  const [togglingRelay, setTogglingRelay] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchLiveData = async () => {
      try {
        const res = await api.get('/data', { params: { device_id: device.device_id } });
        if (mounted && res.data) setData(res.data);
      } catch (err) {
        // silent polling catch
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
  const isOnline = device.status === 'online';
  const mode = data?.mode || device.mode || 'auto';

  const toggleRelay = async (checked) => {
    setTogglingRelay(true);
    setData((prev) => (prev ? { ...prev, relay: checked } : prev));
    try {
      await api.post('/relay', {
        device_id: device.device_id,
        relay: checked,
        relay_mode: 'manual',
      });
      toast.success(`${device.name} load turned ${checked ? 'ON' : 'OFF'}`);
    } catch (err) {
      setData((prev) => (prev ? { ...prev, relay: !checked } : prev));
      toast.error('Failed to toggle switch');
    } finally {
      setTogglingRelay(false);
    }
  };

  return (
    <Card
      onClick={() => onInspect(device)}
      className="group relative border border-border/80 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer rounded-2xl p-4.5 flex flex-col justify-between min-h-[175px] select-none"
    >
      {/* Top Row: Mini Device Icon, Title, Room, and Quick Inspect */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-secondary/80 border border-border/80 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105">
            <Radio size={22} className={isOnline ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
              {device.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {device.room || 'Living Room'}
            </p>
          </div>
        </div>

        {/* Status Dot & Inspect Arrow */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-muted-foreground/40'
            }`}
            title={isOnline ? 'Device online' : 'Device offline'}
          />
          <button
            type="button"
            onClick={() => onInspect(device)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Inspect device controls"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Presence Status Banner (matches prototype .presence layout) */}
      <div
        className={`my-3 px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
          isOccupied
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-secondary/40 border-border/70 text-muted-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOccupied ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
            }`}
          />
          <span className="font-semibold">{isOccupied ? 'Occupied (Present)' : 'Vacant (Away)'}</span>
        </div>
        <span className="text-[11px] opacity-80">
          {data?.sensor_data?.activity ? `Act: ${data.sensor_data.activity}` : 'Idle'}
        </span>
      </div>

      {/* Card Footer: Operating Mode Badge + Relay Switch */}
      <div
        className="flex items-center justify-between pt-1 border-t border-border/50 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground border border-border/60">
          {mode}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {relayState ? 'ON' : 'OFF'}
          </span>
          <Switch
            checked={relayState}
            disabled={togglingRelay}
            onCheckedChange={toggleRelay}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </Card>
  );
}

export default function DeviceManagement() {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const setHeaderProps = context.setHeaderProps;
  const selectedSpace = context.selectedSpace || 'All Spaces';

  useEffect(() => {
    if (setHeaderProps) {
      setHeaderProps({ title: 'My Spaces' });
    }
  }, [setHeaderProps]);

  const { devices, linkDevice } = useDevice();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
  const [inspectDevice, setInspectDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const ROOM_SUGGESTIONS = ['Living Room', 'Master Bedroom', 'Kids Room', 'Kitchen', 'Office'];

  // Filter devices by selected space if specified
  const filteredDevices = useMemo(() => {
    if (!selectedSpace || selectedSpace === 'All Spaces' || selectedSpace === 'Home' || selectedSpace === 'Office') {
      return devices;
    }
    return devices.filter((d) => {
      const roomStr = (d.room || d.name || '').toLowerCase();
      return roomStr.includes(selectedSpace.toLowerCase());
    });
  }, [devices, selectedSpace]);

  // Status strip aggregates
  const onlineCount = useMemo(() => devices.filter((d) => d.status === 'online').length, [devices]);

  const handleOpenInspect = (device) => {
    setInspectDevice(device);
    setDrawerOpen(true);
  };

  const handleLinkDevice = async (e) => {
    e.preventDefault();
    const result = await linkDevice(linkForm.deviceId, linkForm.name, linkForm.deviceType);
    if (result.success) {
      if (result.apiKey) {
        toast.success('Device linked successfully', {
          description: `Save this API key: ${result.apiKey}`,
        });
      } else {
        toast.success('Device linked successfully!');
      }
      setLinkDialogOpen(false);
      setLinkForm({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
    } else {
      toast.error(result.error);
    }
  };

  const handleAllOff = async () => {
    try {
      const onlineDevices = devices.filter((d) => d.status === 'online');
      if (!onlineDevices.length) {
        toast.info('No online devices to switch off');
        return;
      }
      await Promise.all(
        onlineDevices.map((d) =>
          api.post('/relay', { device_id: d.device_id, relay: false, relay_mode: 'manual' })
        )
      );
      toast.success('All online loads turned OFF');
    } catch (err) {
      toast.error('Failed to execute All OFF command');
    }
  };

  const handleAllAuto = async () => {
    try {
      await Promise.all(
        devices.map((d) => api.post('/mode', { device_id: d.device_id, mode: 'auto' }))
      );
      toast.success('All devices switched to AUTO mode');
    } catch (err) {
      toast.error('Failed to update devices to auto mode');
    }
  };

  const handleNightRoutine = async () => {
    try {
      const bedRooms = devices.filter((d) => /bed|sleep/i.test(d.name || d.room || ''));
      const targetDevices = bedRooms.length ? bedRooms : devices;
      await Promise.all(
        targetDevices.map((d) => api.post('/mode', { device_id: d.device_id, mode: 'sleep' }))
      );
      toast.success('Night Routine activated (Sleep Tracking)');
    } catch (err) {
      toast.error('Failed to activate Night Routine');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Headrow: Title, Subtitle, and Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Spaces
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            See what matters. Everything else stays one tap away.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle (Grid / Table) */}
          <div className="flex items-center bg-secondary/60 border border-border/80 rounded-xl p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 p-0 rounded-lg ${
                viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 w-8 p-0 rounded-lg ${
                viewMode === 'table' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
              title="Table View"
            >
              <List size={15} />
            </Button>
          </div>

          {/* Add Device Primary Button */}
          <Button
            onClick={() => setLinkDialogOpen(true)}
            className="h-9 px-3.5 rounded-xl font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Add Device</span>
          </Button>
        </div>
      </div>

      {/* 2. Status Strip: KPI Chip Strip (matches prototype .summaryline) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2 bg-card border border-border/80 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{onlineCount} online</span>
        </span>

        <span className="inline-flex items-center gap-2 bg-card border border-border/80 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>{filteredDevices.length} monitored spaces</span>
        </span>

        <span className="inline-flex items-center gap-2 bg-card border border-border/80 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Smart auto-off active</span>
        </span>
      </div>

      {/* 3. Devices Section Title */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
          <span>Devices</span>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {filteredDevices.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {viewMode === 'grid' ? 'Switch to Table' : 'Switch to Grid'}
        </button>
      </div>

      {/* 4. Devices Grid or Table View */}
      {filteredDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-secondary/10 max-w-md mx-auto my-6">
          <div className="p-3 rounded-2xl bg-secondary text-primary">
            <Radio size={32} />
          </div>
          <h3 className="text-base font-semibold text-foreground mt-3">No Devices Linked</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Connect a BlareXSense mmWave radar unit to observe presence and control appliances.
          </p>
          <Button
            onClick={() => setLinkDialogOpen(true)}
            className="h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground mt-4 rounded-xl"
          >
            <Plus size={15} className="mr-1.5" />
            Link Device
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <PrototypeDeviceCard
              key={device.device_id}
              device={device}
              onInspect={handleOpenInspect}
              navigate={navigate}
            />
          ))}

          {/* "+ Link New Device" Dashed Card */}
          <div
            onClick={() => setLinkDialogOpen(true)}
            className="border-2 border-dashed border-border/80 bg-secondary/10 hover:border-primary/50 hover:bg-secondary/20 transition-all rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer min-h-[175px] group"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus size={20} />
            </div>
            <b className="text-sm font-semibold text-foreground mt-2 group-hover:text-primary transition-colors">
              Link New Device
            </b>
            <span className="text-xs text-muted-foreground mt-0.5">Assign sensor to another room</span>
          </div>
        </div>
      ) : (
        /* Tabular Device View (.tablecard) */
        <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDevices.map((device) => (
                  <tr
                    key={device.device_id}
                    onClick={() => handleOpenInspect(device)}
                    className="hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                          <Radio size={16} />
                        </div>
                        <span className="font-semibold text-foreground">{device.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{device.room || 'Living Room'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium text-[11px] ${
                          device.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            device.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground'
                          }`}
                        />
                        {device.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] uppercase bg-secondary px-2 py-0.5 rounded-md text-foreground">
                        {device.mode || 'auto'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInspect(device);
                        }}
                        className="h-7 text-xs text-primary hover:bg-secondary"
                      >
                        Inspect
                        <ChevronRight size={13} className="ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. Quick Actions Section Split: 1.2fr : 0.8fr (matches prototype .quickrow) */}
      <div className="pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          {/* Left Column: Quick Actions Card */}
          <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
              <span className="text-xs text-muted-foreground">Global triggers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleAllOff}
                className="p-3 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all text-left group"
              >
                <b className="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  Turn all OFF
                </b>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Switch off all online relays
                </span>
              </button>

              <button
                type="button"
                onClick={handleAllAuto}
                className="p-3 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all text-left group"
              >
                <b className="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  All Auto Mode
                </b>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Enforce radar presence automation
                </span>
              </button>

              <button
                type="button"
                onClick={handleNightRoutine}
                className="p-3 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all text-left group"
              >
                <b className="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  Night Routine
                </b>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Engage quiet sleep surveillance
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (devices.length > 0) {
                    handleOpenInspect(devices[0]);
                  } else {
                    toast.info('Link a device first to calibrate');
                  }
                }}
                className="p-3 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all text-left group"
              >
                <b className="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  Noise Calibration
                </b>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Sample 16 gates in active room
                </span>
              </button>
            </div>
          </Card>

          {/* Right Column: Latest Alerts Feed */}
          <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                <Bell size={16} className="text-primary" />
                <span>Latest Alerts</span>
              </h2>
              <Link to="/notifications" className="text-xs font-semibold text-primary hover:underline">
                History
              </Link>
            </div>

            <div className="space-y-2.5 flex-1">
              <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-start gap-2.5 text-xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-foreground block text-xs">Radar Hub Synchronized</b>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Multi-tenant telemetry ingestion active across {onlineCount} online units.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-start gap-2.5 text-xs">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-foreground block text-xs">Absence Guard Ready</b>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Automations scheduler will auto-off loads after confirmed vacancy.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/notifications')}
              className="w-full text-xs font-medium border-border/80 hover:bg-secondary h-8 rounded-xl"
            >
              View Full Security & Sensor Logs
            </Button>
          </Card>
        </div>
      </div>

      {/* Slide-out Inspect Drawer */}
      <DeviceInspectDrawer
        device={inspectDevice}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Reusable Link Device Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Link New BlareX Sense Unit
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pair a new radar sensor and assign it to a room or location.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkDevice} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="deviceId" className="text-xs font-semibold text-foreground">
                Device ID
              </Label>
              <Input
                id="deviceId"
                placeholder="e.g. BX-SENSE-A7F2 or STD-001"
                value={linkForm.deviceId}
                onChange={(e) => setLinkForm({ ...linkForm, deviceId: e.target.value })}
                required
                className="text-xs bg-secondary/40 h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Printed on your radar switch hardware label.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                Room / Location
              </Label>
              <Input
                id="name"
                placeholder="e.g. Living Room"
                value={linkForm.name}
                onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                required
                className="text-xs bg-secondary/40 h-9"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground">Suggestions:</span>
                {ROOM_SUGGESTIONS.map((room) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setLinkForm({ ...linkForm, name: room })}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinkDialogOpen(false)}
                className="text-xs h-9 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-xl"
              >
                Link Device
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}