import { Home, Film, Tv, Music, Star, CreditCard, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, useLocation } from "react-router-dom";

interface MobileNavProps {
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
  onShowSubscription?: () => void;
}

export default function MobileNav({ onFilterChange, activeFilter = "home", onShowSubscription }: MobileNavProps) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", filter: "home", path: "/" },
    { icon: Film, label: "Movies", filter: "movies", path: "/" },
    { icon: Tv, label: "Series", filter: "series", path: "/" },
    { icon: Music, label: "Music", filter: "music", path: "/" },
    { icon: Star, label: "Top", filter: "top-rated", path: "/" },
    { icon: CreditCard, label: "Plans", filter: "subscription", path: "modal" },
  ];

  const handleClick = (item: typeof navItems[0]) => {
    if (item.path === "modal") { onShowSubscription?.(); return; }
    if (item.path === "/" && location.pathname === "/") {
      onFilterChange?.(item.filter);
    } else if (item.path !== "/") {
      navigate(item.path);
    } else {
      navigate("/");
      setTimeout(() => onFilterChange?.(item.filter), 100);
    }
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 md:hidden z-40 pb-[env(safe-area-inset-bottom)] px-3">
      <div
        className="relative flex items-center justify-between gap-0.5 px-2 py-1.5 rounded-full mx-auto max-w-md"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 12% / 0.85), hsl(0 0% 6% / 0.9))",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid hsl(var(--primary) / 0.18)",
          boxShadow:
            "0 10px 40px hsl(0 0% 0% / 0.5), 0 0 0 1px hsl(0 0% 100% / 0.03) inset, 0 -1px 0 hsl(0 0% 100% / 0.05) inset",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.filter;
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-full transition-all duration-300"
              style={
                isActive
                  ? {
                      background:
                        "linear-gradient(180deg, hsl(var(--primary) / 0.95), hsl(var(--primary) / 0.75))",
                      boxShadow:
                        "0 4px 14px hsl(var(--primary) / 0.5), 0 0 0 1px hsl(var(--primary) / 0.6) inset",
                    }
                  : undefined
              }
            >
              <Icon
                className={`w-[18px] h-[18px] transition-all duration-200 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                strokeWidth={isActive ? 2.6 : 1.8}
              />
              <span
                className={`text-[9px] font-bold tracking-wide transition-all duration-200 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-full"
          >
            <Shield className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.8} />
            <span className="text-[9px] font-bold tracking-wide text-muted-foreground">Admin</span>
          </button>
        )}
      </div>
    </div>
  );
}
