import { useEffect, useState } from "react";
import { Phone, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, update } from "firebase/database";
import { toast } from "sonner";
import Logo from "@/components/Logo";

export function normalizePhone(raw: string): string | null {
  let d = (raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  d = d.replace(/\D/g, "");
  if (!d) return null;
  // Ugandan local formats -> full international
  if (d.length === 10 && d.startsWith("0")) d = "256" + d.slice(1);
  else if (d.length === 9 && d.startsWith("7")) d = "256" + d;
  if (d.length < 8 || d.length > 15) return null;
  return "+" + d;
}

export default function PhoneNumberGate() {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecked(true);
      setNeedsPhone(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await get(dbRef(database, `users/${user.uid}/phoneNumber`));
        const existing = snap.exists() ? String(snap.val() || "").trim() : "";
        if (cancelled) return;
        setValue(existing);
        setNeedsPhone(!normalizePhone(existing));
      } catch (e) {
        console.error("Phone check failed:", e);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, loading]);

  const save = async () => {
    if (!user) return;
    const normalized = normalizePhone(value);
    if (!normalized) {
      toast.error("Enter a valid phone number (e.g. 0773566069)");
      return;
    }
    setSaving(true);
    try {
      await update(dbRef(database, `users/${user.uid}`), {
        phoneNumber: normalized,
        email: user.email || "",
        phoneUpdatedAt: new Date().toISOString(),
      });
      setValue(normalized);
      setNeedsPhone(false);
      toast.success("Phone number saved");
    } catch (e) {
      console.error(e);
      toast.error("Could not save your number. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !checked || !needsPhone) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-sm w-full p-[3px] rounded-3xl animate-gradient-border">
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl w-full p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-5">
            <Logo size="lg" />
            <h2 className="text-base font-bold text-foreground mt-3">Add your phone number</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Required so we can reach you about your subscription and payments.
            </p>
          </div>

          <div className="relative mb-3">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              inputMode="tel"
              value={value}
              maxLength={20}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="e.g. 0773566069"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary/60 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary transition"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save & Continue"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            You can edit this later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
