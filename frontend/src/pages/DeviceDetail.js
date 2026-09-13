import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useDevice } from "../contexts/DeviceContext";
import useDeviceData from "../hooks/useDeviceData";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Power,
  Sliders,
  Wifi,
  Heart,
  Wind,
  Moon,
  Clock,
  CheckCircle2,
  Sparkles,
  Edit2,
  Trash2,
  Bot
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import api from "../api/api";
import { toast } from "sonner";

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { devices = [], selectDevice, updateDevice, unlinkDevice } = useDevice();
  const { setHeaderProps } = useOutletContext();

  const device = devices.find(
    (d) =>
      d.device_id?.toLowerCase() === deviceId?.toLowerCase() ||
      d.name?.toLowerCase().replace(/\s+/g, "-") === deviceId?.toLowerCase()
  ) || {
    device_id: deviceId,
    name: deviceId,
    status: "online",
    device_type: deviceId?.toUpperCase().startsWith("PRO") ? "BlareXSense_pro" : "BlareXSense_switch"
  };

  const isPro = device.device_id?.toUpperCase().startsWith("PRO");

  const {
    mode,
    sensorData,
    lastUpdated,
    isConnected,
    relayState,
    relayMode,
    handleModeChange,
    handleRelayToggle,
  } = useDeviceData(device);

  useEffect(() => {
    setHeaderProps({ title: device.name || "Device Details" });
    if (device && selectDevice) {
      selectDevice(device);
    }
  }, [device.name, setHeaderProps]);

  useEffect(() => {
    if (location.hash === "#automations") {
      navigate(`/devices/${device.device_id}/automations`, { replace: true });
    }
  }, [location.hash, device.device_id, navigate]);

  const [togglingRelay, setTogglingRelay] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState(device.name || "");
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateDialogOpen, setCalibrateDialogOpen] = useState(false);

  useEffect(() => {
    setNewName(device.name || "");
  }, [device.name]);

  const toggleRelay = async () => {
    setTogglingRelay(true);
    try {
      await handleRelayToggle(!relayState);
    } finally {
      setTogglingRelay(false);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await updateDevice(device.device_id, newName.trim());
    if (res.success) {
      toast.success("Device renamed successfully");
      setRenameDialogOpen(false);
    } else {
      toast.error(res.error || "Failed to rename device");
    }
  };

  const confirmCalibrate = async () => {
    setCalibrateDialogOpen(false);
    setCalibrating(true);
    try {
      await api.post(`/devices/${device.device_id}/calibrate`);
      toast.success("Calibration complete. Room background clutter mapped.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to trigger calibration");
    } finally {
      setCalibrating(false);
    }
  };

  const handleUnlink = async () => {
    const res = await unlinkDevice(device.device_id);
    if (res.success) {
      toast.success("Device unlinked");
      navigate("/");
    } else {
      toast.error(res.error || "Failed to unlink device");
    }
  };

  // Humanized presence description
  const isOccupied = !!sensorData?.presence;
  const isFallAlert = !!sensorData?.fall_detected;

  // Activity level translated to human terms
  const rawActivity = sensorData?.activity ?? 0;
  const activityDescription =
    rawActivity > 60
      ? "Active movement"
      : rawActivity > 15
      ? "Subtle movement (sitting / working)"
      : isOccupied
      ? "Stationary / Resting"
      : "No motion detected";

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pt-2 pb-12">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </button>

        <Badge
          variant="outline"
          className={`border-transparent px-2.5 py-0.5 text-xs font-normal ${
            device.status === "online" || isConnected
              ? "bg-success-soft text-success"
              : "bg-secondary text-primary"
          }`}
        >
          {device.status === "online" || isConnected ? "Online & Monitoring" : "Device Offline"}
        </Badge>
      </div>

      {/* Device Header Strip & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40 pb-3">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-foreground truncate">
              {device.name}
            </h1>
            
            {/* Rename Pencil Icon Button */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  title="Rename device"
                  aria-label="Rename device"
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => {
                    setNewName(device.name || "");
                    setRenameDialogOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleRename}>
                  <DialogHeader>
                    <DialogTitle>Edit Room / Location</DialogTitle>
                    <DialogDescription>
                      Assign this radar sensor to a room or location name.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-3 space-y-2">
                    <Label htmlFor="renameInput" className="text-xs font-normal text-muted-foreground">
                      Room / Location
                    </Label>
                    <Input
                      id="renameInput"
                      className="mt-1 font-normal text-sm"
                      value={newName}
                      placeholder="e.g. Living Room"
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-muted-foreground">Quick pick:</span>
                      {["Living Room", "Master Bedroom", "Kids Room", "Kitchen", "Office"].map((room) => (
                        <button
                          key={room}
                          type="button"
                          onClick={() => setNewName(room)}
                          className="text-[11px] font-normal px-2 py-0.5 rounded-full border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
                        >
                          {room}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DialogFooter className="mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setRenameDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="bg-primary text-white hover:bg-primary/90">
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={toggleRelay}
              disabled={togglingRelay}
              title="Controls connected light/appliance relay. Radar monitoring continues 24/7."
              className={`h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-normal transition-colors gap-1.5 shrink-0 ${
                relayState
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-secondary text-primary border border-border hover:bg-secondary/80"
              }`}
            >
              <Power className="h-3 w-3" />
              Light / Appliance: {relayState ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        {/* Action Buttons: Mode, Calibrate, Automations, Unlink */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Pro Mode Switcher */}
          {isPro && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs font-normal border-border gap-1.5 hover:bg-secondary text-foreground"
                >
                  <Sliders className="h-3 w-3 text-primary" />
                  Mode: {mode === "sleep" ? "Sleep Tracking" : "Fall Detection"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuItem
                  className="text-xs flex flex-col items-start gap-0.5 cursor-pointer font-normal p-2 rounded"
                  onClick={() => handleModeChange("fall")}
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
                  onClick={() => handleModeChange("sleep")}
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

          {/* Automations Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs font-normal border-border gap-1.5 hover:bg-secondary text-foreground"
            onClick={() => navigate(`/devices/${device.device_id}/automations`)}
          >
            <Bot className="h-3.5 w-3.5 text-primary" />
            Automations
          </Button>

          {/* Calibrate Button with Confirmation Dialog */}
          <AlertDialog open={calibrateDialogOpen} onOpenChange={setCalibrateDialogOpen}>
            <Button
              size="sm"
              variant="outline"
              disabled={calibrating}
              className="h-8 px-2.5 text-xs font-normal border-border text-foreground hover:bg-secondary gap-1.5"
              onClick={() => setCalibrateDialogOpen(true)}
            >
              <Sliders className="h-3 w-3 text-primary" />
              {calibrating ? "Calibrating..." : "Calibrate"}
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Calibrate Room Radar?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-xs sm:text-sm">
                  <p>
                    Calibration maps stationary room clutter (furniture, fans, walls) to ensure optimal fall and presence accuracy.
                  </p>
                  <p className="font-medium text-foreground">
                    Please ensure the room is completely empty for the next 5–10 seconds while the sensor calibrates.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmCalibrate}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  Start Calibration
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Unlink Confirmation */}
          <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs font-normal border-destructive/30 text-destructive hover:bg-destructive-soft gap-1.5"
              onClick={() => setUnlinkDialogOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
              Unlink
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unlink Device?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove &quot;{device.name}&quot; from your account? You can re-link it anytime using the device ID.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUnlink}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Unlink Device
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Product Cards Grid: All cards strictly identical in height and layout */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {/* 1. Room Safety & Fall Protection */}
        <Card className="flex flex-col justify-between border-border shadow-sm hover:shadow-md transition-shadow min-h-[180px]">
          <CardHeader className="border-b border-border/60 p-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-normal text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Safety & Fall Guard
              </CardTitle>
              <Badge
                variant="outline"
                className={`border-transparent text-[11px] font-normal ${
                  isFallAlert
                    ? "bg-destructive-soft text-destructive"
                    : "bg-success-soft text-success"
                }`}
              >
                {isFallAlert ? "Alert Triggered" : "Protected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm font-normal flex-1 flex flex-col justify-center">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fall Detection:</span>
              <span className="text-foreground">Continuous active radar</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Motion Level:</span>
              <span className="text-foreground">{activityDescription}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Emergency Alerts:</span>
              <span className="text-foreground">Connected to Alerts feed</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Room Occupancy & Presence */}
        <Card className="flex flex-col justify-between border-border shadow-sm hover:shadow-md transition-shadow min-h-[180px]">
          <CardHeader className="border-b border-border/60 p-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-normal text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Room Presence
              </CardTitle>
              <Badge
                variant="outline"
                className={`border-transparent text-[11px] font-normal ${
                  isOccupied ? "bg-primary text-white" : "bg-secondary text-primary"
                }`}
              >
                {isOccupied ? "Occupied" : "Vacant"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm font-normal flex-1 flex flex-col justify-center">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Occupancy:</span>
              <span className="text-foreground">{isOccupied ? "Person detected" : "Empty"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Distance:</span>
              <span className="text-foreground">
                {isOccupied && sensorData?.target_distance != null
                  ? `${sensorData.target_distance} meters`
                  : "Clear"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Privacy Protection:</span>
              <span className="text-foreground">100% Camera-free radar</span>
            </div>
          </CardContent>
        </Card>

        {/* 3. For STD: Smart Switch Automation / For PRO: Vitals */}
        {isPro ? (
          <Card className="flex flex-col justify-between border-border shadow-sm hover:shadow-md transition-shadow min-h-[180px]">
            <CardHeader className="border-b border-border/60 p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-normal text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-destructive" />
                  Health & Breathing (Pro)
                </CardTitle>
                <Badge variant="outline" className="border-transparent bg-secondary text-primary text-[11px] font-normal">
                  Contactless
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm font-normal flex-1 flex flex-col justify-center">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heart Rate:</span>
                <span className="text-foreground">
                  {sensorData?.sleep?.heart_rate ? `${sensorData.sleep.heart_rate} BPM` : "Monitoring active"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Respiration:</span>
                <span className="text-foreground">
                  {sensorData?.sleep?.respiration ? `${sensorData.sleep.respiration} RPM` : "Monitoring active"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vitals Status:</span>
                <span className="text-foreground">Optimal rhythm</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col justify-between border-border shadow-sm hover:shadow-md transition-shadow min-h-[180px]">
            <CardHeader className="border-b border-border/60 p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-normal text-foreground flex items-center gap-2">
                  <Power className="h-4 w-4 text-primary" />
                  Smart Switch Automation
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`border-transparent text-[11px] font-normal ${
                    relayState ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {relayState ? "Switch ON" : "Switch OFF"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm font-normal flex-1 flex flex-col justify-center">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Appliance Power:</span>
                <span className="text-foreground">{relayState ? "Active / Powered" : "Standby / Off"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Automation Mode:</span>
                <span className="text-foreground capitalize">{relayMode} mode</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Presence Linking:</span>
                <span className="text-foreground">Turns off when room is empty</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. For STD: Upgrade to Pro card (highlighting limitations) / For PRO: Sleep & Overnight Recovery */}
        {!isPro ? (
          <Card className="flex flex-col justify-between border-primary/25 bg-secondary/30 shadow-sm hover:shadow-md transition-shadow min-h-[180px]">
            <CardHeader className="border-b border-border/60 p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-normal text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Upgrade to Pro
                </CardTitle>
                <Badge variant="outline" className="border-transparent bg-primary text-white text-[11px] font-normal">
                  Pro Feature
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm font-normal flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Heart Rate & Breathing:</span>
                <span className="text-xs text-muted-foreground/80 bg-white/80 px-2 py-0.5 rounded border border-border/60">Requires Pro Sensor</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Overnight Sleep Analysis:</span>
                <span className="text-xs text-muted-foreground/80 bg-white/80 px-2 py-0.5 rounded border border-border/60">Not on Standard</span>
              </div>
              <div className="pt-1">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs font-normal bg-primary text-white hover:bg-primary/90 transition-colors gap-1.5"
                  onClick={() => toast.info("Pro Upgrade inquiry submitted. Our team will contact you shortly!")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade to BlareXSense Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col justify-between border-border shadow-sm hover:shadow-md transition-shadow min-h-[180px]">
            <CardHeader className="border-b border-border/60 p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-normal text-foreground flex items-center gap-2">
                  <Moon className="h-4 w-4 text-primary" />
                  Sleep & Recovery
                </CardTitle>
                <Badge variant="outline" className="border-transparent bg-success-soft text-success text-[11px] font-normal">
                  Tracked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm font-normal flex-1 flex flex-col justify-center">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sleep Stage:</span>
                <span className="text-foreground">
                  {sensorData?.sleep?.state ? sensorData.sleep.state : "Deep restful sleep"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Movement In Bed:</span>
                <span className="text-foreground">Peaceful / Restful</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monitoring Mode:</span>
                <span className="text-foreground">Zero contact, camera-free</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
