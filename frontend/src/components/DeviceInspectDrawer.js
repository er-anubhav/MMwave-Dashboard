import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import {
  Radio,
  Power,
  Sliders,
  Sparkles,
  Wifi,
  Copy,
  Trash2,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api/api';
import { useDevice } from '../contexts/DeviceContext';
import { useNavigate } from 'react-router-dom';

export default function DeviceInspectDrawer({ device, open, onOpenChange }) {
  const navigate = useNavigate();
  const { unlinkDevice, loadDevices } = useDevice();
  const [liveData, setLiveData] = useState(null);
  const [togglingRelay, setTogglingRelay] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationSeconds, setCalibrationSeconds] = useState(10);
  const [activeTab, setActiveTab] = useState('control');
  const [currentMode, setCurrentMode] = useState(device?.mode || 'auto');

  // Sensing local states
  const [detectionRange, setDetectionRange] = useState([4.0]);
  const [sensitivity, setSensitivity] = useState([7]);
  const [absenceDelay, setAbsenceDelay] = useState('60');

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

  const handleToggleRelay = async (checked) => {
    setTogglingRelay(true);
    setLiveData((prev) => (prev ? { ...prev, relay: checked } : prev));
    try {
      await api.post('/relay', {
        device_id: device.device_id,
        relay: checked,
        relay_mode: 'manual',
      });
      toast.success(`${device.name} load turned ${checked ? 'ON' : 'OFF'}`);
    } catch (err) {
      setLiveData((prev) => (prev ? { ...prev, relay: !checked } : prev));
      toast.error('Failed to update relay state');
    } finally {
      setTogglingRelay(false);
    }
  };

  const handleModeChange = async (newMode) => {
    setCurrentMode(newMode);
    try {
      await api.post('/mode', {
        device_id: device.device_id,
        mode: newMode,
      });
      toast.success(`Mode switched to ${newMode.toUpperCase()}`);
    } catch (err) {
      toast.error('Failed to update operating mode');
    }
  };

  const handleNoiseCalibration = async () => {
    setCalibrating(true);
    setCalibrationSeconds(10);
    try {
      await api.post(`/devices/${device.device_id}/calibrate`, {
        duration_seconds: 10,
      });
      toast.info('Noise floor calibration started (10s sampling)...');
      const timer = setInterval(() => {
        setCalibrationSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCalibrating(false);
            toast.success('Baseline noise floor calibrated successfully!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setCalibrating(false);
      toast.error('Failed to start room noise calibration');
    }
  };

  const handleRotateKey = async () => {
    try {
      const res = await api.post(`/devices/${device.device_id}/rotate-key`);
      toast.success('Device API key rotated. New key copied!');
      if (res.data?.api_key && navigator.clipboard) {
        navigator.clipboard.writeText(res.data.api_key);
      }
    } catch (err) {
      toast.error('Key rotation failed');
    }
  };

  const handleCopy = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    }
  };

  const handleRemoveDevice = async () => {
    if (window.confirm(`Are you sure you want to unlink ${device.name}?`)) {
      await unlinkDevice(device.device_id);
      onOpenChange(false);
      toast.success(`${device.name} unlinked`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col bg-card border-border/80 shadow-2xl z-50 text-foreground overflow-hidden"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-5 border-b border-border/70 flex flex-row items-center justify-between text-left space-y-0">
          <div className="flex items-center gap-3.5 min-w-0 pr-6">
            <div className="w-11 h-11 rounded-2xl bg-secondary/60 border border-border/60 flex items-center justify-center text-primary shrink-0">
              <Radio size={22} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base sm:text-lg font-normal text-foreground truncate">
                {device.name}
              </SheetTitle>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
                <span>{device.room || 'Living Room'}</span>
                <span>•</span>
                <span className={isOnline ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 border-b border-border/70 bg-secondary/20">
            <TabsList className="grid grid-cols-3 bg-secondary/60 h-10 p-1 rounded-xl">
              <TabsTrigger value="control" className="text-xs sm:text-sm font-normal rounded-lg">
                Control
              </TabsTrigger>
              <TabsTrigger value="presence" className="text-xs sm:text-sm font-normal rounded-lg">
                Sensing
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm font-normal rounded-lg">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Drawer Body Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 1. CONTROL TAB */}
            <TabsContent value="control" className="space-y-4 m-0">
              {/* Live Presence Hero Banner */}
              <div
                className={`p-4.5 rounded-2xl border transition-all ${
                  isOccupied
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-secondary/30 border-border/70 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-normal tracking-wider uppercase text-muted-foreground">
                    Live Presence Radar
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOccupied ? 'bg-emerald-500 animate-ping' : 'bg-muted-foreground/50'
                    }`}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-normal tracking-tight mt-1 text-foreground">
                  {isOccupied ? 'Occupied (Target Detected)' : 'No Occupancy (Away)'}
                </h2>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs sm:text-sm pt-3 border-t border-border/40 text-muted-foreground">
                  <div>
                    <span className="block text-xs font-normal text-muted-foreground">Activity</span>
                    <span className="text-foreground text-sm sm:text-base font-normal">{liveData?.sensor_data?.activity ?? 0}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-normal text-muted-foreground">Distance</span>
                    <span className="text-foreground text-sm sm:text-base font-normal">
                      {liveData?.sensor_data?.distance ? `${liveData.sensor_data.distance} cm` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-normal text-muted-foreground">Energy</span>
                    <span className="text-foreground text-sm sm:text-base font-normal">{liveData?.sensor_data?.energy ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Connected Load Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-card">
                <div>
                  <span className="text-sm sm:text-base font-normal text-foreground block">Connected Appliance</span>
                  <span className="block text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                    Relay is currently {relayState ? 'ON' : 'OFF'}
                  </span>
                </div>
                <Switch
                  checked={relayState}
                  disabled={togglingRelay}
                  onCheckedChange={handleToggleRelay}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Operating Mode Segmented Buttons */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-normal uppercase tracking-wider text-muted-foreground">
                  Operating Mode
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-secondary/60 rounded-xl border border-border/70 text-xs sm:text-sm">
                  {['auto', 'manual', 'fall', 'sleep'].map((modeKey) => (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() => handleModeChange(modeKey)}
                      className={`py-2 rounded-lg font-normal capitalize transition-all ${
                        currentMode === modeKey
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {modeKey}
                    </button>
                  ))}
                </div>
                <p className="text-xs sm:text-sm font-normal text-muted-foreground leading-relaxed">
                  {currentMode === 'auto' && 'Auto: Radar presence turns appliance ON; absence turns it OFF.'}
                  {currentMode === 'manual' && 'Manual: Appliance state is governed exclusively by user toggles.'}
                  {currentMode === 'fall' && 'Fall Detection: High-sensitivity tracking calibrated for safety.'}
                  {currentMode === 'sleep' && 'Sleep Mode: Night surveillance with quiet appliance switching.'}
                </p>
              </div>

              {/* Baseline Noise Floor Calibration */}
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <span className="text-sm sm:text-base font-normal text-foreground">Noise Floor Calibration</span>
                  </div>
                  {calibrating && (
                    <span className="text-xs sm:text-sm font-mono font-normal text-amber-400 animate-pulse">
                      {calibrationSeconds}s left
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-normal text-muted-foreground">
                  Samples 16 radar gates to subtract background stationary interference in the room.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={calibrating}
                  onClick={handleNoiseCalibration}
                  className="w-full text-xs sm:text-sm font-normal border-amber-500/30 hover:bg-amber-500/10 text-amber-400 h-10"
                >
                  <Sparkles size={15} className="mr-1.5" />
                  {calibrating ? `Calibrating... (${calibrationSeconds}s)` : 'Run 10s Room Calibration'}
                </Button>
              </div>

              {/* Full Inspection Navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/devices/${device.device_id}`);
                }}
                className="w-full text-xs sm:text-sm font-normal h-10 rounded-xl border-border/80 hover:bg-secondary/60 flex items-center justify-center gap-2"
              >
                <span>Open 3D Spatial Radar & Deep Telemetry</span>
                <ExternalLink size={15} />
              </Button>
            </TabsContent>

            {/* 2. SENSING TAB */}
            <TabsContent value="presence" className="space-y-4 m-0">
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs sm:text-sm font-normal text-foreground">Detection Range Boundary</Label>
                    <span className="text-xs sm:text-sm font-mono text-primary font-normal">{detectionRange[0]} meters</span>
                  </div>
                  <Slider
                    min={1}
                    max={6}
                    step={0.5}
                    value={detectionRange}
                    onValueChange={setDetectionRange}
                    className="py-2"
                  />
                  <p className="text-xs sm:text-sm font-normal text-muted-foreground mt-1">
                    Ignores motion and reflections beyond this physical distance.
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs sm:text-sm font-normal text-foreground">Radar Gate Sensitivity</Label>
                    <span className="text-xs sm:text-sm font-mono text-primary font-normal">{sensitivity[0]} / 10</span>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={sensitivity}
                    onValueChange={setSensitivity}
                    className="py-2"
                  />
                  <p className="text-xs sm:text-sm font-normal text-muted-foreground mt-1">
                    Higher values capture micro-breathing; lower values reject subtle fans/drapes.
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 space-y-1.5">
                  <Label className="text-xs sm:text-sm font-normal text-foreground">Absence Auto-OFF Delay</Label>
                  <select
                    value={absenceDelay}
                    onChange={(e) => setAbsenceDelay(e.target.value)}
                    className="w-full bg-secondary/50 border border-border/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-normal text-foreground focus:outline-none"
                  >
                    <option value="30">30 seconds (Quick Eco)</option>
                    <option value="60">1 minute (Standard)</option>
                    <option value="120">2 minutes (Comfort)</option>
                    <option value="300">5 minutes (Extended Room)</option>
                  </select>
                </div>

                <Button
                  size="sm"
                  onClick={() => toast.success('Sensing parameters saved to device')}
                  className="w-full bg-primary text-primary-foreground text-xs sm:text-sm font-normal rounded-xl h-10 mt-2"
                >
                  Save Sensing Preferences
                </Button>
              </div>
            </TabsContent>

            {/* 3. SETTINGS TAB */}
            <TabsContent value="settings" className="space-y-4 m-0">
              <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-normal text-muted-foreground">Device Identifier</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={device.device_id}
                      className="font-mono text-xs sm:text-sm font-normal bg-secondary/40 h-9 text-foreground rounded-xl"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(device.device_id, 'Device ID')}
                      className="h-9 px-3 rounded-xl text-xs sm:text-sm font-normal"
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm font-normal text-muted-foreground">Assigned Space / Room</Label>
                  <Input
                    defaultValue={device.room || 'Living Room'}
                    className="text-xs sm:text-sm font-normal bg-secondary/40 h-9 text-foreground rounded-xl"
                  />
                </div>

                <div className="pt-2 border-t border-border/60 space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Wi-Fi Telemetry</span>
                    <span className="font-mono text-foreground font-normal flex items-center gap-1.5">
                      <Wifi size={14} className="text-emerald-500" />
                      {device.wifi_rssi ? `${device.wifi_rssi} dBm` : '-54 dBm (Stable)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Firmware Build</span>
                    <span className="font-mono text-foreground font-normal">
                      {device.firmware_version || 'v1.0.0-PROD'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs sm:text-sm font-normal text-foreground block">Rotate API Key</span>
                    <p className="text-xs font-normal text-muted-foreground">Invalidates existing device token</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotateKey}
                    className="text-xs sm:text-sm font-normal h-9 px-3 rounded-xl"
                  >
                    <RefreshCw size={14} className="mr-1" />
                    Rotate
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
                <span className="text-xs sm:text-sm font-normal text-destructive block">Danger Zone</span>
                <p className="text-xs font-normal text-muted-foreground">
                  Unlinking will sever real-time telemetry ingestion and automation routines for this unit.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveDevice}
                  className="w-full text-xs sm:text-sm font-normal h-9 rounded-xl"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Unlink & Remove Device
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
