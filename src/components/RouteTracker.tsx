import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { trackNavigation, trackActivity } from "@/lib/track-navigation";

const routeToSection: Record<string, string> = {
  "/": "home",
  "/search": "search",
  "/settings": "settings",
  "/subscribe": "subscribe",
  "/login": "login",
};

function getSection(pathname: string): string {
  if (routeToSection[pathname]) return routeToSection[pathname];
  if (pathname.startsWith("/play/")) return "play";
  if (pathname.startsWith("/admin")) return "admin";
  return pathname.replace("/", "") || "home";
}

function describeElement(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || el.textContent || "").trim().slice(0, 60);
  const aria = el.getAttribute("aria-label");
  const title = el.getAttribute("title");
  const name = el.getAttribute("name");
  const href = (el as HTMLAnchorElement).href;
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string" ? `.${el.className.split(" ").filter(Boolean).slice(0, 2).join(".")}` : "";
  const label = aria || title || name || text || href || `${tag}${id}${cls}`;
  return label.slice(0, 100);
}

export default function RouteTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const lastClickRef = useRef<number>(0);

  // Navigation tracking
  useEffect(() => {
    if (!user) return;
    const section = getSection(location.pathname);
    if (section !== "admin") {
      trackNavigation(user.uid, section, user.email || undefined);
    }
  }, [location.pathname, user]);

  // Global click + input tracking
  useEffect(() => {
    if (!user) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Throttle to 1 event per 250ms to avoid floods
      const now = Date.now();
      if (now - lastClickRef.current < 250) return;
      lastClickRef.current = now;

      const clickable = target.closest("button, a, [role='button'], [data-track]") as HTMLElement | null;
      const el = clickable || target;
      const tag = el.tagName.toLowerCase();
      const label = describeElement(el);
      const href = (el as HTMLAnchorElement).href || "";

      trackActivity({
        userId: user.uid,
        userEmail: user.email || undefined,
        userName: user.displayName || undefined,
        type: "click",
        action: `click_${tag}`,
        target: label,
        details: href ? { href } : undefined,
      });
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      trackActivity({
        userId: user.uid,
        userEmail: user.email || undefined,
        userName: user.displayName || undefined,
        type: "input",
        action: "form_submit",
        target: form.getAttribute("name") || form.id || form.action || "form",
      });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [user]);

  return null;
}
