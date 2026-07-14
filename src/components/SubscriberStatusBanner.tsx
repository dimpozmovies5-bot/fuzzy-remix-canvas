import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Check, MapPin, Store } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";
import { toast } from "sonner";

const AGENT_PLANS = new Set(["1week", "2weeks", "1month", "6month"]);
const MEMBER_PLAN = "3days";

interface Props {
  onUpgrade?: () => void;
}

export default function SubscriberStatusBanner({ onUpgrade }: Props) {
  const { user } = useAuth();
  const { hasActiveSubscription, currentPlanId } = useSubscription();
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAgent = !!currentPlanId && AGENT_PLANS.has(currentPlanId);
  const isMember = currentPlanId === MEMBER_PLAN;

  useEffect(() => {
    if (!user || !isAgent) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const snap = await get(dbRef(database, `agent_profiles/${user.uid}`));
        if (snap.exists()) {
          const d = snap.val();
          setBusinessName(d.businessName || "");
          setLocation(d.location || "");
          if (d.businessName || d.location) setSaved(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid, isAgent]);

  const submit = async () => {
    if (!user) return;
    const biz = businessName.trim().slice(0, 100);
    const loc = location.trim().slice(0, 100);
    if (!biz || !loc) {
      toast.error("Please fill in both business name and location");
      return;
    }
    setSubmitting(true);
    try {
      await set(dbRef(database, `agent_profiles/${user.uid}`), {
        userId: user.uid,
        email: user.email || "",
        businessName: biz,
        location: loc,
        planId: currentPlanId || "",
        submittedAt: new Date().toISOString(),
      });
      setSaved(true);
      toast.success("Your agent details have been saved");
    } catch (e) {
      console.error(e);
      toast.error("Could not save. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !hasActiveSubscription || !currentPlanId) return null;

  // Member (2 days) — upgrade nudge
  if (isMember) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-background via-card to-background p-3 md:p-4 shadow-[0_6px_24px_-8px_hsl(var(--primary)/0.5)]">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">💚 Thanks for being a member</p>
            <h3 className="text-sm font-bold text-foreground leading-tight mt-0.5">Upgrade to Agent of the Week</h3>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Move up to a <span className="font-semibold text-foreground">1 Week</span> plan or higher and qualify as an Agent of the Week — more offers, promotion of your business on LUO CINEMA.
            </p>
            <button
              onClick={onUpgrade}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition shadow-[0_0_16px_hsl(var(--primary)/0.5)]"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Agent (1 week+) — details form / confirmation banner
  if (isAgent) {
    if (loading) return null;
    return (
      <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-background via-card to-background p-3 md:p-4 shadow-[0_6px_24px_-8px_hsl(var(--primary)/0.5)]">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.6)]">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">⭐ Agent of the Week</p>
            <h3 className="text-sm font-bold text-foreground leading-tight mt-0.5">
              {saved ? "You're registered as an Agent" : "Register your business"}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              {saved
                ? "We'll feature your business on LUO CINEMA. Update your details anytime below."
                : "Fill in your business name and location so we can promote you as an Agent of the Week."}
            </p>
          </div>
          {saved && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Store className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={businessName}
              maxLength={100}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setSaved(false);
              }}
              placeholder="Business Name"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary transition"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={location}
              maxLength={100}
              onChange={(e) => {
                setLocation(e.target.value);
                setSaved(false);
              }}
              placeholder="Location (City / Region)"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary transition"
            />
          </div>
        </div>
        <button
          onClick={submit}
          disabled={submitting}
          className="mt-2 w-full sm:w-auto px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-[0_0_16px_hsl(var(--primary)/0.5)] disabled:opacity-60"
        >
          {submitting ? "Saving..." : saved ? "Update Details" : "Save Agent Details"}
        </button>
      </div>
    );
  }

  return null;
}
