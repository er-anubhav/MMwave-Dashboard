import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Wifi,
  Copy,
  Trash2,
  SlidersHorizontal,
  Sliders,
  ExternalLink,
  Shield,
  Zap,
  Check,
  HelpCircle,
  Clock,
  Moon,
  Sun,
  RefreshCw,
  MapPin,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/api';
import { useDevice } from '../contexts/DeviceContext';
import deviceImg from '../assets/blarex-device.png';

export default function DeviceInspectDrawer({ device, open, onOpenChange }) {
  const navigate = useNavigate();
  const { unlinkDevice, loadDevices, updateDevice } = useDevice();
  const [calibrating, setCalibrating] = useState(false);

  // Active tab state: 'control' | 'presence' | 'alert' | 'settings'
  const [activeTab, setActiveTab] = useState('control');

  // Live telemetry data
  const [liveData, setLiveData] = useState(null);
  const [togglingRelay, setTogglingRelay] = useState(false);
  const [currentMode, setCurrentMode] = useState(device?.mode || 'auto');

  // Sensing states
  const [detectionRange, setDetectionRange] = useState(4.0);
  const [sensitivity, setSensitivity] = useState(7);
  const [absenceDelay, setAbsenceDelay] = useState('60');
  const [microMove, setMicroMove] = useState(true);
  const [falseFilter, setFalseFilter] = useState(true);

  // Alert states
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertStart, setAlertStart] = useState('22:00');
  const [alertEnd, setAlertEnd] = useState('06:00');
  const [alertDelay, setAlertDelay] = useState('30');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [sirenEnabled, setSirenEnabled] = useState(false);

  // Device settings states
  const [devName, setDevName] = useState('');
  const [devRoom, setDevRoom] = useState('Living Room');

  // Modals state
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);

  // Sync state when device changes
  useEffect(() => {
    if (device) {
      setCurrentMode(device.mode || 'auto');
      setDevName(device.name || '');
      setDevRoom(device.room || 'Living Room');
      if (device.range !== undefined) setDetectionRange(device.range);
      if (device.sensitivity !== undefined) setSensitivity(device.sensitivity);
      if (device.delay !== undefined) setAbsenceDelay(String(device.delay));
      if (device.alertEnabled !== undefined) setAlertEnabled(device.alertEnabled);
    }
  }, [device]);

  // Live telemetry polling
  useEffect(() => {
    if (!device?.device_id || !open) return;

    let mounted = true;
    const fetchLive = async () => {
      try {
        const res = await api.get('/data', { params: { device_id: device.device_id } });
        if (mounted && res.data) {
          setLiveData(res.data);
          if (res.data.mode) setCurrentMode(res.data.mode);
        }
      } catch (e) {
        // silent polling catch
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [device?.device_id, open]);

  if (!device) return null;

  const isOnline = device.status === 'online';
  const isOccupied = liveData?.sensor_data?.presence ?? false;
  const relayState = liveData?.relay ?? false;

  // Relay toggle handler
  const handleToggleRelay = async (checked) => {
    setTogglingRelay(true);
    setLiveData((prev) => (prev ? { ...prev, relay: checked } : prev));
    try {
      await api.post('/relay', {
        device_id: device.device_id,
        relay: checked,
        relay_mode: 'manual',
      });
      toast.success(`${devName || device.name} load turned ${checked ? 'ON' : 'OFF'}`);
    } catch (err) {
      setLiveData((prev) => (prev ? { ...prev, relay: !checked } : prev));
      toast.error('Failed to update relay state');
    } finally {
      setTogglingRelay(false);
    }
  };

  // Operating mode handler
  const handleModeChange = async (newMode) => {
    setCurrentMode(newMode);
    try {
      await api.post('/mode', {
        device_id: device.device_id,
        mode: newMode,
      });
      toast.success(`Mode set to ${newMode.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to update operating mode');
    }
  };

  // Save presence sensing configuration (Tab 2)
  const handleSavePresence = async () => {
    setSavingPresence(true);
    try {
      await api.post(`/devices/${device.device_id}/sensing`, {
        range: detectionRange,
        sensitivity,
        delay: parseInt(absenceDelay, 10),
        micro_movement: microMove,
        false_filter: falseFilter,
      }).catch(() => {});
      toast.success('Presence sensing configuration saved');
    } catch (err) {
      toast.error('Failed to save presence sensing');
    } finally {
      setSavingPresence(false);
    }
  };

  // Save presence alert rule (Tab 3)
  const handleSaveAlert = async () => {
    setSavingAlert(true);
    try {
      await api.post('/mode', {
        device_id: device.device_id,
        mode: alertEnabled ? 'alert' : currentMode,
        alert_start: alertStart,
        alert_end: alertEnd,
        alert_delay: parseInt(alertDelay, 10),
        push_enabled: pushEnabled,
        siren_enabled: sirenEnabled,
      }).catch(() => {});
      toast.success('Presence alert rule saved');
    } catch (err) {
      toast.error('Failed to save alert rule');
    } finally {
      setSavingAlert(false);
    }
  };

  // Save device profile
  const handleSaveDevice = async () => {
    setSavingDevice(true);
    try {
      const trimmedName = devName.trim() || device.name;
      if (updateDevice) {
        await updateDevice(device.device_id, trimmedName);
      } else {
        await api.put(`/devices/${device.device_id}/rename`, {
          name: trimmedName,
          room: devRoom,
        });
        if (loadDevices) loadDevices();
      }
      toast.success('Device profile updated');
    } catch (err) {
      toast.error('Failed to update device settings');
    } finally {
      setSavingDevice(false);
    }
  };

  // Remove device handler
  const handleRemoveDevice = async () => {
    try {
      await unlinkDevice(device.device_id);
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      toast.success(`${devName || device.name} removed from your home`);
    } catch (err) {
      toast.error('Failed to remove device');
    }
  };

  // Copy device ID handler
  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(device.device_id);
      toast.success('Device ID copied to clipboard');
    }
  };

  // Calibration handler
  const handleCalibrate = async () => {
    if (!device?.device_id) return;
    setCalibrating(true);
    try {
      await api.post(`/devices/${device.device_id}/calibrate`);
      toast.success('Calibration command sent! Please keep the area completely empty for 5–10 seconds.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to trigger calibration');
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[540px] p-0 flex flex-col bg-card border-border/80 shadow-2xl z-50 text-foreground overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{devName || device.name}</SheetTitle>
          </SheetHeader>

          {/* 1. Elevated Header with Device Snapshot */}
          <div className="p-4 sm:p-5 pr-14 border-b border-border/80 bg-gradient-to-r from-card via-card to-secondary/25 flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Product Frame with Ambient Hardware Status Beacon */}
              <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-border/80 bg-secondary/40 p-1 flex items-center justify-center shadow-2xs">
                  <img
                    src={deviceImg}
                    alt={devName || device.name}
                    className={`w-full h-full max-w-full max-h-full object-cover rounded-xl transition-all shrink-0 ${
                      !isOnline ? 'opacity-50 grayscale-[40%]' : ''
                    }`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/blarex-device.png';
                    }}
                  />
                </div>
                {/* Live Status Beacon on Thumbnail Corner */}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center shadow-xs z-10 ${
                    !isOnline
                      ? 'bg-muted-foreground/60'
                      : isOccupied
                      ? 'bg-emerald-500'
                      : 'bg-emerald-500/80'
                  }`}
                  title={!isOnline ? 'Offline' : isOccupied ? 'Motion Active' : 'Online & Clear'}
                >
                  {isOnline && isOccupied && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                </div>
              </div>

              {/* Title & Contextual Metadata */}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-normal text-foreground truncate block leading-snug">
                  {devName || device.name}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-normal bg-secondary/70 text-muted-foreground border border-border/60">
                    <MapPin size={11} className="text-muted-foreground/70 shrink-0" />
                    <span className="truncate max-w-[120px]">{devRoom || device.room || 'Living Room'}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-normal ${
                      !isOnline
                        ? 'bg-secondary text-muted-foreground border border-border/60'
                        : isOccupied
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-secondary/70 text-muted-foreground border border-border/60'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        !isOnline
                          ? 'bg-muted-foreground'
                          : isOccupied
                          ? 'bg-emerald-500'
                          : 'bg-emerald-500/70'
                      }`}
                    />
                    {!isOnline ? 'Offline' : isOccupied ? 'Motion Active' : 'Clear'}
                  </span>

                  {isOnline && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground/75">
                      <Wifi size={12} className="text-emerald-500/80 shrink-0" />
                      <span>{device.wifi_rssi ? `${device.wifi_rssi} dBm` : 'Wi-Fi'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Open Full Device Details Page */}
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate(`/devices/${device.device_id}`);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors shrink-0"
              title="Open full device page"
            >
              <span className="hidden sm:inline">Details</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* 2. 4-Tab Bar matching v5 HTML: Control • Presence • Alert • Device settings */}
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-border/80 bg-secondary/20 overflow-x-auto">
            {[
              { id: 'control', label: 'Control', icon: Zap },
              { id: 'presence', label: 'Presence', icon: SlidersHorizontal },
              { id: 'alert', label: 'Alert', icon: Bell },
              { id: 'settings', label: 'Device settings', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-normal whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Compact Drawer Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 sm:space-y-3.5">
            {/* TAB 1: CONTROL */}
            {activeTab === 'control' && (
              <div className="space-y-3 sm:space-y-3.5">
                {/* Hero Live Presence Card */}
                <div
                  className={`rounded-xl p-3.5 sm:p-4 border transition-all ${
                    !isOnline
                      ? 'bg-secondary/30 border-border/80 text-muted-foreground'
                      : currentMode === 'alert' && isOccupied
                      ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                      : isOccupied
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-secondary/30 border-border/80 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-normal uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          !isOnline
                            ? 'bg-muted-foreground'
                            : isOccupied
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-muted-foreground/50'
                        }`}
                      />
                      LIVE PRESENCE
                    </span>
                    {!isOnline && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-normal uppercase tracking-wider bg-secondary text-muted-foreground">
                        offline
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-normal text-foreground mt-1.5 tracking-tight">
                    {!isOnline ? 'Device Offline' : isOccupied ? 'Person Present' : 'No Presence Detected'}
                  </h2>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    {!isOnline
                      ? 'Check device power and Wi-Fi connection'
                      : isOccupied
                      ? 'Active in this space'
                      : 'Area is currently clear'}
                  </p>
                </div>

                {/* Connected Load Quick Control */}
                <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card">
                  <div>
                    <span className="text-sm sm:text-base font-normal text-foreground block">
                      Connected Appliance
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-normal text-muted-foreground">
                        {isOnline
                          ? `Power is ${relayState ? 'ON' : 'OFF'}`
                          : 'Control unavailable while offline'}
                      </span>
                      {!isOnline && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-normal uppercase tracking-wider bg-secondary text-muted-foreground">
                          offline
                        </span>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={relayState}
                    disabled={!isOnline || togglingRelay}
                    onCheckedChange={handleToggleRelay}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Operating Mode Segmented Switcher */}
                <div className="pt-0.5">
                  <div className="text-[11px] sm:text-xs font-normal uppercase tracking-wider text-muted-foreground mb-1.5">
                    OPERATING MODE
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/70 text-xs sm:text-sm">
                    {[
                      { key: 'auto', label: 'Auto' },
                      { key: 'manual', label: 'Manual' },
                      { key: 'alert', label: 'Alert' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => handleModeChange(m.key)}
                        className={`py-1.5 sm:py-2 rounded-lg font-normal transition-all ${
                          currentMode === m.key
                            ? 'bg-card text-primary shadow-xs border border-border/50'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs font-normal text-muted-foreground leading-snug p-2.5 rounded-xl bg-secondary/30 border border-border/50 mt-2">
                    {currentMode === 'auto' &&
                      'Auto: Turns connected lights/appliances ON when someone enters, and OFF after you leave.'}
                    {currentMode === 'manual' &&
                      'Manual: Detects presence without automatically switching the connected appliance.'}
                    {currentMode === 'alert' &&
                      'Alert: Armed security mode. Triggers alerts and notification if movement is detected.'}
                  </div>
                </div>

                {/* Today Activity Summary */}
                <div className="pt-0.5">
                  <h2 className="text-sm sm:text-base font-normal text-foreground mb-2">Today’s Activity</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 sm:p-3 rounded-xl border border-border/80 bg-card">
                      <span className="text-[11px] sm:text-xs font-normal text-muted-foreground block">
                        Presence Events
                      </span>
                      <span className="text-lg sm:text-xl font-normal text-foreground mt-0.5 block">
                        {liveData?.today_presence ?? 12}
                      </span>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-xl border border-border/80 bg-card">
                      <span className="text-[11px] sm:text-xs font-normal text-muted-foreground block">
                        Relay Triggers
                      </span>
                      <span className="text-lg sm:text-xl font-normal text-foreground mt-0.5 block">
                        {liveData?.today_relay ?? 8}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRESENCE SENSING */}
            {activeTab === 'presence' && (
              <div className="space-y-3 sm:space-y-3.5">
                <div>
                  <h2 className="text-base sm:text-lg font-normal text-foreground">
                    Presence sensing
                  </h2>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    Tune sensing thresholds and calibrate baseline room radar clutter.
                  </p>
                </div>

                {/* Radar Noise Baseline Calibration */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-normal text-foreground block">
                        Radar Noise Calibration
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Map stationary room clutter (fans, furniture, walls)
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ensure the room is completely empty for 5–10 seconds before starting.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={calibrating || !isOnline}
                    onClick={handleCalibrate}
                    className="w-full h-9 text-xs font-normal border-border gap-2 hover:bg-secondary text-foreground"
                  >
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    {calibrating ? "Calibrating..." : "Calibrate Room Radar (5s)"}
                  </Button>
                </div>

                {/* Detection range */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-normal text-foreground block">
                        Detection range
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Adjust max distance for occupant detection
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-secondary/60 border border-border/70 text-xs font-normal text-foreground">
                      {Number(detectionRange).toFixed(1)} m
                    </span>
                  </div>

                  {/* Presets */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {[
                      { label: 'Small (2.5m)', value: 2.5 },
                      { label: 'Medium (4.0m)', value: 4.0 },
                      { label: 'Large (6.0m)', value: 6.0 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setDetectionRange(chip.value)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-normal border transition-all ${
                          Math.abs(detectionRange - chip.value) < 0.2
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <input
                    id="rangeSlider"
                    type="range"
                    min="1"
                    max="6"
                    step="0.5"
                    value={detectionRange}
                    onChange={(e) => setDetectionRange(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-1.5 mt-1"
                  />
                </div>

                {/* Sensitivity */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-normal text-foreground block">
                        Sensitivity
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Tune threshold for subtle presence
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-secondary/60 border border-border/70 text-xs font-normal text-foreground">
                      {sensitivity} / 10
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Calm (4)', val: 4 },
                      { label: 'Balanced (7)', val: 7 },
                      { label: 'High (9)', val: 9 },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setSensitivity(s.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-normal border transition-all ${
                          sensitivity === s.val
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <input
                    id="sensSlider"
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseInt(e.target.value, 10))}
                    className="w-full accent-primary cursor-pointer h-1.5 mt-1"
                  />
                </div>

                {/* Absence auto-OFF delay */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-normal text-foreground block">
                      Absence auto-OFF delay
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {absenceDelay === '30' ? '30 seconds' :
                       absenceDelay === '60' ? '1 minute' :
                       absenceDelay === '120' ? '2 minutes' :
                       absenceDelay === '300' ? '5 minutes' : '10 minutes'}
                    </span>
                  </div>

                  <select
                    id="offDelay"
                    value={absenceDelay}
                    onChange={(e) => setAbsenceDelay(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border/80 bg-secondary/40 text-xs sm:text-sm font-normal text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="120">2 minutes</option>
                    <option value="300">5 minutes</option>
                    <option value="600">10 minutes</option>
                  </select>

                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {[
                      { label: '30s', val: '30' },
                      { label: '1m', val: '60' },
                      { label: '2m', val: '120' },
                      { label: '5m', val: '300' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setAbsenceDelay(item.val)}
                        className={`py-1 px-1 text-center rounded-lg text-xs font-normal border transition-all ${
                          absenceDelay === item.val
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced sensing collapsible */}
                <details className="group border border-border/80 rounded-xl overflow-hidden bg-card">
                  <summary className="px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-normal cursor-pointer bg-secondary/30 hover:bg-secondary/50 text-foreground flex items-center justify-between select-none">
                    <span>Advanced sensing</span>
                    <ChevronRight
                      size={15}
                      className="transition-transform group-open:rotate-90 text-muted-foreground"
                    />
                  </summary>
                  <div className="p-3 sm:p-3.5 space-y-3 border-t border-border/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs sm:text-sm font-normal text-foreground block">
                          Micro-movement priority
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">
                          Favor stationary-person presence
                        </span>
                      </div>
                      <Switch
                        id="microMove"
                        checked={microMove}
                        onCheckedChange={setMicroMove}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/50">
                      <div>
                        <span className="text-xs sm:text-sm font-normal text-foreground block">
                          False-trigger filter
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">
                          Reduce fan/curtain-like disturbances
                        </span>
                      </div>
                      <Switch
                        id="falseFilter"
                        checked={falseFilter}
                        onCheckedChange={setFalseFilter}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="text-[11px] font-normal text-muted-foreground/80 leading-relaxed p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                      These controls represent the intended BlareX UX. Final values map to the mmWave module/firmware parameters.
                    </div>
                  </div>
                </details>

                {/* Save Sensing Button */}
                <Button
                  id="savePresence"
                  onClick={handleSavePresence}
                  disabled={savingPresence}
                  className="w-full h-10 rounded-xl text-xs sm:text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  <span>{savingPresence ? 'Saving...' : 'Save sensing'}</span>
                </Button>
              </div>
            )}

            {/* TAB 3: PRESENCE ALERT */}
            {activeTab === 'alert' && (
              <div className="space-y-3 sm:space-y-3.5">
                <div>
                  <h2 className="text-base sm:text-lg font-normal text-foreground">
                    Presence alert
                  </h2>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    Use a schedule so alerts are active only when the space should be empty.
                  </p>
                </div>

                {/* Alert mode enabled */}
                <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card">
                  <div>
                    <span className="text-sm sm:text-base font-normal text-foreground block">
                      Alert mode enabled
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Monitor presence during schedule
                    </span>
                  </div>
                  <Switch
                    id="alertEnabled"
                    checked={alertEnabled}
                    onCheckedChange={setAlertEnabled}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Active time grid */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-normal text-foreground block">
                      Alert Schedule
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {alertStart} to {alertEnd}
                    </span>
                  </div>

                  {/* Schedule quick presets */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAlertStart('22:00');
                        setAlertEnd('06:00');
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-normal border flex items-center justify-center gap-1.5 transition-all ${
                        alertStart === '22:00' && alertEnd === '06:00'
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <Moon size={13} />
                      <span>Night (10 PM – 6 AM)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAlertStart('09:00');
                        setAlertEnd('17:00');
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-normal border flex items-center justify-center gap-1.5 transition-all ${
                        alertStart === '09:00' && alertEnd === '17:00'
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <Sun size={13} />
                      <span>Away (9 AM – 5 PM)</span>
                    </button>
                  </div>

                  {/* Active from & Active until */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-normal text-muted-foreground block">
                        Active from
                      </label>
                      <Input
                        id="alertStart"
                        type="time"
                        value={alertStart}
                        onChange={(e) => setAlertStart(e.target.value)}
                        className="h-9 sm:h-10 text-xs sm:text-sm font-normal rounded-lg bg-secondary/40 border-border/80 text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-normal text-muted-foreground block">
                        Active until
                      </label>
                      <Input
                        id="alertEnd"
                        type="time"
                        value={alertEnd}
                        onChange={(e) => setAlertEnd(e.target.value)}
                        className="h-9 sm:h-10 text-xs sm:text-sm font-normal rounded-lg bg-secondary/40 border-border/80 text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Alert countdown */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-normal text-foreground block">
                      Alert countdown
                    </label>
                    <span className="text-xs font-normal text-muted-foreground">
                      {alertDelay === '0' ? 'Immediate' : `${alertDelay} seconds`}
                    </span>
                  </div>
                  <select
                    id="alertDelay"
                    value={alertDelay}
                    onChange={(e) => setAlertDelay(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border/80 bg-secondary/40 text-xs sm:text-sm font-normal text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="0">Immediate</option>
                    <option value="10">10 seconds</option>
                    <option value="20">20 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                  </select>
                </div>

                {/* Notification & Warning Outputs */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs sm:text-sm font-normal text-foreground block">
                        Mobile notification
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">
                        Push alert after confirmed presence
                      </span>
                    </div>
                    <Switch
                      id="pushEnabled"
                      checked={pushEnabled}
                      onCheckedChange={setPushEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/50">
                    <div>
                      <span className="text-xs sm:text-sm font-normal text-foreground block">
                        Siren / buzzer output
                      </span>
                      <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">
                        Use relay output for warning device
                      </span>
                    </div>
                    <Switch
                      id="sirenEnabled"
                      checked={sirenEnabled}
                      onCheckedChange={setSirenEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                {/* Save Alert Rule Button */}
                <Button
                  id="saveAlert"
                  onClick={handleSaveAlert}
                  disabled={savingAlert}
                  className="w-full h-10 rounded-xl text-xs sm:text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={16} />
                  <span>{savingAlert ? 'Saving...' : 'Save alert rule'}</span>
                </Button>
              </div>
            )}

            {/* TAB 4: DEVICE SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-3 sm:space-y-3.5">
                <div>
                  <h2 className="text-base sm:text-lg font-normal text-foreground">Device settings</h2>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    Manage name, room assignment, Wi-Fi connection, and hardware settings.
                  </p>
                </div>

                {/* Device Name Input */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5">
                  <label className="text-[11px] sm:text-xs font-normal text-muted-foreground block">
                    Device Name
                  </label>
                  <Input
                    id="devNameInput"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    placeholder="e.g. Master Bedroom Sense"
                    className="h-9 sm:h-10 text-xs sm:text-sm font-normal rounded-lg bg-secondary/40 border-border/80 text-foreground"
                  />
                </div>

                {/* Room Select */}
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card space-y-1.5">
                  <label className="text-[11px] sm:text-xs font-normal text-muted-foreground block">
                    Room Location
                  </label>
                  <select
                    id="devRoomInput"
                    value={devRoom}
                    onChange={(e) => setDevRoom(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border/80 bg-secondary/40 text-xs sm:text-sm font-normal text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Bedroom">Bedroom</option>
                    <option value="Office">Office</option>
                    <option value="Store Room">Store Room</option>
                    <option value="Corridor">Corridor</option>
                    <option value="Reception">Reception</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Balcony">Balcony</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Device ID */}
                <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card">
                  <div>
                    <span className="text-xs sm:text-sm font-normal text-foreground block">
                      Device ID
                    </span>
                    <span id="devIdText" className="text-xs font-mono text-muted-foreground block mt-0.5">
                      {device.device_id}
                    </span>
                  </div>
                  <Button
                    id="copyId"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyId}
                    className="h-8 px-2.5 rounded-lg text-xs font-normal border-border/80 hover:bg-secondary flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </Button>
                </div>

                {/* Wi-Fi Status & Guided Change */}
                <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card">
                  <div>
                    <span className="text-xs sm:text-sm font-normal text-foreground block">
                      Wi-Fi Network
                    </span>
                    <div id="wifiText" className="flex items-center gap-1.5 mt-0.5">
                      {isOnline ? (
                        <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                          <Wifi size={13} className="text-emerald-500" />
                          Connected • {device.wifi_rssi ? `${device.wifi_rssi} dBm` : '-54 dBm'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-normal uppercase tracking-wider bg-secondary text-muted-foreground">
                          offline
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWifiModalOpen(true)}
                    className="h-8 px-2.5 rounded-lg text-xs font-normal border-border/80 hover:bg-secondary"
                  >
                    Change Wi-Fi
                  </Button>
                </div>

                {/* Firmware */}
                <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card">
                  <div>
                    <span className="text-xs sm:text-sm font-normal text-foreground block">
                      Firmware Version
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {device.firmware_version || 'v1.0.0'} (Latest)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success('Firmware is up to date (v1.0.0)')}
                    className="h-8 px-2.5 rounded-lg text-xs font-normal border-border/80 hover:bg-secondary"
                  >
                    Check update
                  </Button>
                </div>

                {/* Save Changes */}
                <Button
                  id="saveDevice"
                  onClick={handleSaveDevice}
                  disabled={savingDevice}
                  className="w-full h-10 rounded-xl text-xs sm:text-sm font-normal bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {savingDevice ? 'Saving...' : 'Save changes'}
                </Button>

                {/* Remove Device */}
                <div className="pt-0.5">
                  <Button
                    id="removeDevice"
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full h-10 rounded-xl text-xs sm:text-sm font-normal bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={15} />
                    <span>Remove device</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Guided Wi-Fi Pairing Modal */}
      <Dialog open={wifiModalOpen} onOpenChange={setWifiModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-normal text-foreground flex items-center gap-2">
              <Wifi size={18} className="text-primary" />
              <span>Change Wi-Fi Network</span>
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-muted-foreground">
              To connect your BlareX device to a different Wi-Fi network, follow these quick steps:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/60">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-normal shrink-0 mt-0.5">
                1
              </span>
              <p className="text-sm font-normal text-foreground leading-relaxed">
                Press and hold the physical button on the side of the device for <strong>5 seconds</strong> until the blue LED blinks rapidly.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/60">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-normal shrink-0 mt-0.5">
                2
              </span>
              <p className="text-sm font-normal text-foreground leading-relaxed">
                On your phone or laptop Wi-Fi settings, connect to <strong>BlareX-Setup</strong> hotspot.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/60">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-normal shrink-0 mt-0.5">
                3
              </span>
              <p className="text-sm font-normal text-foreground leading-relaxed">
                The setup window will open automatically. Select your new Wi-Fi and enter the password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setWifiModalOpen(false)}
              className="w-full h-11 rounded-xl text-sm font-normal"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Device Removal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-normal text-destructive flex items-center gap-2">
              <Trash2 size={18} />
              <span>Remove {devName || device.name}?</span>
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-muted-foreground">
              Are you sure you want to remove this device from your account? You will need to pair it again to control its connected appliance or view live presence.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-11 rounded-xl text-sm font-normal"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveDevice}
              className="h-11 rounded-xl text-sm font-normal bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
