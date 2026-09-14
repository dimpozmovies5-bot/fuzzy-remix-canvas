import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, onValue, update } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Item {
  id: string;
  path: "movies" | "series";
  title: string;
  image?: string;
  year?: number;
  category?: string;
  isAgentOnly?: boolean;
}

export default function AdminAgentContentPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "agent" | "normal">("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const paths: Item["path"][] = ["movies", "series"];
    const store: Record<string, Item[]> = {};
    const unsubs = paths.map((path) =>
      onValue(dbRef(database, path), (snap) => {
        const data = snap.val() || {};
        store[path] = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          path,
          title: v?.title || "Untitled",
          image: v?.image,
          year: v?.year,
          category: v?.category,
          isAgentOnly: v?.isAgentOnly === true,
        }));
        setItems([...(store.movies || []), ...(store.series || [])]);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [isAdmin]);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(""), 2500);
  };

  const setAgentOnly = async (item: Item, value: boolean) => {
    try {
      await update(dbRef(database, `${item.path}/${item.id}`), { isAgentOnly: value });
      flash(value ? `"${item.title}" moved to the Agent plan.` : `"${item.title}" released to all plans.`);
    } catch (e) {
      console.error(e);
      flash("Could not update. Please try again.");
    }
  };

  const visible = items
    .filter((i) => (filter === "all" ? true : filter === "agent" ? i.isAgentOnly : !i.isAgentOnly))
    .filter((i) => i.title.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.isAgentOnly) - Number(a.isAgentOnly) || a.title.localeCompare(b.title));

  if (loading || !isAdmin) return null;

  const agentCount = items.filter((i) => i.isAgentOnly).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Agent Zone Content</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-primary/15 border border-primary/40 rounded text-primary text-sm">{message}</div>
        )}

        <p className="text-muted-foreground text-sm mb-4">
          Titles in the Agent Zone are only visible to Agent-plan subscribers. Release a title to move it to the normal
          plans, where everyone with an active subscription can watch it. Currently in the Agent Zone: {agentCount}.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles..."
            className="bg-secondary border-border max-w-xs"
          />
          {(["all", "agent", "normal"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f === "all" ? "All" : f === "agent" ? "Agent only" : "Normal plans"}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {visible.map((item) => (
            <Card key={`${item.path}-${item.id}`} className="flex items-center gap-3 p-3 bg-card border-border">
              <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{item.title}</p>
                <p className="text-muted-foreground text-xs">
                  {item.path === "movies" ? "Movie" : "Series"}
                  {item.category ? ` · ${item.category}` : ""}
                  {item.year ? ` · ${item.year}` : ""}
                </p>
              </div>
              {item.isAgentOnly ? (
                <>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-primary/20 text-primary">Agent</span>
                  <Button size="sm" className="h-7 text-xs" onClick={() => setAgentOnly(item, false)}>
                    Release to all
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAgentOnly(item, true)}>
                  Move to Agent
                </Button>
              )}
            </Card>
          ))}
          {visible.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">Nothing to show.</p>}
        </div>
      </div>
    </div>
  );
}
