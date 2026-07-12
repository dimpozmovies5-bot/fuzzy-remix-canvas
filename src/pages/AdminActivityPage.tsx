import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, onValue } from "firebase/database";
import { Card } from "@/components/ui/card";
import {
  Activity, Users, Crown, TrendingUp, Clock, Eye, LogIn,
  Film, Tv, Music, ArrowLeft, RefreshCw, Smartphone, Globe,
  Home, Star, Search, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminPasswordGate from "@/components/AdminPasswordGate";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-context";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts";

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
  activatedBy?: string;
}

interface TransactionData {
  amount: number;
  status: string;
  msisdn?: string;
  timestamp: string;
  referenceId?: string;
  userId?: string;
}

interface NavActivity {
  userId: string;
  userEmail: string;
  section: string;
  timestamp: string;
}

const CHART_COLORS = [
  "hsl(200, 80%, 50%)",
  "hsl(140, 60%, 45%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(350, 70%, 50%)",
  "hsl(60, 70%, 45%)",
];

export default function AdminActivityPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<(UserData & { id: string })[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [navActivities, setNavActivities] = useState<NavActivity[]>([]);
  const [contentStats, setContentStats] = useState({ movies: 0, series: 0, music: 0, animation: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    // Real-time listener for users
    const usersRef = dbRef(database, "users");
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val())
          .map(([id, value]: any) => ({ id, ...value }))
          .sort((a: any, b: any) => {
            const tA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
            const tB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
            return tB - tA;
          });
        setUsers(list);
      }
      setLastUpdated(new Date());
    });

    // Real-time listener for subscriptions
    const subsRef = dbRef(database, "subscriptions");
    const unsubSubs = onValue(subsRef, (snap) => {
      if (snap.exists()) setSubscriptions(snap.val());
    });

    // Real-time listener for transactions
    const txRef = dbRef(database, "transactions");
    const unsubTx = onValue(txRef, (snap) => {
      if (snap.exists()) {
        const txList = Object.values(snap.val()) as TransactionData[];
        setTransactions(txList);
      }
    });

    // Real-time listener for navigation activity
    const navRef = dbRef(database, "navigation_activity");
    const unsubNav = onValue(navRef, (snap) => {
      if (snap.exists()) {
        const navList = Object.values(snap.val()) as NavActivity[];
        setNavActivities(navList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    });

    // Fetch content stats
    fetchContentStats();

    return () => {
      unsubUsers();
      unsubSubs();
      unsubTx();
      unsubNav();
    };
  }, [isAdmin]);

  const fetchContentStats = async () => {
    try {
      const [movSnap, serSnap, musSnap, aniSnap] = await Promise.all([
        get(dbRef(database, "movies")),
        get(dbRef(database, "series")),
        get(dbRef(database, "music")),
        get(dbRef(database, "animations")),
      ]);
      setContentStats({
        movies: movSnap.exists() ? Object.keys(movSnap.val()).length : 0,
        series: serSnap.exists() ? Object.keys(serSnap.val()).length : 0,
        music: musSnap.exists() ? Object.keys(musSnap.val()).length : 0,
        animation: aniSnap.exists() ? Object.keys(aniSnap.val()).length : 0,
      });
    } catch (e) {
      console.error("Error fetching content stats:", e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContentStats();
    setRefreshing(false);
    setLastUpdated(new Date());
  };

  // Computed analytics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const usersToday = users.filter(u => u.lastLogin && new Date(u.lastLogin) >= today).length;
  const usersThisWeek = users.filter(u => u.lastLogin && new Date(u.lastLogin) >= last7Days).length;
  const newUsersThisMonth = users.filter(u => u.createdAt && new Date(u.createdAt) >= last30Days).length;

  const activeSubscriptions = Object.values(subscriptions).filter(s => new Date(s.endDate) > now).length;
  const expiredSubscriptions = Object.values(subscriptions).filter(s => new Date(s.endDate) <= now).length;

  const totalRevenue = transactions
    .filter(t => t.status === "successful" || t.status === "completed")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Signup trend (last 7 days)
  const signupTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const count = users.filter(u => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d >= date && d < nextDate;
    }).length;
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      signups: count,
    };
  });

  // Login activity (last 7 days)
  const loginTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const count = users.filter(u => {
      if (!u.lastLogin) return false;
      const d = new Date(u.lastLogin);
      return d >= date && d < nextDate;
    }).length;
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      logins: count,
    };
  });

  // Subscription plan distribution
  const planDistribution = SUBSCRIPTION_PLANS.map(plan => {
    const count = Object.values(subscriptions).filter(
      s => s.planId === plan.id && new Date(s.endDate) > now
    ).length;
    return { name: plan.name, value: count };
  }).filter(p => p.value > 0);

  // Content distribution
  const contentDistribution = [
    { name: "Movies", value: contentStats.movies },
    { name: "Series", value: contentStats.series },
    { name: "Music", value: contentStats.music },
    { name: "Animation", value: contentStats.animation },
  ].filter(c => c.value > 0);

  // Navigation section icons
  const sectionIcons: Record<string, typeof Home> = {
    home: Home, movies: Film, series: Tv, music: Music,
    "top-rated": Star, search: Search, animation: Film,
  };

  const sectionColors: Record<string, string> = {
    home: "hsl(200, 80%, 50%)", movies: "hsl(350, 70%, 50%)", series: "hsl(280, 60%, 55%)",
    music: "hsl(140, 60%, 45%)", "top-rated": "hsl(40, 80%, 55%)", search: "hsl(200, 60%, 60%)",
    animation: "hsl(30, 80%, 55%)",
  };

  // Navigation stats - section visit counts
  const navSectionCounts = navActivities.reduce<Record<string, number>>((acc, n) => {
    acc[n.section] = (acc[n.section] || 0) + 1;
    return acc;
  }, {});

  const navSectionData = Object.entries(navSectionCounts)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1).replace("-", " "), key: name, value }))
    .sort((a, b) => b.value - a.value);

  // Navigation trend (last 7 days)
  const navTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const count = navActivities.filter(n => {
      const d = new Date(n.timestamp);
      return d >= date && d < nextDate;
    }).length;
    return { day: date.toLocaleDateString("en", { weekday: "short" }), visits: count };
  });

  // Recent navigation activity (last 30 entries)
  const recentNav = navActivities.slice(0, 30);

  // Recent activity feed
  const recentLogins = users
    .filter(u => u.lastLogin)
    .slice(0, 10)
    .map(u => ({
      type: "login" as const,
      user: u.displayName || u.email,
      time: u.lastLogin,
      avatar: (u.displayName || u.email)?.[0]?.toUpperCase(),
    }));

  const recentSignups = [...users]
    .filter(u => u.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(u => ({
      type: "signup" as const,
      user: u.displayName || u.email,
      time: u.createdAt,
      avatar: (u.displayName || u.email)?.[0]?.toUpperCase(),
    }));

  const activityFeed = [...recentLogins, ...recentSignups]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 15);

  if (loading || !isAdmin) return null;

  return (
    <AdminPasswordGate>
      <div className="min-h-screen bg-background p-3 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">User Activity</h1>
                <p className="text-muted-foreground text-[10px] md:text-xs">
                  Real-time · Updated {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 text-xs">
                <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link to="/admin" className="text-primary hover:underline text-xs">
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Admin
              </Link>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-3 md:p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <LogIn className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground">Active Today</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{usersToday}</p>
              <p className="text-[10px] text-muted-foreground">{usersThisWeek} this week</p>
            </Card>
            <Card className="p-3 md:p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-[10px] text-muted-foreground">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-[10px] text-green-400">+{newUsersThisMonth} this month</p>
            </Card>
            <Card className="p-3 md:p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] text-muted-foreground">Active Subs</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{activeSubscriptions}</p>
              <p className="text-[10px] text-red-400">{expiredSubscriptions} expired</p>
            </Card>
            <Card className="p-3 md:p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-[10px] text-muted-foreground">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {totalRevenue > 0 ? `UGX ${totalRevenue.toLocaleString()}` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">{transactions.length} transactions</p>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Login Trend */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <LogIn className="w-4 h-4 text-primary" />
                Login Activity (7 days)
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loginTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="logins" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Signup Trend */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                New Signups (7 days)
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      stroke="hsl(140, 60%, 45%)"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(140, 60%, 45%)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Pie Charts + Activity Feed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Subscription Distribution */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                Plan Distribution
              </h3>
              {planDistribution.length > 0 ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {planDistribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs text-center py-12">No active subscriptions</p>
              )}
            </Card>

            {/* Content Distribution */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                Content Library
              </h3>
              {contentDistribution.length > 0 ? (
                <>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={50}
                          dataKey="value"
                        >
                          {contentDistribution.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {contentDistribution.map((c, i) => (
                      <span key={c.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        {c.name} ({c.value})
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-xs text-center py-12">No content yet</p>
              )}
            </Card>

            {/* Real-time Activity Feed */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                Live Activity Feed
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activityFeed.length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-8">No recent activity</p>
                ) : (
                  activityFeed.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                        {item.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground truncate">
                          <span className="font-medium">{item.user}</span>
                          {item.type === "login" ? (
                            <span className="text-primary ml-1">logged in</span>
                          ) : (
                            <span className="text-green-400 ml-1">signed up</span>
                          )}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {timeAgo(item.time)}
                        </p>
                      </div>
                      {item.type === "login" ? (
                        <LogIn className="w-3 h-3 text-primary flex-shrink-0" />
                      ) : (
                        <Users className="w-3 h-3 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* User Navigation Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Navigation Bar Chart */}
            <Card className="p-4 bg-card border-border md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Page Visits (7 days)
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={navTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="visits" fill="hsl(280, 60%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Section Popularity */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Most Visited Sections
              </h3>
              {navSectionData.length > 0 ? (
                <div className="space-y-2">
                  {navSectionData.map((s) => {
                    const Icon = sectionIcons[s.key] || Globe;
                    const maxVal = navSectionData[0]?.value || 1;
                    return (
                      <div key={s.key} className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sectionColors[s.key] || "hsl(var(--muted-foreground))" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground">{s.value}</span>
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
          </div>

          {/* Recent Navigation Feed */}
          <Card className="p-4 bg-card border-border mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary animate-pulse" />
              Recent User Navigation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {recentNav.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8 col-span-full">No navigation activity yet</p>
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

          {/* Recent Users Table */}
          <Card className="p-4 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent User Sessions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">User</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Last Login</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium hidden md:table-cell">Joined</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 20).map(u => {
                    const subStatus = subscriptions[u.id];
                    const isActive = subStatus && new Date(subStatus.endDate) > now;
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                              {(u.displayName || u.email)?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-foreground font-medium truncate max-w-[100px]">
                              {u.displayName || "No name"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground hidden sm:table-cell truncate max-w-[150px]">
                          {u.email}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {u.lastLogin ? timeAgo(u.lastLogin) : "Never"}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground hidden md:table-cell">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 px-2">
                          {isActive ? (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full border border-green-400/30">
                              Active
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground text-[10px] rounded-full border border-border">
                              Free
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
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
