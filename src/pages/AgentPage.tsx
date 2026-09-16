import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { Sparkles, ArrowLeft, Star, Lock } from "lucide-react";

interface AgentItem {
  id: string;
  type: "movie" | "series";
  title: string;
  image?: string;
  year?: number;
  rating?: number;
  episodes?: any;
}

export default function AgentPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { plans, isAgentSubscriber, loading } = useSubscription();
  const [items, setItems] = useState<AgentItem[]>([]);

  const agentPlan = plans.find((p) => p.isAgent);
  const canWatch = isAdmin || isAgentSubscriber;

  useEffect(() => {
    const store: Record<string, AgentItem[]> = {};
    const paths: Array<["movies" | "series", "movie" | "series"]> = [
      ["movies", "movie"],
      ["series", "series"],
    ];
    const unsubs = paths.map(([path, type]) =>
      onValue(dbRef(database, path), (snap) => {
        const data = snap.val() || {};
        store[path] = Object.entries(data)
          .filter(([, v]: [string, any]) => v?.isAgentOnly === true)
          .map(([id, v]: [string, any]) => ({
            id,
            type,
            title: v?.title || "Untitled",
            image: v?.image,
            year: v?.year,
            rating: v?.rating,
            episodes: v?.episodes,
          }));
        setItems([...(store.movies || []), ...(store.series || [])]);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const openEpisode = (item: AgentItem, ep: number) => {
    if (!user) { navigate("/login"); return; }
    if (!canWatch) { navigate(`/subscribe?plan=${agentPlan?.id || "agent"}&direct=1`); return; }
    navigate(`/play/${item.id}?type=series&ep=${ep}`);
  };

  const episodeList = (item: AgentItem) => {
    const raw = item.episodes;
    const arr: any[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
    return arr
      .filter(Boolean)
      .map((e: any, i: number) => ({
        number: Number(e?.episodeNumber ?? i + 1),
        title: e?.title || `Episode ${i + 1}`,
        season: Number(e?.season || 1),
        image: e?.image || item.image,
      }))
      .sort((a, b) => a.season - b.season || a.number - b.number);
  };

  const open = (item: AgentItem) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!canWatch) {
      navigate(`/subscribe?plan=${agentPlan?.id || "agent"}`);
      return;
    }
    if (item.type === "series") navigate(`/play/${item.id}?type=series&ep=1`);
    else navigate(`/play/${item.id}?type=movie`);
  };

  return (
    <div className="min-h-screen bg-background px-3 md:px-8 py-5 agent-zone-bg">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          {isAdmin && (
            <Link to="/admin/agent-content" className="text-xs font-bold text-amber-400 hover:underline">
              Manage Agent content
            </Link>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-400/60 bg-gradient-to-br from-amber-500/25 via-amber-950/30 to-background p-5 mb-6 agent-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Agent Zone
              </h1>
            </div>
            <p className="text-sm text-amber-100/80">
              New movies and series land here first. Agents watch them before everyone else.
            </p>
            {agentPlan && (
              <p className="text-sm text-amber-200 font-semibold mt-2">
                {agentPlan.name} — UGX {agentPlan.price.toLocaleString()} for {agentPlan.duration}
              </p>
            )}
            {!canWatch && !loading && (
              <button
                onClick={() => navigate(`/subscribe?plan=${agentPlan?.id || "agent"}`)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 text-sm font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 transition"
              >
                <Lock className="w-3.5 h-3.5" /> Become an Agent
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">No early-access titles right now.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {items.map((item) => (
              <button key={`${item.type}-${item.id}`} onClick={() => open(item)} className="group text-left">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-amber-400/50 shadow-md shadow-amber-900/30">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow">
                    Agent
                  </span>
                  {!canWatch && (
                    <span className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-amber-400" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {item.rating ? (
                    <>
                      <Star className="w-2.5 h-2.5 text-amber-400" /> {item.rating}
                    </>
                  ) : null}
                  {item.year ? ` · ${item.year}` : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
