import { database } from "./firebase";
import { ref as dbRef, push } from "firebase/database";

export function trackNavigation(userId: string, section: string, userEmail?: string) {
  if (!userId || !section) return;
  const navRef = dbRef(database, "navigation_activity");
  push(navRef, {
    userId,
    userEmail: userEmail || "",
    section,
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error("Track nav error:", err));
}

export interface ActivityEvent {
  userId: string;
  userEmail?: string;
  userName?: string;
  type: "click" | "navigation" | "input" | "scroll" | "custom";
  action: string;
  target?: string;
  path?: string;
  details?: Record<string, any>;
}

export function trackActivity(event: ActivityEvent) {
  if (!event.userId) return;
  // Reuse the navigation_activity node since it already has write permission.
  const ref = dbRef(database, "navigation_activity");
  push(ref, {
    userId: event.userId,
    userEmail: event.userEmail || "",
    userName: event.userName || "",
    type: event.type,
    action: event.action,
    section: event.target || event.action || "",
    target: event.target || "",
    path: event.path || (typeof window !== "undefined" ? window.location.pathname : ""),
    details: event.details || {},
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error("Track activity error:", err));
}
