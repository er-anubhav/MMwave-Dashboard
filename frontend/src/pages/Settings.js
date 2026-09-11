import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Section from "../components/ui/Section";
import PageHeader from "../components/ui/PageHeader";
import {
  Download,
  DatabaseBackup,
  DatabaseZap,
  Stethoscope,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from "../api/api";
import { toast } from 'sonner';

export default function Settings() {
  const { setHeaderProps } = useOutletContext();
  useEffect(() => {
    setHeaderProps({ title: "Settings" });
  }, [setHeaderProps]);

  // System & Diagnostics states
  const [diagnostics, setDiagnostics] = useState(null);
  const [retention, setRetention] = useState({ sensor_record_limit: 1000, log_limit: 1000 });

  // Load settings data
  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const [diagnosticsResponse, retentionResponse] = await Promise.all([
          api.get(`/diagnostics`),
          api.get(`/settings/retention`)
        ]);
        setDiagnostics(diagnosticsResponse.data);
        setRetention(retentionResponse.data);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to load settings data');
      }
    };
    loadSettingsData();
  }, []);

  const downloadBackup = async (includeSecrets = false) => {
    try {
      const response = await api.get(`/backup/export`, {
        params: { include_secrets: includeSecrets }
      });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = includeSecrets ? 'mmwave-dashboard-backup-with-secrets.json' : 'mmwave-dashboard-backup.json';
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to export backup');
    }
  };

  const saveRetention = async () => {
    try {
      const response = await api.put(`/settings/retention`, {
        sensor_record_limit: Number(retention.sensor_record_limit) || 1000,
        log_limit: Number(retention.log_limit) || 1000
      });
      setRetention(response.data);
      toast.success('Retention settings saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save retention settings');
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        title="Settings"
        description="System retention, backups, and local diagnostics."
      />

      {/* ── SYSTEM & BACKUP ── */}
      <Section
        title="System & Backup"
        description="Manage database retention, backups, and local server diagnostics."
      >
        <div className="rounded-lg border border-border bg-card shadow-surface-sm">
          {/* Backup */}
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <DatabaseBackup className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">Backup</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Export dashboard data from this local backend.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadBackup(false)}>
                  <Download className="h-3.5 w-3.5" />
                  Export Backup
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadBackup(true)}>
                  Export With Keys
                </Button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Retention */}
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                <DatabaseZap className="h-4 w-4 text-primary" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">Data Retention</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Limits for stored sensor events and application logs.
                </p>
              </div>
            </div>
            <div className="mt-4 grid max-w-xl grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sensorRecordLimit" className="text-xs text-muted-foreground">Sensor Records</Label>
                <Input
                  id="sensorRecordLimit"
                  type="number"
                  min="100"
                  max="100000"
                  value={retention.sensor_record_limit}
                  onChange={(e) => setRetention({ ...retention, sensor_record_limit: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logLimit" className="text-xs text-muted-foreground">Logs</Label>
                <Input
                  id="logLimit"
                  type="number"
                  min="100"
                  max="100000"
                  value={retention.log_limit}
                  onChange={(e) => setRetention({ ...retention, log_limit: e.target.value })}
                />
              </div>
            </div>
            <Button variant="secondary" className="mt-4" onClick={saveRetention}>Save Retention</Button>
          </div>

          <div className="h-px bg-border" />

          {/* Diagnostics */}
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success-soft">
                <Stethoscope className="h-4 w-4 text-success" />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">Diagnostics</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Quick local backend status.</p>
              </div>
            </div>
            <div className="mt-4 grid max-w-xl grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Devices</p>
                <p className="mt-0.5 font-numeric text-sm font-semibold text-foreground">
                  {diagnostics?.devices?.online || 0} online / {diagnostics?.devices?.total || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Database size</p>
                <p className="mt-0.5 font-numeric text-sm font-semibold text-foreground">
                  {diagnostics?.database?.database_size_mb ?? 0} MB
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduler</p>
                <p className="mt-0.5 font-numeric text-sm font-semibold text-foreground">
                  {diagnostics?.scheduler?.interval_seconds || 30}s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recent errors</p>
                <p
                  className={cn(
                    "mt-0.5 font-numeric text-sm font-semibold",
                    (diagnostics?.logs?.recent_errors?.length || 0) > 0 ? "text-destructive" : "text-success"
                  )}
                >
                  {diagnostics?.logs?.recent_errors?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}