// Download limit tracking per plan
// 12hr plan: 10 downloads total for the period
// All other plans: unlimited downloads

const STORAGE_KEY = "download_tracker_v2";

interface DownloadTracker {
  planId: string;
  subscriptionStart: string;
  // unique content ids downloaded during the subscription
  downloads: string[];
  // per-day counts: { "YYYY-MM-DD": [contentIds...] }
  daily: Record<string, string[]>;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTracker(): DownloadTracker | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTracker(t: DownloadTracker) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function resetTracker(planId: string, subscriptionStart: string) {
  saveTracker({ planId, subscriptionStart, downloads: [], daily: {} });
}

function ensureTracker(planId: string): DownloadTracker {
  let t = getTracker();
  if (!t || t.planId !== planId) {
    t = { planId, subscriptionStart: new Date().toISOString(), downloads: [], daily: {} };
    saveTracker(t);
  }
  if (!t.daily) t.daily = {};
  return t;
}

export interface LimitInfo {
  used: number;
  max: number;
  scope: "total" | "daily";
  remaining: number;
}

export function getLimitInfo(planId: string | undefined | null): LimitInfo | null {
  if (!planId) return null;
  if (planId === "12hr") {
    const t = ensureTracker(planId);
    const used = t.downloads.length;
    return { used, max: 10, scope: "total", remaining: Math.max(0, 10 - used) };
  }
  // All other plans have unlimited downloads
  return null;
}

export function canDownload(planId: string | undefined | null, contentId: string): { ok: boolean; reason?: string; info?: LimitInfo } {
  const info = getLimitInfo(planId);
  if (!info) return { ok: true };
  // allow re-download of already-counted items
  if (planId === "12hr") {
    const t = ensureTracker(planId!);
    if (t.downloads.includes(contentId)) return { ok: true, info };
  }
  if (info.remaining <= 0) {
    const reason = `Download limit reached (${info.max} for this plan). Upgrade to download more.`;
    return { ok: false, reason, info };
  }
  return { ok: true, info };
}

export function recordDownload(planId: string | undefined | null, contentId: string) {
  if (!planId) return;
  if (planId === "12hr") {
    const t = ensureTracker(planId);
    if (!t.downloads.includes(contentId)) {
      t.downloads.push(contentId);
      saveTracker(t);
    }
  }
  // All other plans are unlimited — no tracking needed
}

export function isThirtyMinPlan(_planId: string | undefined): boolean {
  return false;
}
