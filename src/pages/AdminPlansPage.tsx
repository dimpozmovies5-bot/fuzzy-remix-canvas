import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, set, remove } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUBSCRIPTION_PLANS,
  PLANS_DB_PATH,
  plansFromSnapshot,
  type SubscriptionPlan,
} from "@/lib/subscription-context";

type Draft = SubscriptionPlan & { _new?: boolean };

export default function AdminPlansPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const snap = await get(dbRef(database, PLANS_DB_PATH));
      setDrafts(plansFromSnapshot(snap.val()));
    })();
  }, [isAdmin]);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(""), 3000);
  };

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addPlan = () => {
    const id = `plan${Date.now()}`;
    setDrafts((d) => [
      ...d,
      { id, name: "New Plan", duration: "1 Day", price: 5000, days: 1, isAgent: false, order: d.length, _new: true },
    ]);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      drafts.forEach((p, i) => {
        payload[p.id] = {
          name: p.name,
          duration: p.duration,
          price: Number(p.price) || 0,
          days: Number(p.days) || 0,
          isAgent: p.isAgent === true,
          order: typeof p.order === "number" ? p.order : i,
        };
      });
      await set(dbRef(database, PLANS_DB_PATH), payload);
      flash("Plans saved. Changes are live for all users.");
    } catch (e) {
      console.error(e);
      flash("Could not save plans. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    setDrafts((d) => d.filter((p) => p.id !== id));
    try {
      await remove(dbRef(database, `${PLANS_DB_PATH}/${id}`));
    } catch {}
    flash("Plan deleted.");
  };

  const restoreDefaults = () => {
    if (!confirm("Reset the plan list to the built-in defaults?")) return;
    setDrafts(SUBSCRIPTION_PLANS.map((p) => ({ ...p })));
    flash("Defaults loaded — press Save to publish them.");
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-primary/15 border border-primary/40 rounded text-primary text-sm">{message}</div>
        )}

        <p className="text-muted-foreground text-sm mb-4">
          Change the name, price, duration or number of days for any plan. Mark a plan as{" "}
          <span className="text-foreground font-semibold">Agent</span> to give its subscribers access to the Agent Zone,
          where new movies and series appear first.
        </p>

        <div className="space-y-3">
          {drafts.map((p) => (
            <Card key={p.id} className="p-4 bg-card border-border">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Plan name</label>
                  <Input value={p.name} onChange={(e) => updateDraft(p.id, { name: e.target.value })} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Duration label</label>
                  <Input value={p.duration} onChange={(e) => updateDraft(p.id, { duration: e.target.value })} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Price (UGX)</label>
                  <Input type="number" min="0" value={p.price} onChange={(e) => updateDraft(p.id, { price: Number(e.target.value) })} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Days of access</label>
                  <Input type="number" min="1" value={p.days} onChange={(e) => updateDraft(p.id, { days: Number(e.target.value) })} className="bg-secondary border-border" />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input type="checkbox" checked={p.isAgent === true} onChange={(e) => updateDraft(p.id, { isAgent: e.target.checked })} />
                    Agent plan
                  </label>
                  <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => deletePlan(p.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">ID: {p.id}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button onClick={saveAll} disabled={saving} className="bg-primary text-primary-foreground">
            {saving ? "Saving..." : "Save Plans"}
          </Button>
          <Button variant="outline" onClick={addPlan}>Add Plan</Button>
          <Button variant="outline" onClick={restoreDefaults}>Load Defaults</Button>
        </div>
      </div>
    </div>
  );
}
