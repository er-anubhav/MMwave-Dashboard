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
  Bot,
  MapPin,
  MoreHorizontal,
  QrCode,
  KeyRound,
  ScanLine,
  RefreshCw
} from 'lucide-react';
import api from '../api/api';
import { toast } from 'sonner';
import DeviceInspectDrawer from '../components/DeviceInspectDrawer';
import RealQrScanner from '../components/RealQrScanner';
import deviceImg from '../assets/blarex-device.png';

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
      className="group relative border border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer rounded-2xl sm:rounded-[22px] p-4.5 sm:p-5 flex flex-col justify-between min-h-[190px] select-none"
    >
      {/* Top Row: Device Thumbnail, Title, Room, and Kebab Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={deviceImg}
            alt={device.name}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border border-border/70 bg-secondary/30 shrink-0 transition-transform group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/blarex-device.png';
            }}
          />
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-normal text-foreground truncate group-hover:text-primary transition-colors">
              {device.name}
            </h3>
            <p className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5 truncate">
              {device.room || 'Living Room'}
            </p>
          </div>
        </div>

        {/* Three dots (kebab) button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(device);
          }}
          className="w-9 h-9 rounded-xl bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
          title="Device options & settings"
          aria-label="Device options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Presence Status Banner */}
      <div
        className={`my-3.5 px-4 py-3 rounded-2xl border flex items-center justify-between transition-all ${
          !isOnline
            ? 'bg-secondary/20 border-border/40 text-muted-foreground'
            : isOccupied
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-secondary/30 border-border/50 text-muted-foreground'
        }`}
      >
        <div className="min-w-0 pr-2">
          <div className={`text-sm font-normal leading-tight ${isOccupied && isOnline ? 'text-emerald-800 dark:text-emerald-300' : 'text-foreground'}`}>
            {!isOnline ? 'Offline' : isOccupied ? 'Person present' : 'No presence'}
          </div>
          <div className={`text-xs mt-1 leading-none ${isOccupied && isOnline ? 'text-emerald-700/80 dark:text-emerald-400/80' : 'text-muted-foreground'}`}>
            {!isOnline ? 'Last state unavailable' : isOccupied ? 'Live presence detected' : 'Space is clear'}
          </div>
        </div>
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            !isOnline
              ? 'bg-muted-foreground/30'
              : isOccupied
              ? 'bg-emerald-500 animate-pulse'
              : 'bg-muted-foreground/40'
          }`}
        />
      </div>

      {/* Card Footer: Operating Mode Badge + Clean Switch Toggle */}
      <div
        className="flex items-center justify-between pt-1 text-xs sm:text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-normal capitalize px-3 py-1.5 rounded-xl bg-secondary/60 text-secondary-foreground border border-border/50 select-none">
          {mode} mode
        </span>

        <Switch
          checked={relayState}
          disabled={togglingRelay || !isOnline}
          onCheckedChange={toggleRelay}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </Card>
  );
}

export default function DeviceManagement() {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const setHeaderProps = context.setHeaderProps;

  useEffect(() => {
    if (setHeaderProps) {
      setHeaderProps({ title: 'My Spaces' });
    }
  }, [setHeaderProps]);

  const { devices, linkDevice } = useDevice();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addMethod, setAddMethod] = useState('qr'); // 'qr' | 'id'
  const [setupCode, setSetupCode] = useState('');
  const [linkForm, setLinkForm] = useState({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
  const [inspectDevice, setInspectDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [localSpace, setLocalSpace] = useState('All Spaces');
  const activeSpace = context.selectedSpace || localSpace;

  const ROOM_SUGGESTIONS = ['Living Room', 'Master Bedroom', 'Kids Room', 'Kitchen', 'Office'];

  const availableRooms = useMemo(() => {
    const rooms = new Set(['All Spaces', 'Living Room', 'Master Bedroom', 'Kitchen', 'Office']);
    devices.forEach((d) => {
      if (d.room) rooms.add(d.room);
      if (d.name) {
        const match = d.name.match(/(Living Room|Bedroom|Kitchen|Office|Hall|Master)/i);
        if (match) rooms.add(match[0]);
      }
    });
    return Array.from(rooms);
  }, [devices]);

  // Filter devices by selected space if specified
  const filteredDevices = useMemo(() => {
    if (!activeSpace || activeSpace === 'All Spaces' || activeSpace === 'Home' || activeSpace === 'Office') {
      return devices;
    }
    return devices.filter((d) => {
      const roomStr = (d.room || d.name || '').toLowerCase();
      return roomStr.includes(activeSpace.toLowerCase());
    });
  }, [devices, activeSpace]);

  // Status strip aggregates
  const onlineCount = useMemo(() => devices.filter((d) => d.status === 'online').length, [devices]);

  // Fetch alerts and format as consumer-friendly events (strictly top 2)
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let mounted = true;
    api.get('/notifications/history')
      .then((res) => {
        if (mounted && res.data?.notifications && res.data.notifications.length > 0) {
          setAlerts(res.data.notifications.slice(0, 2));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const displayAlerts = useMemo(() => {
    if (!alerts || alerts.length === 0) {
      return [];
    }

    return alerts.slice(0, 2).map((item) => {
      const deviceName = item.device_name || item.room || item.device_id || 'Monitored Space';
      const isAlert =
        item.severity === 'critical' ||
        item.severity === 'warning' ||
        (item.event && item.event.toLowerCase().includes('presence')) ||
        (item.event && item.event.toLowerCase().includes('alert'));

      const cleanText = item.description || item.event || 'Activity detected';

      let timeStr = 'Recent';
      if (item.created_at || item.timestamp) {
        try {
          const d = new Date(item.created_at || item.timestamp);
          const isToday = new Date().toDateString() === d.toDateString();
          const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          timeStr = (isToday ? 'Today • ' : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' • ') + timePart;
        } catch {
          timeStr = 'Recent';
        }
      }

      return {
        id: item.id || Math.random(),
        device: deviceName,
        text: cleanText,
        time: item.time || timeStr,
        isAlert: isAlert,
      };
    });
  }, [alerts]);

  const handleOpenInspect = (device) => {
    setInspectDevice(device);
    setDrawerOpen(true);
  };

  const handleOpenAddDevice = () => {
    setAddStep(1);
    setAddMethod('qr');
    setSetupCode('');
    setLinkForm({ deviceId: '', name: '', deviceType: 'BlareXSense_switch' });
    setLinkDialogOpen(true);
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    if (addStep === 1) {
      setAddStep(2);
      return;
    }
    if (addStep === 2) {
      if (!linkForm.deviceId.trim()) {
        toast.error(addMethod === 'qr' ? 'Please scan a device QR code or enter Device ID' : 'Device ID is required');
        return;
      }
      if (addMethod === 'id' && setupCode && setupCode.trim().length < 4) {
        toast.error('Setup code should be at least 4 digits');
        return;
      }
      setAddStep(3);
      return;
    }
    if (addStep === 3) {
      handleLinkDevice();
    }
  };

  const handlePrevStep = () => {
    if (addStep > 1) {
      setAddStep(addStep - 1);
    } else {
      setLinkDialogOpen(false);
    }
  };

  const handleLinkDevice = async (e) => {
    if (e) e.preventDefault();
    if (!linkForm.deviceId.trim()) {
      toast.error('Device ID is required');
      return;
    }
    const finalName = linkForm.name.trim() || 'Living Room Sense';
    const result = await linkDevice(linkForm.deviceId.trim().toUpperCase(), finalName, linkForm.deviceType);
    if (result.success) {
      if (result.apiKey) {
        toast.success('Device linked successfully', {
          description: `Save this API key: ${result.apiKey}`,
        });
      } else {
        toast.success('Device linked successfully!');
      }
      setLinkDialogOpen(false);
      setAddStep(1);
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
      {/* 1. Headrow: Title, Live Telemetry Subtitle, and Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-foreground">
            My Spaces
          </h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                onlineCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'
              }`}
            />
            <span>
              <span className="text-foreground font-normal">{onlineCount}</span> of {devices.length} {devices.length === 1 ? 'sensor' : 'sensors'} online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Space / Room Filter */}
          <div className="flex items-center gap-2 bg-card border border-border/80 rounded-xl px-3 h-10 text-sm font-normal text-foreground">
            <MapPin size={15} className="text-primary shrink-0" />
            <select
              value={localSpace}
              onChange={(e) => setLocalSpace(e.target.value)}
              className="bg-transparent border-0 font-normal text-foreground text-sm focus:outline-none cursor-pointer pr-1"
              aria-label="Filter by space"
            >
              {availableRooms.map((room) => (
                <option key={room} value={room} className="bg-card text-foreground">
                  {room}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle (Grid / Table) */}
          <div className="flex items-center bg-secondary/40 border border-border/80 rounded-xl p-1 h-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 p-0 rounded-lg ${
                viewMode === 'grid' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 w-8 p-0 rounded-lg ${
                viewMode === 'table' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View"
            >
              <List size={16} />
            </Button>
          </div>

          {/* Add Device Primary Button */}
          <Button
            onClick={handleOpenAddDevice}
            className="h-10 px-4 rounded-xl font-normal text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus size={16} />
            <span>Add Device</span>
          </Button>
        </div>
      </div>

      {/* 3. Devices Section Title */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg sm:text-xl font-normal tracking-tight text-foreground flex items-center gap-2.5">
          <span>Devices</span>
          <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {filteredDevices.length}
          </span>
        </h2>
      </div>

      {/* 4. Devices Grid or Table View */}
      {filteredDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-secondary/10 max-w-md mx-auto my-6">
          <div className="p-3 rounded-2xl bg-secondary text-primary">
            <Radio size={32} />
          </div>
          <h3 className="text-base sm:text-lg font-normal text-foreground mt-3">No Devices Linked</h3>
          <p className="text-xs sm:text-sm font-normal text-muted-foreground mt-1 max-w-xs leading-relaxed">
            Connect a BlareXSense mmWave radar unit to observe presence and control appliances.
          </p>
          <Button
            onClick={handleOpenAddDevice}
            className="h-10 px-4 text-sm font-normal bg-primary text-primary-foreground mt-4 rounded-xl"
          >
            <Plus size={16} className="mr-1.5" />
            Link Device
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
            onClick={handleOpenAddDevice}
            className="border-2 border-dashed border-border/80 bg-secondary/10 hover:border-primary/50 hover:bg-secondary/20 transition-all rounded-2xl sm:rounded-[22px] p-5 flex flex-col items-center justify-center text-center cursor-pointer min-h-[190px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-secondary/60 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus size={22} />
            </div>
            <span className="text-base font-normal text-foreground mt-2.5 group-hover:text-primary transition-colors">
              Link New Device
            </span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
              Assign sensor to another room
            </span>
          </div>
        </div>
      ) : (
        /* Tabular Device View (.tablecard) */
        <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-normal">
                  <th className="py-3.5 px-4 font-normal">Device</th>
                  <th className="py-3.5 px-4 font-normal">Room</th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 font-normal">Mode</th>
                  <th className="py-3.5 px-4 text-right font-normal">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDevices.map((device) => (
                  <tr
                    key={device.device_id}
                    onClick={() => handleOpenInspect(device)}
                    className="hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={deviceImg}
                          alt={device.name}
                          className="w-8 h-8 rounded-lg object-cover border border-border/60 bg-secondary/30 shrink-0"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/blarex-device.png';
                          }}
                        />
                        <span className="font-normal text-foreground">{device.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-normal">{device.room || 'Living Room'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-normal text-xs ${
                          device.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-500'
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
                    <td className="py-3.5 px-4">
                      <span className="text-xs uppercase bg-secondary px-2.5 py-1 rounded-md text-foreground font-normal">
                        {device.mode || 'auto'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInspect(device);
                        }}
                        className="h-8 text-xs sm:text-sm font-normal text-primary hover:bg-secondary"
                      >
                        Inspect
                        <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. Quick Actions Section Split: 1.2fr : 0.8fr */}
      <div className="pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 sm:gap-5">
          {/* Left Column: Quick Actions Card */}
          <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-normal text-foreground">Quick Actions</h2>
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">Global triggers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleAllOff}
                className="p-3 rounded-xl border border-border/70 bg-secondary/20 hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group"
              >
                <span className="block text-sm font-normal text-foreground group-hover:text-primary transition-colors">
                  Turn all OFF
                </span>
                <span className="block text-xs font-normal text-muted-foreground mt-1 leading-normal">
                  Switch off all online relays
                </span>
              </button>

              <button
                type="button"
                onClick={handleAllAuto}
                className="p-3 rounded-xl border border-border/70 bg-secondary/20 hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group"
              >
                <span className="block text-sm font-normal text-foreground group-hover:text-primary transition-colors">
                  All Auto Mode
                </span>
                <span className="block text-xs font-normal text-muted-foreground mt-1 leading-normal">
                  Enforce radar presence automation
                </span>
              </button>

              <button
                type="button"
                onClick={handleNightRoutine}
                className="p-3 rounded-xl border border-border/70 bg-secondary/20 hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group"
              >
                <span className="block text-sm font-normal text-foreground group-hover:text-primary transition-colors">
                  Night Routine
                </span>
                <span className="block text-xs font-normal text-muted-foreground mt-1 leading-normal">
                  Engage quiet sleep surveillance
                </span>
              </button>
            </div>
          </Card>

          {/* Right Column: Latest Alert Feed */}
          <Card className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/30">
              <h2 className="text-base font-normal text-foreground">
                Latest alert
              </h2>
              <Link to="/notifications" className="text-xs sm:text-sm font-normal text-primary hover:underline">
                History
              </Link>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {displayAlerts.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs font-normal text-muted-foreground">
                    No active alerts • All monitored spaces are clear
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {displayAlerts.slice(0, 2).map((item) => (
                    <div key={item.id} className="py-2.5 first:pt-1 last:pb-1 flex items-start gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold mt-0.5 select-none ${
                          item.isAlert
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.isAlert ? '!' : '◉'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm sm:text-base font-normal text-foreground leading-tight">
                          {item.device}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground mt-1 leading-snug">
                          {item.text}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground/70 mt-0.5">
                          {item.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Slide-out Inspect Drawer */}
      <DeviceInspectDrawer
        device={inspectDevice}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Reusable Multi-Step Add Device Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border text-foreground rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
                Step {addStep} of 3 • {addStep === 1 ? 'Method' : addStep === 2 ? (addMethod === 'qr' ? 'Scan' : 'Credentials') : 'Space & Profile'}
              </span>
            </div>
            <DialogTitle className="text-lg font-normal text-foreground">
              {addStep === 1 && 'How would you like to add it?'}
              {addStep === 2 && (addMethod === 'qr' ? 'Scan the device QR' : 'Enter pairing details')}
              {addStep === 3 && 'Name & assign space'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-normal text-muted-foreground">
              {addStep === 1 && 'Select whether to scan the device QR code or enter hardware credentials manually.'}
              {addStep === 2 && (addMethod === 'qr' ? 'Position the sensor QR code in front of camera or use detected ID.' : 'Enter the unique Device ID and optional 6-digit setup code.')}
              {addStep === 3 && 'Give your radar sensor a recognizable name and assign it to a room.'}
            </DialogDescription>
          </DialogHeader>

          {/* 3-Step Progress Indicator Bar */}
          <div className="flex items-center gap-1.5 pt-1 pb-2">
            <div className={`h-1 flex-1 rounded-full transition-all ${addStep >= 1 ? 'bg-primary' : 'bg-secondary'}`} />
            <div className={`h-1 flex-1 rounded-full transition-all ${addStep >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
            <div className={`h-1 flex-1 rounded-full transition-all ${addStep >= 3 ? 'bg-primary' : 'bg-secondary'}`} />
          </div>

          <form onSubmit={handleNextStep} className="space-y-4">
            {/* Step 1: Choice between QR Code & Device ID */}
            {addStep === 1 && (
              <div className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddMethod('qr');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      addMethod === 'qr'
                        ? 'border-primary/70 bg-primary/5 text-foreground ring-1 ring-primary/40'
                        : 'border-border/70 bg-card hover:bg-secondary/40 text-foreground'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary/80 flex items-center justify-center text-primary">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-normal text-foreground">Scan QR code</div>
                      <div className="text-xs font-normal text-muted-foreground mt-0.5 leading-relaxed">
                        Fastest. Use the QR printed on the device or setup card.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddMethod('id');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      addMethod === 'id'
                        ? 'border-primary/70 bg-primary/5 text-foreground ring-1 ring-primary/40'
                        : 'border-border/70 bg-card hover:bg-secondary/40 text-foreground'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary/80 flex items-center justify-center text-primary">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-normal text-foreground">Enter Device ID</div>
                      <div className="text-xs font-normal text-muted-foreground mt-0.5 leading-relaxed">
                        Use the unique Device ID and Setup Code.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Scanner or Manual Input */}
            {addStep === 2 && (
              <div className="space-y-4 pt-1">
                {addMethod === 'qr' ? (
                  <div className="space-y-3">
                    <RealQrScanner
                      scannedValue={linkForm.deviceId}
                      onScan={(detectedId) => {
                        setLinkForm((prev) => ({ ...prev, deviceId: detectedId }));
                        toast.success(`QR code detected: ${detectedId}`);
                      }}
                      onReset={() => {
                        setLinkForm((prev) => ({ ...prev, deviceId: '' }));
                      }}
                    />

                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="detectedId" className="text-xs font-normal text-muted-foreground">
                        {linkForm.deviceId ? 'Detected Device ID (Editable if needed)' : 'Or enter Device ID manually'}
                      </Label>
                      <Input
                        id="detectedId"
                        value={linkForm.deviceId}
                        onChange={(e) => setLinkForm({ ...linkForm, deviceId: e.target.value })}
                        placeholder="e.g. BX-SENSE-A7F2 or STD-001"
                        className="text-xs sm:text-sm font-normal bg-secondary/30 h-9 sm:h-10 rounded-xl  uppercase"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="manualDeviceId" className="text-xs sm:text-sm font-normal text-foreground">
                        Device ID
                      </Label>
                      <Input
                        id="manualDeviceId"
                        placeholder="e.g. BX-SENSE-A7F2 or STD-001"
                        value={linkForm.deviceId}
                        onChange={(e) => setLinkForm({ ...linkForm, deviceId: e.target.value })}
                        required
                        className="text-xs sm:text-sm font-normal bg-secondary/30 h-10 rounded-xl  uppercase"
                        autoFocus
                      />
                      <p className="text-xs font-normal text-muted-foreground">
                        Printed on the barcode label under the radar housing.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="setupCode" className="text-xs sm:text-sm font-normal text-foreground">
                        Setup Code (Optional)
                      </Label>
                      <Input
                        id="setupCode"
                        placeholder="6-digit PIN (e.g. 748192)"
                        maxLength={6}
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value)}
                        className="text-xs sm:text-sm font-normal bg-secondary/30 h-10 rounded-xl "
                      />
                      <p className="text-xs font-normal text-muted-foreground">
                        Found inside the quick start packaging card.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Name & Room Assignment */}
            {addStep === 3 && (
              <div className="space-y-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="devName" className="text-xs sm:text-sm font-normal text-foreground">
                    Device Name
                  </Label>
                  <Input
                    id="devName"
                    placeholder="e.g. Living Room Sense"
                    value={linkForm.name}
                    onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                    required
                    className="text-xs sm:text-sm font-normal bg-secondary/30 h-10 rounded-xl"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-normal text-foreground">
                    Room / Space Assignment
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {ROOM_SUGGESTIONS.map((room) => {
                      const isSelected = linkForm.name.toLowerCase().includes(room.toLowerCase());
                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => {
                            setLinkForm((prev) => ({
                              ...prev,
                              name: `${room} Sense`,
                            }));
                          }}
                          className={`text-xs font-normal px-2.5 py-1 rounded-full border transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/80 bg-secondary/40 hover:bg-secondary text-foreground'
                          }`}
                        >
                          {room}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="deviceType" className="text-xs sm:text-sm font-normal text-foreground">
                    Hardware Model / Profile
                  </Label>
                  <select
                    id="deviceType"
                    value={linkForm.deviceType}
                    onChange={(e) => setLinkForm({ ...linkForm, deviceType: e.target.value })}
                    className="w-full text-xs sm:text-sm font-normal bg-secondary/30 border border-border/80 rounded-xl h-10 px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="BlareXSense_switch">BlareX Sense Switch (Relay + mmWave Radar)</option>
                    <option value="BlareXSense_sensor">BlareX Radar Node (Telemetry Only)</option>
                  </select>
                  <p className="text-xs font-normal text-muted-foreground">
                    Radar micro-motion sensitivity thresholds can be calibrated anytime in Device Inspect.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Navigation Footer */}
            <DialogFooter className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevStep}
                className="text-xs sm:text-sm font-normal h-9 sm:h-10 px-4 rounded-xl border-border/70"
              >
                {addStep === 1 ? 'Cancel' : 'Back'}
              </Button>

              <Button
                type="submit"
                size="sm"
                className="text-xs sm:text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 px-4 rounded-xl"
              >
                {addStep < 3 ? 'Continue' : 'Link Device'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}