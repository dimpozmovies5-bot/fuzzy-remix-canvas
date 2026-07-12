import { useEffect, useRef } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const SHOWN_KEY = "toast_shown_ids";

function getShownIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]"); } catch { return []; }
}

function addShownIds(ids: string[]) {
  const merged = [...new Set([...getShownIds(), ...ids])];
  localStorage.setItem(SHOWN_KEY, JSON.stringify(merged));
}

export default function NewContentToast() {
  const { user } = useAuth();
  const shown = useRef(getShownIds());

  useEffect(() => {
    if (!user) return;
    const now = Date.now();

    const processPath = (path: string, type: string) => {
      const dbRef = ref(database, path);
      return onValue(dbRef, (snapshot) => {
        if (!snapshot.exists()) return;
        Object.entries(snapshot.val()).forEach(([id, value]: [string, any]) => {
          const createdAt = value.createdAt ? new Date(value.createdAt).getTime() : 0;
          const updatedAt = value.updatedAt ? new Date(value.updatedAt).getTime() : 0;

          if (createdAt > 0 && now - createdAt < TWO_DAYS_MS) {
            const toastId = `new-${type}-${id}`;
            if (!shown.current.includes(toastId)) {
              shown.current.push(toastId);
              addShownIds([toastId]);
              setTimeout(() => {
                toast(`🎬 ${value.title || "New Content"}`, {
                  description: type === "series"
                    ? `New series just dropped!`
                    : `Now streaming in ${type === "movie" ? "Movies" : "Originals"}`,
                  duration: 6000,
                });
              }, 1500 + Math.random() * 2000);
            }
          }

          if (type === "series" && updatedAt > createdAt && now - updatedAt < TWO_DAYS_MS) {
            const toastId = `ep-${id}-${updatedAt}`;
            if (!shown.current.includes(toastId)) {
              shown.current.push(toastId);
              addShownIds([toastId]);
              setTimeout(() => {
                toast(`🆕 ${value.title || "Series Update"}`, {
                  description: "New episodes have been added!",
                  duration: 6000,
                });
              }, 2500 + Math.random() * 2000);
            }
          }
        });
      });
    };

    const unsubs = [
      processPath("movies", "movie"),
      processPath("series", "series"),
      processPath("originals", "original"),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user]);

  return null;
}
