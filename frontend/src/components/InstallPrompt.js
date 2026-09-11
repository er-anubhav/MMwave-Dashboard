import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share2 } from "lucide-react";
import { Button } from "./ui/button";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if user dismissed it recently in localStorage (e.g., within 24h)
    const dismissedAt = localStorage.getItem("blarexsense_install_dismissed");
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 12 * 60 * 60 * 1000) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isAppleDevice) {
      setIsIOS(true);
      // Automatically prompt after 2.5 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge / Desktop PWA: listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser's default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      // Automatically show install banner
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Trigger native browser install prompt
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("blarexsense_install_dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white border border-border/90 shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Install BlareXSense App
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install on your device for instant radar alerts and full-screen access.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="bg-secondary/40 border border-border/60 rounded-xl p-2.5 text-xs text-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary shrink-0" />
            <span>
              Tap <strong className="font-semibold">Share</strong> in Safari, then select{" "}
              <strong className="font-semibold">&apos;Add to Home Screen&apos;</strong>.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs font-normal text-muted-foreground h-8 px-3"
            >
              Maybe later
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="text-xs font-normal bg-primary text-white hover:bg-primary/90 h-8 px-3.5 gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Install Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
