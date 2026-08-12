import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Check, MapPin, Store, Phone, Pencil, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, update } from "firebase/database";
import { toast } from "sonner";

const AGENT_PLANS = new Set(["1week", "2weeks", "1month", "6month", "1year"]);
const MEMBER_PLAN = "3days";

interface Props {
  onUpgrade?: () => void;
}

interface Profile {
  businessName: string;
  location: string;
  telephone: string;
}

const EMPTY: Profile = { businessName: "", location: "", telephone: "" };

export default function SubscriberStatusBanner({ onUpgrade }: Props) {
  const { user } = useAuth();
  const { hasActiveSubscription, currentPlanId } = useSubscription();

  const [saved, setSaved] = useState<Profile>(EMPTY);
  const [draft, setDraft] = useState<Profile>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAgent = !!currentPlanId && AGENT_PLANS.has(currentPlanId);
  const isMember = currentPlanId === MEMBER_PLAN;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const snap = await get(dbRef(database, `agent_profiles/${user.uid}`));
        if (snap.exists()) {
          const d = snap.val() || {};
          const p: Profile = {
            businessName: d.businessName || "",
            location: d.location || "",
            telephone: d.telephone || "",
          };
          setSaved(p);
          setDraft(p);
          setHasRecord(!!(p.businessName || p.location || p.telephone));
          setEditing(false);
        } else {
          setEditing(true); // no record yet — open the form
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const startEdit = () => {
    setDraft(saved);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(saved);
    if (hasRecord) setEditing(false);
  };

  const submit = async () => {
    if (!user) return;
    const tel = draft.telephone.trim().slice(0, 20);
    const biz = draft.businessName.trim().slice(0, 100);
    const loc = draft.location.trim().slice(0, 100);

    if (!tel) {
      toast.error("Please add your telephone number");
      return;
    }
    if (isAgent && (!biz || !loc)) {
      toast.error("Agents must fill in business name and location");
      return;
    }

    setSubmitting(true);
    try {
      await update(dbRef(database, `agent_profiles/${user.uid}`), {
        userId: user.uid,
        email: user.email || "",
        telephone: tel,
        businessName: biz,
        location: loc,
        planId: currentPlanId || "",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const next: Profile = { businessName: biz, location: loc, telephone: tel };
      setSaved(next);
      setDraft(next);
      setHasRecord(true);
      setEditing(false);
      toast.success("Your details have been saved");
    } catch (e) {
      console.error(e);
      toast.error("Could not save. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !hasActiveSubscription || !currentPlanId) return null;
  if (loading) return null;

  const showMemberNudge = isMember;
  const isReadOnly = !editing && hasRecord;

  return (
    <div className="space-y-3">
      {showMemberNudge && (
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
      )}

      <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-background via-card to-background p-3 md:p-4 shadow-[0_6px_24px_-8px_hsl(var(--primary)/0.5)]">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.6)]">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              {isAgent ? "⭐ Agent of the Week" : "📇 Your Contact Details"}
            </p>
            <h3 className="text-sm font-bold text-foreground leading-tight mt-0.5">
              {isReadOnly
                ? isAgent ? "You're registered as an Agent" : "Contact details saved"
                : isAgent ? "Register your business" : "Add your telephone"}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              {isAgent
                ? "Please share your business name, location and telephone so we can promote you and reach you easily."
                : "We use your telephone to reach you about your subscription. Please keep it up to date."}
            </p>
          </div>
          {hasRecord && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        {isReadOnly ? (
          <div className="relative space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-foreground">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold">Tel:</span>
              <span className="truncate">{saved.telephone || "—"}</span>
            </div>
            {isAgent && (
              <>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Store className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold">Business:</span>
                  <span className="truncate">{saved.businessName || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="font-semibold">Location:</span>
                  <span className="truncate">{saved.location || "—"}</span>
                </div>
              </>
            )}
            <button
              onClick={startEdit}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/70 transition"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
        ) : (
          <>
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative sm:col-span-2">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={draft.telephone}
                  maxLength={20}
                  onChange={(e) => setDraft((d) => ({ ...d, telephone: e.target.value }))}
                  placeholder="Telephone (e.g. 0773566069)"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary transition"
                />
              </div>
              {isAgent && (
                <>
                  <div className="relative">
                    <Store className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={draft.businessName}
                      maxLength={100}
                      onChange={(e) => setDraft((d) => ({ ...d, businessName: e.target.value }))}
                      placeholder="Business Name"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={draft.location}
                      maxLength={100}
                      onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                      placeholder="Location (City / Region)"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-[0_0_16px_hsl(var(--primary)/0.5)] disabled:opacity-60"
              >
                <Check className="w-3 h-3" /> {submitting ? "Saving..." : "Save"}
              </button>
              {hasRecord && (
                <button
                  onClick={cancel}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/70 transition disabled:opacity-60"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
