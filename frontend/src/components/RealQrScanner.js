import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { RefreshCw, Upload, AlertCircle, CheckCircle2, SwitchCamera } from 'lucide-react';
import { Button } from './ui/button';

export default function RealQrScanner({ onScan, scannedValue, onReset }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'requesting' | 'scanning' | 'error' | 'unsupported'
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [availableDevices, setAvailableDevices] = useState([]);
  const fileInputRef = useRef(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Helper to extract device ID from raw string or URL or JSON
  const extractDeviceId = useCallback((rawData) => {
    if (!rawData) return '';
    const trimmed = rawData.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.device_id) return parsed.device_id;
      if (parsed.id) return parsed.id;
      if (parsed.deviceId) return parsed.deviceId;
    } catch {
      // Not JSON
    }

    // Check if it's a URL with parameter (e.g. ?id=BX-SENSE-123 or ?device_id=BX-SENSE-123)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        const paramId = url.searchParams.get('id') || url.searchParams.get('device_id') || url.searchParams.get('deviceId');
        if (paramId) return paramId;
      } catch {
        // Invalid URL
      }
    }

    return trimmed;
  }, []);

  // Scan frame processing loop
  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const detectedId = extractDeviceId(code.data);
            if (detectedId) {
              stopCamera();
              onScan(detectedId, code.data);
              return;
            }
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  }, [extractDeviceId, onScan, stopCamera]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported');
      setErrorMessage('Camera access is not supported by this browser environment or requires HTTPS/localhost.');
      return;
    }

    try {
      setCameraState('requesting');
      
      // Enumerate devices to check if device switching is possible
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch {
        // Ignore enumerate error
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraState('scanning');
        animationFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser or upload an image.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device detected on this system.');
      } else {
        setErrorMessage(err.message || 'Unable to start camera stream.');
      }
    }
  }, [facingMode, scanLoop, stopCamera]);

  // Handle uploaded QR image file
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const detectedId = extractDeviceId(code.data);
          stopCamera();
          onScan(detectedId, code.data);
        } else {
          setErrorMessage('Could not locate a clear QR code in this image. Please try another photo.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Toggle camera direction
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (!scannedValue) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, scannedValue]);

  return (
    <div className="space-y-3">
      {/* Scanner Viewport or Result Container */}
      <div className="relative w-full aspect-[4/3] max-h-[260px] rounded-2xl overflow-hidden bg-secondary/80 border border-border flex items-center justify-center">
        {/* Hidden offscreen canvas for decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraState === 'scanning' ? 'block' : 'hidden'}`}
          muted
          playsInline
        />

        {/* Live scanning HUD overlay */}
        {cameraState === 'scanning' && !scannedValue && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Viewfinder Target Box */}
            <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-2xl border-2 border-primary/80 relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary" />

              {/* Animated laser scanning line */}
              <div className="absolute inset-x-0 h-0.5 bg-primary/90 shadow-[0_0_10px_rgba(59,130,246,0.9)] animate-pulse top-1/2 -translate-y-1/2" />
            </div>

            <span className="absolute bottom-3 text-xs font-normal text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
              Align QR code within the frame
            </span>
          </div>
        )}

        {/* Requesting State */}
        {cameraState === 'requesting' && (
          <div className="text-center p-4 space-y-2 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-xs font-normal">Requesting camera access...</p>
          </div>
        )}

        {/* Error or Unsupported State */}
        {(cameraState === 'error' || cameraState === 'unsupported') && !scannedValue && (
          <div className="p-4 text-center max-w-xs space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-xs font-normal text-muted-foreground leading-relaxed">
              {errorMessage || 'Camera is currently unavailable.'}
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="text-xs font-normal h-8 rounded-lg"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Retry Camera
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-normal h-8 rounded-lg"
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Upload QR
              </Button>
            </div>
          </div>
        )}

        {/* QR Detected State */}
        {scannedValue && (
          <div className="p-4 text-center max-w-xs space-y-2 bg-card/95 border border-emerald-500/30 rounded-xl shadow-lg m-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
              QR Code Successfully Read
            </div>
            <div className="text-sm font-mono font-normal text-foreground break-all bg-secondary/60 px-3 py-1.5 rounded-lg">
              {scannedValue}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onReset) onReset();
                startCamera();
              }}
              className="text-xs font-normal h-7 px-2.5 rounded-lg mt-1"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Scan Another
            </Button>
          </div>
        )}
      </div>

      {/* Action Controls & Fallback Buttons */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs font-normal text-muted-foreground hover:text-foreground px-2"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            Upload QR Image
          </Button>

          {availableDevices.length > 1 && cameraState === 'scanning' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleFacingMode}
              className="h-8 text-xs font-normal text-muted-foreground hover:text-foreground px-2"
            >
              <SwitchCamera className="w-3.5 h-3.5 mr-1" />
              Flip Camera
            </Button>
          )}
        </div>

        {/* Live camera status indicator */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className={`w-2 h-2 rounded-full ${
              cameraState === 'scanning'
                ? 'bg-emerald-500 animate-pulse'
                : cameraState === 'requesting'
                ? 'bg-amber-500'
                : 'bg-muted-foreground/40'
            }`}
          />
          <span className="text-xs font-normal capitalize">
            {cameraState === 'scanning' ? 'Camera Live' : cameraState}
          </span>
        </div>
      </div>
    </div>
  );
}
