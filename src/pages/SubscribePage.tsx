import { Check, X, Clock, Zap, Star, Crown, Loader2, Phone, Calendar, Sparkles } from "lucide-react";
import { type SubscriptionPlan, useSubscription } from "@/lib/subscription-context";
import { serverDate, serverIso } from "@/lib/server-time";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { requestPayment, checkRequestStatus } from "@/lib/payment-api";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";

function normalizeUgandanMsisdn(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D+/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "256" + d.slice(1);
  else if (d.length === 9 && (d.startsWith("7") || d.startsWith("3"))) d = "256" + d;
  if (d.length < 8 || d.length > 15) return null;
  return `+${d}`;
}

const PLAN_ICONS: Record<string, typeof Clock> = {
  "3days": Zap,
  "1week": Star,
  "2weeks": Crown,
  "1month": Star,
  "6month": Calendar,
  "1year": Calendar,
};

const FEATURES = [
  "Unlimited movie streaming",
  "HD quality videos",
  "Download for offline viewing",
  "No ads interruption",
  "Access to all TV series",
  "Early access to new releases",
];

const RAINBOW_CONIC =
  "conic-gradient(from 180deg at 50% 50%, #ff2e63, #ff8a3d, #ffe66d, #7cff6b, #4de0ff, #6b6bff, #d16bff, #ff2e63)";
const GOLD_CONIC =
  "conic-gradient(from 180deg at 50% 50%, #fbbf24, #f97316, #fde68a, #f59e0b, #fb923c, #fcd34d, #fbbf24)";

type Step = "plans" | "phone" | "processing" | "success" | "failed";

