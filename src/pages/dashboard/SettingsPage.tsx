import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2, Save } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    default_clockin_radius_m: "100",
    chargenow_base_url: "",
    chargenow_push_url: "",
    chargenow_webhook_secret: "",
  });

  useEffect(() => {
    (async () => {
      const res = await api.settings.getAll();
      if (res.success && res.data) {
        setValues((v) => ({ ...v, ...(res.data as Record<string, string>) }));
      }
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | number> = {
        default_clockin_radius_m: parseInt(values.default_clockin_radius_m, 10) || 100,
      };
      if (isSuper) {
        payload.chargenow_base_url = values.chargenow_base_url;
        payload.chargenow_push_url = values.chargenow_push_url;
        payload.chargenow_webhook_secret = values.chargenow_webhook_secret;
      }
      const res = await api.settings.update(payload);
      if (res.success) toast.success("Settings saved");
      else toast.error(res.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!isSuper) {
    return (
      <div>
        <PageHeader title="Settings" description="System configuration" icon={Settings2} />
        <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Settings are managed by Super Admin.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System-wide configuration" icon={Settings2} />

      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold">GPS Clock-in</h3>
          <p className="text-xs text-muted-foreground">
            Default radius (meters) around a station where staff can clock in. Overridable per station.
          </p>
        </div>
        <div className="max-w-xs">
          <Label htmlFor="radius">Default allowed radius (m)</Label>
          <Input
            id="radius"
            type="number"
            min={10}
            max={5000}
            value={values.default_clockin_radius_m}
            onChange={(e) => set("default_clockin_radius_m", e.target.value)}
            disabled={loading}
          />
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold">ChargeNow Manufacturer API</h3>
          <p className="text-xs text-muted-foreground">
            Endpoint and shared secret used by the cabinet integration & webhook.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="base">Base URL</Label>
            <Input
              id="base"
              value={values.chargenow_base_url}
              onChange={(e) => set("chargenow_base_url", e.target.value)}
              placeholder="https://developer.chargenow.top/cdb-open-api/v1"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="push">Webhook push URL</Label>
            <Input
              id="push"
              value={values.chargenow_push_url}
              onChange={(e) => set("chargenow_push_url", e.target.value)}
              placeholder="https://dash.chargebyte.io/api/webhooks/chargenow"
              disabled={loading}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="sec">Webhook shared secret</Label>
            <Input
              id="sec"
              type="password"
              value={values.chargenow_webhook_secret}
              onChange={(e) => set("chargenow_webhook_secret", e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || loading}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
