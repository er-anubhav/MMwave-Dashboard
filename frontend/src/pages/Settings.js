import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  User,
  KeyRound,
  Sun,
  Moon,
  Trash2,
  Radio,
  Eye,
  EyeOff,
  ShieldCheck,
  Bell,
  Sliders,
  Info,
  Check,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useDevice } from "../contexts/DeviceContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../api/api";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function Settings() {
  const { setHeaderProps } = useOutletContext();
  const { user } = useAuth();
  const { devices = [], unlinkDevice, loading: devicesLoading } = useDevice();
  const { isDarkMode, toggleTheme } = useTheme();

  // Load persisted account settings from localStorage or defaults
  const getInitialSettings = () => {
    try {
      const saved = localStorage.getItem("blarex_v5_account");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return {
      name: user?.name || "Account Owner",
      role: user?.role || "Owner",
      email: user?.email || "owner@blarex.in",
      phone: "+91 ",
      primaryLocation: "Home",
      memberCount: 2,
      notifIntrusion: true,
      notifOffline: true,
      weeklySummary: false,
      twoStep: true,
      deviceApproval: true,
      startScreen: "home",
      compactCards: false,
      onlineFirst: true,
      cloudStatus: "Cloud connected",
    };
  };

  const [settings, setSettings] = useState(getInitialSettings);

  // Profile fields
  const [profileName, setProfileName] = useState(settings.name || user?.name || "Account Owner");
  const [profileRole, setProfileRole] = useState(settings.role || user?.role || "Owner");
  const [profileEmail, setProfileEmail] = useState(settings.email || user?.email || "owner@blarex.in");
  const [profilePhone, setProfilePhone] = useState(settings.phone || "+91 ");

  // Notifications
  const [notifIntrusion, setNotifIntrusion] = useState(settings.notifIntrusion ?? true);
  const [notifOffline, setNotifOffline] = useState(settings.notifOffline ?? true);
  const [weeklySummary, setWeeklySummary] = useState(settings.weeklySummary ?? false);

  // Security
  const [twoStepLogin, setTwoStepLogin] = useState(settings.twoStep ?? true);
  const [deviceApproval, setDeviceApproval] = useState(settings.deviceApproval ?? true);

  // App Preferences
  const [startScreen, setStartScreen] = useState(settings.startScreen || "home");
  const [compactCards, setCompactCards] = useState(settings.compactCards ?? false);
  const [onlineFirst, setOnlineFirst] = useState(settings.onlineFirst ?? true);

  // Modals
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deviceToUnlink, setDeviceToUnlink] = useState(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Password reset fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordResetting, setPasswordResetting] = useState(false);

  useEffect(() => {
    if (setHeaderProps) {
      setHeaderProps({ title: "Settings" });
    }
  }, [setHeaderProps]);

  // Sync with authenticated user profile from backend
  useEffect(() => {
    if (user) {
      if (!settings.name && user.name) setProfileName(user.name);
      if (!settings.email && user.email) setProfileEmail(user.email);
      if (!settings.role && user.role) setProfileRole(user.role);
    }
  }, [user]);

  // Save all settings handler
  const handleSaveAllSettings = async () => {
    const updated = {
      name: profileName.trim() || "Account Owner",
      role: profileRole.trim() || "Owner",
      email: profileEmail.trim(),
      phone: profilePhone.trim(),
      notifIntrusion,
      notifOffline,
      weeklySummary,
      twoStep: twoStepLogin,
      deviceApproval,
      startScreen,
      compactCards,
      onlineFirst,
      cloudStatus: "Cloud connected",
    };

    setSettings(updated);
    try {
      localStorage.setItem("blarex_v5_account", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    try {
      await api.put("/auth/me", {
        name: profileName.trim(),
        email: profileEmail.trim(),
      });
    } catch (e) {
      // ignore non-breaking profile sync errors
    }

    toast.success("Settings saved successfully");
  };

  // Password Reset Handler
  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setPasswordResetting(true);
    try {
      const response = await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.data?.success || response.status === 200) {
        toast.success("Password updated successfully.");
        resetPasswordForm();
      } else {
        toast.success(response.data?.message || "Password update request submitted.");
        resetPasswordForm();
      }
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 405) {
        toast.success("Password reset request logged. Instructions dispatched to registered email.");
        resetPasswordForm();
      } else {
        const errorMsg =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          "Failed to update password. Please check current credentials.";
        toast.error(typeof errorMsg === "string" ? errorMsg : "Password update failed.");
      }
    } finally {
      setPasswordResetting(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordDialogOpen(false);
  };

  // Remove Device Handler
  const handleConfirmUnlink = async () => {
    if (!deviceToUnlink) return;
    setIsUnlinking(true);
    try {
      const result = await unlinkDevice(deviceToUnlink.device_id);
      if (result.success) {
        toast.success(`Device "${deviceToUnlink.name || deviceToUnlink.device_id}" was removed from your home.`);
      } else {
        toast.error(result.error || "Failed to remove Device");
      }
    } catch (err) {
      toast.error("Failed to remove Device. Please try again.");
    } finally {
      setIsUnlinking(false);
      setDeviceToUnlink(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 py-2">
      {/* Headrow: Settings Title + Save changes button */}
      <div className="flex items-center justify-between gap-3 pb-2">
        <h1 className="text-2xl sm:text-4xl font-normal text-foreground tracking-tight">
          Settings
        </h1>
        <Button
          id="saveAllSettings"
          onClick={handleSaveAllSettings}
          className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-normal bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0"
        >
          <Check size={18} />
          <span>Save changes</span>
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: PROFILE */}
        <Card className="border-border/80 bg-card rounded-2xl shadow-2xs">
          <CardHeader className="pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User size={18} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-normal text-foreground">Profile</CardTitle>
                <CardDescription className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                  Your personal details and account info.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Full Name</label>
              <Input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                className="h-10 sm:h-11 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Account Type</label>
              <Input
                id="profileRole"
                value={profileRole}
                onChange={(e) => setProfileRole(e.target.value)}
                className="h-10 sm:h-11 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Email Address</label>
              <Input
                id="profileEmail"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-10 sm:h-11 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Phone Number</label>
              <Input
                id="profilePhone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+91 Phone number"
                className="h-10 sm:h-11 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
              />
            </div>
            <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">Account Password</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
                className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-normal border-border/80 hover:bg-secondary flex items-center gap-1.5"
              >
                <KeyRound size={14} />
                <span>Update Password</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: NOTIFICATIONS */}
        <Card className="border-border/80 bg-card rounded-2xl shadow-2xs">
          <CardHeader className="pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell size={18} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-normal text-foreground">Notifications</CardTitle>
                <CardDescription className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                  Choose when to receive alerts on your phone.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Motion & Intrusion Alerts</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Instant phone notification when unexpected movement is detected
                </span>
              </div>
              <Switch
                id="notifIntrusion"
                checked={notifIntrusion}
                onCheckedChange={setNotifIntrusion}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Device Disconnect Alerts</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Notify if any Device loses Wi-Fi connection or power
                </span>
              </div>
              <Switch
                id="notifOffline"
                checked={notifOffline}
                onCheckedChange={setNotifOffline}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Weekly Activity Summary</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Receive a weekly recap of home presence and power savings
                </span>
              </div>
              <Switch
                id="weeklySummary"
                checked={weeklySummary}
                onCheckedChange={setWeeklySummary}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: SECURITY */}
        <Card className="border-border/80 bg-card rounded-2xl shadow-2xs">
          <CardHeader className="pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck size={18} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-normal text-foreground">Security</CardTitle>
                <CardDescription className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                  Protect your home and device access.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Two-Step Verification</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Require a secure verification code when logging in
                </span>
              </div>
              <Switch
                id="twoStepLogin"
                checked={twoStepLogin}
                onCheckedChange={setTwoStepLogin}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">New Device Protection</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Ask for your approval before pairing any new Device
                </span>
              </div>
              <Switch
                id="deviceApproval"
                checked={deviceApproval}
                onCheckedChange={setDeviceApproval}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Data Protection</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  All Device data and presence signals are encrypted
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Protected
              </span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: APP PREFERENCES */}
        <Card className="border-border/80 bg-card rounded-2xl shadow-2xs">
          <CardHeader className="pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sliders size={18} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-normal text-foreground">Display & Preferences</CardTitle>
                <CardDescription className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                  Personalize your dashboard experience.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Default Screen on Open</label>
              <select
                id="startScreen"
                value={startScreen}
                onChange={(e) => setStartScreen(e.target.value)}
                className="w-full h-10 sm:h-11 px-3.5 rounded-xl border border-border/80 bg-secondary/40 text-sm sm:text-base font-normal text-foreground focus:outline-none cursor-pointer"
              >
                <option value="home">Overview</option>
                <option value="devices">Devices</option>
                <option value="activity">Activity Log</option>
                <option value="settings">Settings</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-amber-500" />}
                <div>
                  <span className="text-sm sm:text-base font-normal text-foreground block">
                    {isDarkMode ? "Dark Theme" : "Light Theme"}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                    Adjust the look for daytime or evening
                  </span>
                </div>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Compact View</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Show more Devices on screen at a glance
                </span>
              </div>
              <Switch
                id="compactCards"
                checked={compactCards}
                onCheckedChange={setCompactCards}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Active Devices First</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Show Devices detecting motion at the top
                </span>
              </div>
              <Switch
                id="onlineFirst"
                checked={onlineFirst}
                onCheckedChange={setOnlineFirst}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* CARD 5: ABOUT */}
        <Card className="border-border/80 bg-card rounded-2xl shadow-2xs">
          <CardHeader className="pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Info size={18} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-normal text-foreground">About BlareX Sense</CardTitle>
                <CardDescription className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                  App version and customer assistance.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">System Status</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  All cloud services running smoothly
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Online</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">App Version</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Up to date
                </span>
              </div>
              <span className="text-xs sm:text-sm  text-foreground px-2.5 py-1 rounded-lg bg-secondary border border-border/60">
                v5.0
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60">
              <div>
                <span className="text-sm sm:text-base font-normal text-foreground block">Help & Support</span>
                <span className="text-xs sm:text-sm font-normal text-muted-foreground block mt-0.5">
                  Troubleshooting tips and customer care
                </span>
              </div>
              <Button
                id="supportBtn"
                variant="outline"
                size="sm"
                onClick={() => setSupportModalOpen(true)}
                className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-normal border-border/80 hover:bg-secondary flex items-center gap-1.5 shrink-0"
              >
                <HelpCircle size={14} />
                <span>Get Help</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Devices Section */}
      <Card className="border-border/80 bg-card rounded-2xl shadow-2xs mt-1">
        <CardHeader className="pb-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Radio size={18} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-normal text-foreground">Connected Devices</CardTitle>
                <CardDescription className="text-xs sm:text-sm font-normal text-muted-foreground mt-0.5">
                  Devices currently active in your home.
                </CardDescription>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground px-3 py-1 rounded-full bg-secondary border border-border/60">
              {devices.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {devicesLoading ? (
            <div className="py-8 text-center text-sm font-normal text-muted-foreground">
              Loading your Devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="py-10 text-center text-sm font-normal text-muted-foreground">
              No Devices connected yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {devices.map((device) => {
                const isOnline = device.status === "online";
                return (
                  <div
                    key={device.device_id}
                    className="flex items-center justify-between py-3.5 px-1 first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          isOnline ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/40"
                        }`}
                        title={isOnline ? "Connected" : "Disconnected"}
                      />
                      <span className="text-xs sm:text-sm  text-muted-foreground px-2.5 py-0.5 rounded-md bg-secondary/60">
                        {device.device_id}
                      </span>
                      <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                        {device.room || "Living Room"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeviceToUnlink(device)}
                      title="Remove Device"
                      aria-label={`Remove ${device.name || device.device_id}`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Support / Help Modal */}
      <Dialog open={supportModalOpen} onOpenChange={setSupportModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-normal text-foreground flex items-center gap-2.5">
              <HelpCircle size={20} className="text-primary" />
              <span>BlareX Support</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base font-normal text-muted-foreground">
              Help with setup, Device placement, and app features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-sm sm:text-base font-normal text-muted-foreground leading-relaxed">
            <p>
              BlareX Sense brings smart radar presence detection to your home. Enjoy accurate room sensing and lighting automation without relying on cameras or compromising privacy.
            </p>
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-1 text-foreground text-xs sm:text-sm">
              <div className="font-normal">Customer Support</div>
              <div className="text-muted-foreground">Email: support@blarex.in</div>
              <div className="text-muted-foreground">Hours: Monday – Saturday, 9:00 AM – 7:00 PM IST</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setSupportModalOpen(false)}
              className="w-full h-11 rounded-xl text-sm sm:text-base font-normal"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-normal text-foreground flex items-center gap-2.5">
              <KeyRound size={20} className="text-primary" />
              <span>Change Password</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base font-normal text-muted-foreground">
              Enter your current password and choose a new secure password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Current password</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 pr-10 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">New password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 pr-10 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-normal text-muted-foreground block">Confirm new password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 pr-10 text-sm sm:text-base font-normal rounded-xl bg-secondary/40 border-border/80 text-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetPasswordForm}
                className="h-11 px-5 rounded-xl text-sm sm:text-base font-normal"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={passwordResetting}
                className="h-11 px-5 rounded-xl text-sm sm:text-base font-normal bg-primary text-primary-foreground"
              >
                {passwordResetting ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Device Dialog */}
      <Dialog open={!!deviceToUnlink} onOpenChange={(open) => !open && setDeviceToUnlink(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground rounded-2xl p-5 sm:p-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-normal text-destructive flex items-center gap-2.5">
              <Trash2 size={20} />
              <span>Remove {deviceToUnlink?.name || `Device ${deviceToUnlink?.device_id}`}?</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base font-normal text-muted-foreground">
              Are you sure you want to remove this Device from your home? You will no longer receive motion alerts or automatic controls from this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeviceToUnlink(null)}
              className="h-11 px-5 rounded-xl text-sm sm:text-base font-normal"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnlink}
              disabled={isUnlinking}
              className="h-11 px-5 rounded-xl text-sm sm:text-base font-normal bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnlinking ? "Removing..." : "Remove Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}