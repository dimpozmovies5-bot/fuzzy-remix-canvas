import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useAuth } from "@/lib/auth-context";

interface ContentItem {
  id: string;
  title: string;
  image?: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
  category?: string;
  episodes?: any;
  seasons?: number;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  image?: string;
  timestamp: number;
  type: "new_movie" | "new_series" | "new_episode";
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function getReadNotifications(): string[] {
  try {
    return JSON.parse(localStorage.getItem("read_notifications") || "[]");
  } catch {
    return [];
  }
}

function markAsRead(ids: string[]) {
  const existing = getReadNotifications();
  const merged = [...new Set([...existing, ...ids])];
  localStorage.setItem("read_notifications", JSON.stringify(merged));
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(getReadNotifications());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const now = Date.now();
    const allNotifications: Notification[] = [];

    const processPath = (path: string, type: string) => {
      const dbRef = ref(database, path);
      return onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        Object.entries(data).forEach(([id, value]: [string, any]) => {
          const createdAt = value.createdAt ? new Date(value.createdAt).getTime() : 0;
          const updatedAt = value.updatedAt ? new Date(value.updatedAt).getTime() : 0;
          const latestTime = Math.max(createdAt, updatedAt);

          if (now - createdAt < TWO_DAYS_MS && createdAt > 0) {
            allNotifications.push({
              id: `new-${id}`,
              title: value.title || "New Content",
              description: type === "series"
                ? `New series "${value.title}" is now available!`
                : `"${value.title}" has been added to ${type === "movie" ? "Movies" : "Originals"}!`,
              image: value.image,
              timestamp: createdAt,
              type: type === "series" ? "new_series" : "new_movie",
            });
          }

          // Check for updated series (new episodes)
          if (type === "series" && updatedAt > createdAt && now - updatedAt < TWO_DAYS_MS) {
            const episodes = value.episodes;
            let epCount = 0;
            if (episodes) {
              epCount = Array.isArray(episodes)
                ? episodes.filter(Boolean).length
                : Object.keys(episodes).length;
            }
            const seasonNum = value.seasons || 1;
            allNotifications.push({
              id: `ep-${id}-${updatedAt}`,
              title: value.title || "Series Update",
              description: `New episodes added to "${value.title}" — Season ${seasonNum}, ${epCount} episode${epCount !== 1 ? "s" : ""} total`,
              image: value.image,
              timestamp: updatedAt,
              type: "new_episode",
            });
          }
        });

        // Deduplicate and sort
        const unique = Array.from(
          new Map(allNotifications.map((n) => [n.id, n])).values()
        ).sort((a, b) => b.timestamp - a.timestamp);

        setNotifications(unique);
      });
    };

    const unsubs = [
      processPath("movies", "movie"),
      processPath("series", "series"),
      processPath("originals", "original"),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      const ids = notifications.map((n) => n.id);
      markAsRead(ids);
      setReadIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_movie": return "🎬";
      case "new_series": return "📺";
      case "new_episode": return "🆕";
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className={`relative flex items-center justify-center w-8 h-8 rounded-xl hover:bg-secondary/80 transition ${unreadCount > 0 ? "wa-bounce" : ""}`}
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-foreground" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#25D366] text-white text-[10px] font-bold rounded-full flex items-center justify-center wa-pop shadow-[0_0_12px_rgba(37,211,102,0.9)] ring-2 ring-background z-10">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#25D366]" style={{ animation: "wa-ping-green 1.5s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="text-xs font-bold text-foreground">Notifications</h3>
            <p className="text-[10px] text-muted-foreground">New content from the last 2 days</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !readIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-border/30 last:border-0 transition ${
                      isUnread ? "bg-primary/5" : ""
                    }`}
                  >
                    {n.image ? (
                      <img
                        src={n.image}
                        alt=""
                        className="w-10 h-14 rounded-md object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 text-lg">
                        {getIcon(n.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{getIcon(n.type)}</span>
                        <p className="text-[11px] font-semibold text-foreground truncate">{n.title}</p>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-1">{formatTime(n.timestamp)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