export default function SubscribePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refreshSubscription, normalPlans: plans, plans: allPlans } = useSubscription();
  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [phone, setPhone] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const internalRefRef = useRef<string>("");

  // Deep link: /subscribe?plan=agent (or any plan id) jumps straight to that plan's payment step.
  useEffect(() => {
    const wanted = searchParams.get("plan");
    if (!wanted || selectedPlan) return;
    const match = allPlans.find((p) => p.id === wanted || (wanted === "agent" && p.isAgent));
    if (match) {
      setSelectedPlan(match);
      setStep("phone");
    }
  }, [searchParams, allPlans, selectedPlan]);

  // Agent Zone flow gets the same amber/gold treatment as the "Become an Agent" button.
  const agentMode = !!selectedPlan?.isAgent;

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const handlePay = async () => {
    if (!selectedPlan || !user) return;
    const msisdn = normalizeUgandanMsisdn(phone);
    if (!msisdn) {
      setStatusMsg("Invalid phone number. Use a Ugandan MTN/Airtel number, e.g. 0770123456.");
      setStep("failed");
      return;
    }
    setStep("processing");
    setStatusMsg("Sending payment request...");
    try {
      const result = await requestPayment(msisdn, selectedPlan.price, `LUO CINEMA ${selectedPlan.name} Subscription`);
      const internalRef = result?.internal_reference || result?.relworx?.internal_reference;
      if (result?.success && internalRef) {
        internalRefRef.current = internalRef;
        try {
          await set(ref(database, `transactions/${internalRef}`), {
            userId: user.uid, userEmail: user.email || "",
            planId: selectedPlan.id, planName: selectedPlan.name,
            amount: selectedPlan.price, msisdn, referenceId: internalRef,
            status: "pending", timestamp: serverIso(),
          });
        } catch {}
        setStatusMsg("Payment prompt sent! Waiting for confirmation...");
        startPolling();
      } else {
        setStatusMsg(result?.message || "Failed to initiate payment.");
        setStep("failed");
      }
    } catch (err: any) {
      setStatusMsg(err?.message || "Network error. Please try again.");
      setStep("failed");
    }
  };

  const startPolling = () => {
    stopPolling();
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 90) { stopPolling(); setStatusMsg("Payment timed out."); setStep("failed"); return; }
      try {
        const res = await checkRequestStatus(internalRefRef.current);
        const status = res.request_status || res.status || res.relworx?.request_status || res.relworx?.status;
        if (status === "success") {
          stopPolling();
          try { await set(ref(database, `transactions/${internalRefRef.current}/status`), "successful"); } catch {}
          await activateSubscription();
          setStep("success");
        } else if (status === "failed" || status === "cancelled") {
          stopPolling();
          setStatusMsg(res.message || "Payment failed.");
          setStep("failed");
        } else {
          setStatusMsg(`Waiting for payment confirmation... (${attempts})`);
        }
      } catch {}
    }, 1000);
  };

  const activateSubscription = async () => {
    if (!user || !selectedPlan) return;
    const now = serverDate();
    const endDate = new Date(now.getTime() + selectedPlan.days * 24 * 60 * 60 * 1000);
    await set(ref(database, `subscriptions/${user.uid}`), {
      planId: selectedPlan.id, planName: selectedPlan.name,
      startDate: now.toISOString(), endDate: endDate.toISOString(),
      active: true, amount: selectedPlan.price, paymentRef: internalRefRef.current,
    });
    await refreshSubscription();
  };

  const backToStart = () => {
    if (agentMode) {
      setSelectedPlan(null);
      navigate("/agent");
      return;
    }
    setSelectedPlan(null);
    setStep("plans");
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${agentMode ? "agent-zone-bg" : ""}`}>
      <div
        className={`relative w-full max-w-[560px] rounded-3xl border overflow-hidden shadow-2xl ${
          agentMode
            ? "border-amber-400/60 bg-gradient-to-br from-amber-950/50 via-card to-card agent-glow"
            : "border-white/10 bg-card"
        }`}
      >
        {step === "plans" && (
          <div>
            <div className="px-6 pt-7 pb-4 text-center relative">
              <button
                onClick={() => navigate(-1)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Choose Your Plan</h2>
              <p className="text-sm text-white/60 mt-2">Get unlimited access to all movies and TV series</p>
            </div>

            <div className="px-6 pb-5 grid grid-cols-2 gap-x-6 gap-y-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${agentMode ? "text-amber-400" : "text-primary"}`} strokeWidth={3} />
                  <span className="text-white text-sm font-medium leading-tight">{f}</span>
                </div>
              ))}
            </div>

            <div className="mx-6 border-t border-white/10" />

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isPopular = plan.id === "1week";
                const Icon = PLAN_ICONS[plan.id] || Star;
                return (
                  <button
                    key={plan.id}
                    onClick={() => { setSelectedPlan(plan); setStep("phone"); }}
                    className="relative group text-center"
                  >
                    {isPopular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                        <span className="px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full uppercase tracking-wider shadow-lg shadow-primary/40">
                          Popular
                        </span>
                      </div>
                    )}
                    <div
                      className="rounded-2xl p-[2px] transition-transform duration-300 group-hover:scale-[1.03] group-active:scale-[0.98]"
                      style={{ background: agentMode ? GOLD_CONIC : RAINBOW_CONIC }}
                    >
                      <div className="rounded-[14px] bg-background py-5 px-3 flex flex-col items-center gap-2">
                        <Icon className={`w-6 h-6 ${agentMode ? "text-amber-400" : "text-primary"}`} strokeWidth={2} />
                        <span className="text-white/60 text-xs font-medium">{plan.duration}</span>
                        <div className="text-white text-lg font-black tracking-tight">
                          UGX {plan.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-6 py-4 text-center">
              <p className="text-[11px] text-white/50">
                Powered by Relworx · MTN MoMo & Airtel Money accepted
              </p>
            </div>
          </div>
        )}

        {step === "phone" && selectedPlan && (
          <div className="p-6 sm:p-8 text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                agentMode
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow-amber-500/40"
                  : "bg-primary text-primary-foreground shadow-primary/40"
              }`}
            >
              <Phone className="w-7 h-7" />
            </div>

            {agentMode && (
              <div className="inline-flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full border border-amber-400/60 bg-amber-400/10">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Agent Zone</span>
              </div>
            )}

            <h2 className="text-lg font-extrabold text-white mb-1">Enter Phone Number</h2>
            <p className="text-white/60 text-xs mb-1">
              {selectedPlan.name} —{" "}
              <span className={`font-bold text-white ${agentMode ? "text-amber-300" : ""}`}>
                UGX {selectedPlan.price.toLocaleString()}
              </span>
            </p>
            <p className="text-[10px] text-white/50 mb-5">You'll receive a payment prompt on your phone</p>
            <div className="max-w-sm mx-auto space-y-3">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0770123456"
                  className={`w-full pl-10 pr-4 py-3 bg-white/5 border-2 rounded-xl text-white text-sm font-medium focus:outline-none transition placeholder:text-white/30 ${
                    agentMode ? "border-amber-400/30 focus:border-amber-400" : "border-white/10 focus:border-primary"
                  }`}
                />
              </div>
              <button
                onClick={handlePay}
                disabled={!normalizeUgandanMsisdn(phone)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-40 ${
                  agentMode
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow-lg shadow-amber-500/30 hover:brightness-110"
                    : "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:opacity-90"
                }`}
              >
                Pay UGX {selectedPlan.price.toLocaleString()}
              </button>
              <button
                onClick={backToStart}
                className="w-full text-white/60 text-xs hover:text-white transition"
              >
                {agentMode ? "← Back to Agent Zone" : "← Choose different plan"}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="p-10 text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div
                className={`absolute inset-0 rounded-full animate-ping ${
                  agentMode ? "bg-amber-400/20" : "bg-primary/20"
                }`}
              />
              <div
                className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                  agentMode ? "bg-amber-400/10" : "bg-primary/10"
                }`}
              >
                <Loader2 className={`w-8 h-8 animate-spin ${agentMode ? "text-amber-400" : "text-primary"}`} />
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">Processing Payment</h2>
            <p className="text-white/60 text-xs">{statusMsg}</p>
          </div>
        )}

        {step === "success" && (
          <div className="p-10 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                agentMode ? "bg-amber-400/15" : "bg-green-500/15"
              }`}
            >
              <Check className={`w-6 h-6 ${agentMode ? "text-amber-400" : "text-green-500"}`} />
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">
              {agentMode ? "You're an Agent! 🎉" : "You're All Set! 🎉"}
            </h2>
            <p className="text-white/60 text-xs mb-5">
              {agentMode
                ? "Enjoy early access to everything in the Agent Zone"
                : "Enjoy unlimited streaming on LUO CINEMA"}
            </p>
            <button
              onClick={() => navigate(agentMode ? "/agent" : "/")}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition ${
                agentMode
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow-amber-500/30 hover:brightness-110"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {agentMode ? "Open Agent Zone" : "Start Watching"}
            </button>
          </div>
        )}

        {step === "failed" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">Payment Failed</h2>
            <p className="text-white/60 text-xs mb-5">{statusMsg}</p>
            <button
              onClick={() => (agentMode ? setStep("phone") : backToStart())}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition ${
                agentMode
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow-amber-500/30 hover:brightness-110"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
