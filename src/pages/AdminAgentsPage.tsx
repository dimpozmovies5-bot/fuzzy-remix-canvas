import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, MapPin, Briefcase, Mail, User as UserIcon } from "lucide-react";
import AdminPasswordGate from "@/components/AdminPasswordGate";

interface AgentProfile {
  userId: string;
  email: string;
  fullName: string;
  location: string;
  businessName: string;
  planId: string;
  submittedAt: string;
}

export default function AdminAgentsPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const r = dbRef(database, "agent_profiles");
    const unsub = onValue(r, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as AgentProfile[];
        setAgents(list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
      } else {
        setAgents([]);
      }
    });
    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const filtered = agents.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.fullName?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.businessName?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminPasswordGate>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-foreground">Agent Profiles</h1>
                <p className="text-muted-foreground text-xs">Agent of the Week submitted details</p>
              </div>
            </div>
            <Link to="/admin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Admin</span>
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, business, location or email..."
              className="flex-1 px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm focus:outline-none focus:border-primary transition"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} agents</span>
          </div>

          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground text-sm">
              No agent profile submissions yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((a) => (
                <Card key={a.userId} className="p-4 bg-card border-border/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground truncate">
                      {a.fullName || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="truncate">{a.businessName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{a.location || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{a.email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                      {a.planId || "plan"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminPasswordGate>
  );
}
