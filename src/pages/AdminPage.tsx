import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, onValue } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Shield, Film, Tv, Music, Image, Users, BarChart3, Wallet, Activity, ArrowLeft, TrendingUp, Navigation, Globe, Home, Star, Search, Eye, Sparkles } from "lucide-react";
import AdminPasswordGate from "@/components/AdminPasswordGate";
import AdminChangePassword from "@/components/AdminChangePassword";

interface NavActivity {
  userId: string;
  userEmail: string;
  section: string;
  timestamp: string;
}

interface UserActivity {
  userId: string;
  userEmail?: string;
  userName?: string;
  type: string;
  action: string;
  target?: string;
  path?: string;
  details?: Record<string, any>;
  timestamp: string;
}

const sectionIcons: Record<string, typeof Home> = {
  home: Home, movies: Film, series: Tv, music: Music,
  "top-rated": Star, search: Search, animation: Film,
};

const sectionColors: Record<string, string> = {
  home: "hsl(200, 80%, 50%)", movies: "hsl(350, 70%, 50%)", series: "hsl(280, 60%, 55%)",
  music: "hsl(140, 60%, 45%)", "top-rated": "hsl(40, 80%, 55%)", search: "hsl(200, 60%, 60%)",
  animation: "hsl(30, 80%, 55%)",
};

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ movies: 0, series: 0, users: 0 });
  const [navActivities, setNavActivities] = useState<NavActivity[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/login");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      try {
        const [moviesSnap, seriesSnap, usersSnap] = await Promise.all([
          get(dbRef(database, "movies")),
          get(dbRef(database, "series")),
          get(dbRef(database, "users")),
        ]);
        setStats({
          movies: moviesSnap.exists() ? Object.keys(moviesSnap.val()).length : 0,
          series: seriesSnap.exists() ? Object.keys(seriesSnap.val()).length : 0,
          users: usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();

    // Real-time listener for navigation activity
    const navRef = dbRef(database, "navigation_activity");
    const unsubNav = onValue(navRef, (snap) => {
      if (snap.exists()) {
        const navList = Object.values(snap.val()) as NavActivity[];
        setNavActivities(navList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    });

    // User activity is now stored under the same navigation_activity node.
    const actRef = dbRef(database, "navigation_activity");
    const unsubAct = onValue(actRef, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as UserActivity[];
        setUserActivities(
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200)
        );
      }
    });

    return () => {
      unsubNav();
      unsubAct();
    };
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const totalContent = stats.movies + stats.series;

  // Navigation section counts
  const navSectionCounts = navActivities.reduce<Record<string, number>>((acc, n) => {
    acc[n.section] = (acc[n.section] || 0) + 1;
    return acc;
  }, {});

  const navSectionData = Object.entries(navSectionCounts)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace("-", " "), key: name, value }))
    .sort((a, b) => b.value - a.value);

  const recentNav = navActivities.slice(0, 15);

  const statCards = [
    { label: "Total Movies", value: stats.movies, icon: Film, color: "from-blue-500/20 to-blue-600/10" },
    { label: "Total Series", value: stats.series, icon: Tv, color: "from-violet-500/20 to-violet-600/10" },
    { label: "Total Users", value: stats.users, icon: Users, color: "from-emerald-500/20 to-emerald-600/10" },
    { label: "All Content", value: totalContent, icon: TrendingUp, color: "from-amber-500/20 to-amber-600/10" },
  ];

  const adminLinks = [
    { label: "Movies", icon: Film, href: "/admin/movies", desc: "Add, edit, or delete movies" },
    { label: "Series", icon: Tv, href: "/admin/series", desc: "Add series with episodes" },
    { label: "Music", icon: Music, href: "/admin/music", desc: "Upload and manage music videos" },
    { label: "Animation", icon: Image, href: "/admin/animation", desc: "Manage animation content" },
    { label: "Carousel", icon: Image, href: "/admin/carousel", desc: "Update featured carousel" },
    { label: "Users", icon: Users, href: "/admin/users", desc: "View registered users" },
    { label: "Wallet", icon: Wallet, href: "/admin/wallet", desc: "View balance & withdraw" },
    { label: "Activity", icon: Activity, href: "/admin/activity", desc: "Real-time analytics & activity" },
    { label: "Agents", icon: Sparkles, href: "/admin/agents", desc: "Agent of the Week submissions" },
  ];

  return (
    <AdminPasswordGate>
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground text-xs">LUO CINEMA Control Panel</p>
              </div>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  className={`p-5 bg-gradient-to-br ${stat.color} border-border/50 relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-background/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground/70" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Management</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group p-4 bg-card border border-border/50 rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <h3 className="text-foreground font-semibold text-sm">{link.label}</h3>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{link.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Navigation Activity */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">User Navigation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Most Visited Sections */}
              <Card className="p-4 bg-card border-border/50">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Most Visited Sections
                </h3>
                {navSectionData.length > 0 ? (
                  <div className="space-y-2.5">
                    {navSectionData.slice(0, 6).map((s) => {
                      const Icon = sectionIcons[s.key] || Globe;
                      const maxVal = navSectionData[0]?.value || 1;
                      return (
                        <div key={s.key} className="flex items-center gap-2">
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: sectionColors[s.key] || "hsl(var(--muted-foreground))" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium text-foreground">{s.name}</span>
                              <span className="text-[10px] text-muted-foreground">{s.value} visits</span>
                            </div>
                            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(s.value / maxVal) * 100}%`,
                                  background: sectionColors[s.key] || "hsl(var(--primary))",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs text-center py-8">No navigation data yet</p>
                )}
              </Card>

              {/* Recent Navigation Feed */}
              <Card className="p-4 bg-card border-border/50">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary animate-pulse" />
                  Recent Navigation
                </h3>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {recentNav.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-8">No navigation activity yet</p>
                  ) : (
                    recentNav.map((nav, i) => {
                      const Icon = sectionIcons[nav.section] || Globe;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${sectionColors[nav.section] || "hsl(var(--primary))"}20` }}
                          >
                            <Icon className="w-3.5 h-3.5" style={{ color: sectionColors[nav.section] || "hsl(var(--primary))" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-foreground truncate font-medium">
                              {nav.userEmail?.split("@")[0] || "User"}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              → {nav.section.charAt(0).toUpperCase() + nav.section.slice(1).replace("-", " ")} · {timeAgo(nav.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Full User Activity Log */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live User Activity Log</h2>
              <span className="text-[10px] text-muted-foreground">{userActivities.length} recent events</span>
            </div>
            <Card className="p-4 bg-card border-border/50">
              {userActivities.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8">No activity captured yet</p>
              ) : (
                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                  {userActivities.map((act, i) => {
                    const typeColor =
                      act.type === "click" ? "hsl(200, 80%, 55%)" :
                      act.type === "navigation" ? "hsl(280, 60%, 60%)" :
                      act.type === "input" ? "hsl(140, 60%, 50%)" :
                      "hsl(var(--muted-foreground))";
                    const who = act.userName || act.userEmail?.split("@")[0] || "User";
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-secondary/40 border border-border/40 text-[11px]">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex-shrink-0"
                          style={{ background: `${typeColor}25`, color: typeColor }}
                        >
                          {act.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">
                            <span className="font-semibold">{who}</span>
                            <span className="text-muted-foreground"> · {act.userEmail || "—"}</span>
                          </p>
                          <p className="text-muted-foreground truncate">
                            <span className="text-foreground/80">{act.action}</span>
                            {act.target ? <> → <span className="text-foreground">{act.target}</span></> : null}
                            {act.path ? <span className="text-muted-foreground"> · {act.path}</span> : null}
                          </p>
                        </div>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                          {timeAgo(act.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Security</h2>
            <AdminChangePassword />
          </div>
        </div>
      </div>
    </AdminPasswordGate>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
