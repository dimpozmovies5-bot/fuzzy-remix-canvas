import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, set, remove } from "firebase/database";
import { Users, Crown, UserX, UserCheck, Filter } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserData {
  email: string;
  displayName: string;
  lastLogin: string;
  createdAt: string;
  phoneNumber?: string;
}

interface UserSubscription {
  planId: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

type FilterType = "all" | "active" | "non-subscribed";

export default function AdminUsersPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<(UserData & { id: string })[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [filter, setFilter] = useState<FilterType>("all");
  const [activatingUser, setActivatingUser] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [usersSnap, subsSnap] = await Promise.all([
        get(dbRef(database, "users")),
        get(dbRef(database, "subscriptions")),
      ]);
      if (usersSnap.exists()) {
        const usersList = Object.entries(usersSnap.val())
          .map(([id, value]: any) => ({ id, ...value }))
          .sort((a, b) => {
            const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });
        setUsers(usersList);
      }
      if (subsSnap.exists()) {
        setSubscriptions(subsSnap.val());
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getUserSubscriptionStatus = (userId: string): "active" | "expired" | "none" => {
    const sub = subscriptions[userId];
    if (!sub) return "none";
    const endDate = new Date(sub.endDate);
    return endDate > new Date() ? "active" : "expired";
  };

  const getUserPlanName = (userId: string): string => {
    const sub = subscriptions[userId];
    if (!sub) return "";
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId);
    return plan?.name || sub.planId;
  };

  const getUserSubEnd = (userId: string): string => {
    const sub = subscriptions[userId];
    if (!sub) return "";
    const end = new Date(sub.endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const dateStr = end.toLocaleString();
    if (diffMs <= 0) return `Expired on ${dateStr}`;
    return `${dateStr} (${days}d ${hours}h ${mins}m left)`;
  };

  const handleActivateSubscription = async (userId: string) => {
    if (!selectedPlan) return;
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    const now = new Date();
    const endDate = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

    try {
      await set(dbRef(database, `subscriptions/${userId}`), {
        planId: plan.id,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        active: true,
        activatedBy: "admin",
      });
      setSuccessMsg("Subscription activated!");
      setTimeout(() => setSuccessMsg(""), 3000);
      setActivatingUser(null);
      setSelectedPlan("");
      loadData();
    } catch (error) {
      console.error("Error activating subscription:", error);
    }
  };

  const handleDeactivateSubscription = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user's subscription?")) return;
    try {
      await remove(dbRef(database, `subscriptions/${userId}`));
      setSuccessMsg("Subscription deactivated!");
      setTimeout(() => setSuccessMsg(""), 3000);
      loadData();
    } catch (error) {
      console.error("Error deactivating subscription:", error);
    }
  };

  const filteredUsers = users.filter((u) => {
    const status = getUserSubscriptionStatus(u.id);
    if (filter === "active") return status === "active";
    if (filter === "non-subscribed") return status !== "active";
    return true;
  });

  const counts = {
    all: users.length,
    active: users.filter((u) => getUserSubscriptionStatus(u.id) === "active").length,
    nonSubscribed: users.filter((u) => getUserSubscriptionStatus(u.id) !== "active").length,
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-6 h-6" /> Users Management
          </h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded-lg text-green-400 text-sm">
            {successMsg}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            All Users ({counts.all})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              filter === "active"
                ? "bg-green-600 text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Active Subscriptions ({counts.active})
          </button>
          <button
            onClick={() => setFilter("non-subscribed")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              filter === "non-subscribed"
                ? "bg-destructive text-destructive-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            Non-Subscribed ({counts.nonSubscribed})
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
          ) : (
            filteredUsers.map((u) => {
              const status = getUserSubscriptionStatus(u.id);
              const isActivating = activatingUser === u.id;

              return (
                <div
                  key={u.id}
                  className="p-3 md:p-4 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {(u.displayName || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{u.displayName || "No name"}</p>
                      <p className="text-muted-foreground text-xs truncate">{u.email}</p>
                      {u.phoneNumber && (
                        <p className="text-muted-foreground text-[10px] truncate">📱 {u.phoneNumber}</p>
                      )}
                    </div>

                    {/* Subscription Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {status === "active" ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-400/40 text-green-400 text-[10px] font-medium rounded-full">
                          <UserCheck className="w-3 h-3" />
                          {getUserPlanName(u.id)} • Expires {getUserSubEnd(u.id)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-500/10 border border-red-400/30 text-red-400 text-[10px] font-medium rounded-full">
                          No Active Sub
                        </span>
                      )}
                      <div className="text-right hidden sm:block">
                        <p className="text-muted-foreground text-[10px]">
                          Last: {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {status === "active" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivateSubscription(u.id)}
                          className="text-xs h-8"
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Deactivate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={isActivating ? "secondary" : "outline"}
                        onClick={() => {
                          setActivatingUser(isActivating ? null : u.id);
                          setSelectedPlan("");
                        }}
                        className="text-xs h-8"
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        {isActivating ? "Cancel" : "Activate"}
                      </Button>
                    </div>
                  </div>

                  {/* Activation Panel */}
                  {isActivating && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
                      <p className="text-xs text-muted-foreground">Select plan:</p>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="w-48 h-8 bg-secondary border-border text-foreground text-xs">
                          <SelectValue placeholder="Choose plan..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBSCRIPTION_PLANS.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id} className="text-xs">
                              {plan.name} — UGX {plan.price.toLocaleString()} ({plan.duration})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!selectedPlan}
                        onClick={() => handleActivateSubscription(u.id)}
                        className="h-8 text-xs bg-green-600 hover:bg-green-700 text-primary-foreground"
                      >
                        Confirm Activation
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
