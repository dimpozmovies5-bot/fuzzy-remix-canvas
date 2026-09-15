import React, { createContext, useContext, useEffect, useState } from "react";
import { database } from "./firebase";
import { ref, get, set, onValue } from "firebase/database";
import { useAuth } from "./auth-context";
import { serverNow } from "./server-time";

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  days: number;
  /** Agent plans unlock the Agent Zone (early-access uploads) */
  isAgent?: boolean;
  order?: number;
}

/** Fallback plans used when nothing has been configured in the admin dashboard yet. */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "agent", name: "Agent Early Access", duration: "4 Days", price: 10000, days: 4, isAgent: true, order: 0 },
  { id: "3days", name: "2 Days Pass", duration: "2 Days", price: 5000, days: 2, order: 1 },
  { id: "1week", name: "1 Week Pass", duration: "1 Week", price: 12000, days: 7, order: 2 },
  { id: "2weeks", name: "2 Weeks Pass", duration: "2 Weeks", price: 17000, days: 14, order: 3 },
  { id: "1month", name: "1 Month Pass", duration: "1 Month", price: 30000, days: 30, order: 4 },
  { id: "6month", name: "6 Months Pass", duration: "6 Months", price: 150000, days: 180, order: 5 },
  { id: "1year", name: "1 Year Pass", duration: "1 Year", price: 600000, days: 365, order: 6 },
];

export const PLANS_DB_PATH = "subscription_plans";

export function plansFromSnapshot(value: any): SubscriptionPlan[] {
  if (!value) return SUBSCRIPTION_PLANS;
  const entries = Object.entries(value as Record<string, any>);
  if (entries.length === 0) return SUBSCRIPTION_PLANS;
  return entries
    .map(([id, p]) => ({
      id,
      name: p?.name ?? id,
      duration: p?.duration ?? "",
      price: Number(p?.price) || 0,
      days: Number(p?.days) || 0,
      isAgent: p?.isAgent === true,
      order: typeof p?.order === "number" ? p.order : 99,
    }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.price - b.price);
}

interface Subscription {
  planId: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  currentPlanId: string | null;
  plans: SubscriptionPlan[];
  /** Plans shown in the normal subscription list (Agent plans excluded) */
  normalPlans: SubscriptionPlan[];
  /** true when the signed-in user's active plan unlocks the Agent Zone */
  isAgentSubscriber: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);

  // Plans are managed from the admin dashboard and kept live for everyone.
  useEffect(() => {
    const unsub = onValue(ref(database, PLANS_DB_PATH), (snap) => {
      setPlans(plansFromSnapshot(snap.val()));
    });
    return () => unsub();
  }, []);

  const checkSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const subscriptionRef = ref(database, `subscriptions/${user.uid}`);
      const snapshot = await get(subscriptionRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const endDate = new Date(data.endDate).getTime();
        const now = serverNow();

        if (endDate > now) {
          setSubscription({ ...data, active: true });
        } else {
          await set(subscriptionRef, { ...data, active: false });
          setSubscription({ ...data, active: false });
        }
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user?.uid]);

  const hasActiveSubscription = (() => {
    if (!subscription) return false;
    if (!subscription.active) return false;
    const endDate = new Date(subscription.endDate).getTime();
    return endDate > serverNow();
  })();

  const currentPlanId = subscription?.planId || null;
  const isAgentSubscriber =
    hasActiveSubscription && !!plans.find((p) => p.id === currentPlanId)?.isAgent;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        hasActiveSubscription,
        loading,
        refreshSubscription: checkSubscription,
        currentPlanId,
        plans,
        normalPlans: plans.filter((p) => !p.isAgent),
        isAgentSubscriber,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
