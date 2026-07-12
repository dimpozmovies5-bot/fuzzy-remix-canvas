import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { database } from "@/lib/firebase";
import { ref as dbRef, set } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  planId?: string | null;
}

export default function AgentProfileModal({ open, onClose, planId }: Props) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!user) return;
    const trimmedName = fullName.trim().slice(0, 100);
    const trimmedLoc = location.trim().slice(0, 100);
    const trimmedBiz = businessName.trim().slice(0, 100);
    if (!trimmedName && !trimmedLoc && !trimmedBiz) {
      toast.error("Please fill at least one field or press Cancel");
      return;
    }
    setSubmitting(true);
    try {
      await set(dbRef(database, `agent_profiles/${user.uid}`), {
        userId: user.uid,
        email: user.email || "",
        fullName: trimmedName,
        location: trimmedLoc,
        businessName: trimmedBiz,
        planId: planId || "",
        submittedAt: new Date().toISOString(),
      });
      toast.success("Thanks! Your details have been saved.");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Could not save details. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md rounded-2xl border border-primary/40 bg-gradient-to-br from-background via-card to-background p-6 shadow-[0_20px_60px_-10px_hsl(var(--primary)/0.6)]"
        style={{ animation: "wa-pop 0.35s ease-out, wa-bounce 0.9s ease-in-out 0.35s" }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-background/60 hover:bg-background flex items-center justify-center transition"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.6)]">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Agent Profile</p>
            <h3 className="text-base font-bold text-foreground">Help us promote you</h3>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-snug mb-4">
          Optional — share your details so we can advertise your business as an Agent of the Week.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={fullName}
              maxLength={100}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary transition"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Location</label>
            <input
              type="text"
              value={location}
              maxLength={100}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary transition"
              placeholder="City / Region"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">Business Name</label>
            <input
              type="text"
              value={businessName}
              maxLength={100}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary transition"
              placeholder="Your business (optional)"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70 transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition shadow-[0_0_20px_hsl(var(--primary)/0.5)] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
