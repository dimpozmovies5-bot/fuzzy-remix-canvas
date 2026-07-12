import { useState, useEffect, useRef } from "react";
import { X, Check, Loader2, Phone, Crown, Zap, Star, Clock, Calendar } from "lucide-react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/subscription-context";
import { useSubscription } from "@/lib/subscription-context";
import { useAuth } from "@/lib/auth-context";
import { requestPayment, checkRequestStatus } from "@/lib/payment-api";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "plans" | "phone" | "processing" | "success" | "failed";

const PLAN_ICONS: Record<string, typeof Clock> = {
  "12hr": Clock,
  "3days": Zap,
  "1week": Star,
  "2weeks": Crown,
  "1month": Star,
  "6month": Calendar,
};

const FEATURES = [
  "Unlimited movie streaming",
  "HD quality videos",
  "Download for offline viewing",
  "No ads interruption",
  "Access to all TV series",
  "Early access to new releases",
];

const VISIBLE_PLANS = SUBSCRIPTION_PLANS;

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [phone, setPhone] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const internalRefRef = useRef<string>("");

  useEffect(() => {
    if (!isOpen) {
      setStep("plans");
      setSelectedPlan(null);
      setPhone("");
      setStatusMsg("");
      stopPolling();
    }
  }, [isOpen]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setStep("phone");
  };

  const handlePay = async () => {
    if (!selectedPlan || !user || phone.length < 10) return;
    const msisdn = phone.startsWith("+") ? phone : phone.startsWith("0") ? `+256${phone.slice(1)}` : `+256${phone}`;
    setStep("processing");
    setStatusMsg("Sending payment request...");

    try {
      const result = await requestPayment(msisdn, selectedPlan.price, `LUO CINEMA ${selectedPlan.name} Subscription`);
      const internalRef = result?.internal_reference || result?.relworx?.internal_reference;
      if (result?.success && internalRef) {
        internalRefRef.current = internalRef;
        try {
          await set(ref(database, `transactions/${internalRef}`), {
            userId: user.uid,
            userEmail: user.email || "",
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            amount: selectedPlan.price,
            msisdn,
            referenceId: internalRef,
            status: "pending",
            timestamp: new Date().toISOString(),
          });
        } catch (e) { console.error("log tx error", e); }
        setStatusMsg("Payment prompt sent! Waiting for confirmation...");
        startPolling();
      } else {
        setStatusMsg(result?.message || result?.relworx?.message || "Failed to initiate payment. Please try again.");
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
      if (attempts > 90) {
        stopPolling();
        setStatusMsg("Payment timed out. Please try again.");
        setStep("failed");
        return;
      }
      try {
        const res = await checkRequestStatus(internalRefRef.current);
        const status = res.request_status || res.status || res.relworx?.request_status || res.relworx?.status;
        const finalize = async (finalStatus: string, message?: string) => {
          try {
            await set(ref(database, `transactions/${internalRefRef.current}/status`), finalStatus);
            if (message) await set(ref(database, `transactions/${internalRefRef.current}/message`), message);
          } catch {}
        };
        if (status === "success") {
          stopPolling();
          await finalize("successful");
          setStatusMsg("Payment confirmed! Activating subscription...");
          await activateSubscription();
          setStep("success");
        } else if (status === "failed" || status === "cancelled") {
          stopPolling();
          await finalize("failed", res.message);
          setStatusMsg(res.message || res.relworx?.message || "Payment failed or was declined.");
          setStep("failed");
        } else {
          setStatusMsg(`Waiting for payment confirmation... (${attempts})`);
        }
      } catch {
        // continue polling
      }
    }, 1000);
  };

  const activateSubscription = async () => {
    if (!user || !selectedPlan) return;
    const now = new Date();
    const endDate = new Date(now.getTime() + selectedPlan.days * 24 * 60 * 60 * 1000);
    await set(ref(database, `subscriptions/${user.uid}`), {
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      active: true,
      amount: selectedPlan.price,
      paymentRef: internalRefRef.current,
    });
    await refreshSubscription();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] max-h-[94vh] overflow-y-auto rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "plans" && <PlansView onClose={onClose} onSelect={handleSelectPlan} />}

        {step === "phone" && selectedPlan && (
          <div className="p-6 sm:p-8">
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="max-w-sm mx-auto text-center pt-2">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/40">
                <Phone className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-extrabold text-white mb-1">Enter Phone Number</h2>
              <p className="text-white/60 text-xs mb-1">
                {selectedPlan.name} — <span className="font-bold text-white">UGX {selectedPlan.price.toLocaleString()}</span>
              </p>
              <p className="text-[10px] text-white/50 mb-5">You'll receive a payment prompt on your phone</p>
              <div className="space-y-3">
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0770123456"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-primary transition placeholder:text-white/30"
                  />
                </div>
                <button
                  onClick={handlePay}
                  disabled={phone.length < 10}
                  className="w-full py-3 bg-primary hover:opacity-90 disabled:opacity-40 rounded-xl text-primary-foreground text-sm font-bold transition shadow-md shadow-primary/30"
                >
                  Pay UGX {selectedPlan.price.toLocaleString()}
                </button>
                <button onClick={() => setStep("plans")} className="w-full text-white/60 text-xs hover:text-white transition">
                  ← Choose different plan
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="p-10 text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">Processing Payment</h2>
            <p className="text-white/60 text-xs">{statusMsg}</p>
          </div>
        )}

        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">You're All Set! 🎉</h2>
            <p className="text-white/60 text-xs mb-5">Enjoy unlimited streaming on LUO CINEMA</p>
            <button onClick={onClose} className="px-8 py-2.5 bg-primary rounded-xl text-primary-foreground text-sm font-bold shadow-md hover:opacity-90 transition">
              Start Watching
            </button>
          </div>
        )}

        {step === "failed" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <X className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">Payment Failed</h2>
            <p className="text-white/60 text-xs mb-5">{statusMsg}</p>
            <button onClick={() => setStep("plans")} className="px-8 py-2.5 bg-primary rounded-xl text-primary-foreground text-sm font-bold shadow-md hover:opacity-90 transition">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlansView({ onClose, onSelect }: { onClose: () => void; onSelect: (p: SubscriptionPlan) => void }) {
  return (
    <div className="relative">
      <div className="px-6 pt-7 pb-4 text-center relative">
        <button
          onClick={onClose}
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
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={3} />
            <span className="text-white text-sm font-medium leading-tight">{f}</span>
          </div>
        ))}
      </div>

      <div className="mx-6 border-t border-white/10" />

      <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {VISIBLE_PLANS.map((plan) => {
          const isPopular = plan.id === "1week";
          const Icon = PLAN_ICONS[plan.id] || Star;
          return (
            <button
              key={plan.id}
              onClick={() => onSelect(plan)}
              className="relative group text-center"
            >
              {isPopular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                  <span className="px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full uppercase tracking-wider shadow-lg shadow-primary/40">
                    Popular
                  </span>
                </div>
              )}
              {/* Rainbow gradient border */}
              <div
                className="rounded-2xl p-[2px] transition-transform duration-300 group-hover:scale-[1.03] group-active:scale-[0.98]"
                style={{
                  background:
                    "conic-gradient(from 180deg at 50% 50%, #ff2e63, #ff8a3d, #ffe66d, #7cff6b, #4de0ff, #6b6bff, #d16bff, #ff2e63)",
                }}
              >
                <div className="rounded-[14px] bg-[#0a0a0a] py-5 px-3 flex flex-col items-center gap-2">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
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
  );
}
