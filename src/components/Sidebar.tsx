import { Home, Film, Tv, Music, Star, CreditCard, Shield, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  onFilterChange: (filter: string) => void;
  activeFilter: string;
  onShowSubscription?: () => void;
}

const navItems = [
  { icon: Home, label: "Home", filter: "home" },
  { icon: Film, label: "Movies", filter: "movies" },
  { icon: Tv, label: "Series", filter: "series" },
  { icon: Music, label: "Music", filter: "music" },
  { icon: Star, label: "Top Rated", filter: "top-rated" },
  { icon: CreditCard, label: "Plans", filter: "subscription" },
  { icon: Settings, label: "Settings", filter: "settings" },
];

export default function Sidebar({ onFilterChange, activeFilter, onShowSubscription }: SidebarProps) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleClick = (filter: string) => {
    if (filter === "settings") { navigate("/settings"); return; }
    if (filter === "subscription") { onShowSubscription?.(); return; }
    onFilterChange(filter);
  };

  return (
    <div
      className="fixed left-0 top-0 h-full w-[72px] flex-col items-center py-4 z-40 hidden md:flex"
      style={{
        background: "hsl(var(--sidebar-background) / 0.95)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid hsl(var(--sidebar-border) / 0.5)",
      }}
    >
      {/* Logo */}
      <div className="mb-6 mt-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-[hsl(0_30%_25%)] flex items-center justify-center shadow-lg shadow-primary/20 relative">
          <img
            src="https://i.postimg.cc/Fs2nssw-m/logo.png"
            alt="Logo"
            className="w-6 h-6"
          />
          <span className="absolute -top-1 -right-1 text-xs sky-pulse">💖</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.filter;
          return (
            <button
              key={item.filter}
              onClick={() => handleClick(item.filter)}
              className="group relative flex flex-col items-center gap-0.5 py-2 w-full rounded-xl transition-all duration-200"
              style={
                isActive
                  ? { background: "hsl(var(--primary) / 0.12)" }
                  : {}
              }
              title={item.label}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "hsl(var(--primary))" }}
                />
              )}
              <Icon
                className={`w-[18px] h-[18px] transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span className={`text-[8px] font-semibold transition-all duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {isAdmin && (
          <>
            <div className="w-8 h-px bg-border/30 my-1" />
            <button
              onClick={() => navigate("/admin")}
              className="group flex flex-col items-center gap-0.5 py-2 w-full rounded-xl transition-all duration-200"
              title="Admin"
            >
              <Shield className="w-[18px] h-[18px] text-muted-foreground group-hover:text-accent transition-colors" strokeWidth={1.6} />
              <span className="text-[8px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">Admin</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
