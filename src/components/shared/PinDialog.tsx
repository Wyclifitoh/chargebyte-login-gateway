import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Called with the entered PIN. Should throw on failure. */
  onConfirm: (pin: string) => Promise<void>;
}

/** Reusable 4-digit PIN gate for sensitive M-Pesa operations. */
const PinDialog = ({ open, onOpenChange, title, description, onConfirm }: PinDialogProps) => {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be 4 digits");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(pin);
      setPin("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authorization failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPin(""); setError(null); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="pin">Transaction PIN</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            autoFocus
            className="tracking-[0.5em] text-center text-lg"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleConfirm} disabled={submitting || pin.length !== 4}>
            {submitting ? "Authorizing…" : "Authorize"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinDialog;
