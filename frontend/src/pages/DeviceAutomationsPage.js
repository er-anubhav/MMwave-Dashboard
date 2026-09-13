import React, { useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useDevice } from "../contexts/DeviceContext";
import DeviceAutomations from "../components/DeviceAutomations";
import { Button } from "../components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function DeviceAutomationsPage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const { devices = [] } = useDevice();
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

  useEffect(() => {
    setHeaderProps({
      title: `${device.name} - Automations`
    });
  }, [device.name, setHeaderProps]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Breadcrumb / Back Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/devices/${device.device_id}`)}
            className="h-8 px-2.5 text-xs font-normal border-border gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Device
          </Button>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            /
          </span>

          <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[200px]">
            {device.name}
          </span>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            /
          </span>

          <span className="text-xs font-medium text-foreground">
            Automations
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs font-normal text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => navigate(`/devices/${device.device_id}`)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Device Dashboard
          </Button>
        </div>
      </div>

      {/* Device Automations component */}
      <DeviceAutomations device={device} />
    </div>
  );
}
