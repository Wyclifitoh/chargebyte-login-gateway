import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/services/api";
import { toast } from "sonner";

interface SetPinDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/** Set or change the current user's 4-digit transaction PIN. */
const SetPinDialog = ({ open, onOpenChange }: SetPinDialogProps) => {
  const [pwd, setPwd] = useState("");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);

  const setNew = async () => {
    if (!pwd || !/^\d{4}$/.test(pin)) { toast.error("Password and 4-digit PIN required"); return; }
    setBusy(true);
    const res = await api.profile.setPin({ current_password: pwd, pin });
    setBusy(false);
    if (res.success) { toast.success("PIN set"); setPwd(""); setPin(""); onOpenChange(false); }
    else toast.error(res.error || "Failed");
  };

  const change = async () => {
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) { toast.error("Both PINs must be 4 digits"); return; }
    setBusy(true);
    const res = await api.profile.changePin({ current_pin: currentPin, new_pin: newPin });
    setBusy(false);
    if (res.success) { toast.success("PIN updated"); setCurrentPin(""); setNewPin(""); onOpenChange(false); }
    else toast.error(res.error || "Failed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Transaction PIN</DialogTitle>
          <DialogDescription>Used to authorize M-Pesa B2C / B2B / STK payments.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="set">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="set">Set new</TabsTrigger>
            <TabsTrigger value="change">Change</TabsTrigger>
          </TabsList>
          <TabsContent value="set" className="space-y-3 mt-4">
            <div><Label>Account password</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
            <div><Label>New 4-digit PIN</Label>
              <Input type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="tracking-[0.5em] text-center" />
            </div>
            <Button className="w-full" onClick={setNew} disabled={busy}>Set PIN</Button>
          </TabsContent>
          <TabsContent value="change" className="space-y-3 mt-4">
            <div><Label>Current PIN</Label>
              <Input type="password" inputMode="numeric" maxLength={4} value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="tracking-[0.5em] text-center" />
            </div>
            <div><Label>New PIN</Label>
              <Input type="password" inputMode="numeric" maxLength={4} value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="tracking-[0.5em] text-center" />
            </div>
            <Button className="w-full" onClick={change} disabled={busy}>Change PIN</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SetPinDialog;
