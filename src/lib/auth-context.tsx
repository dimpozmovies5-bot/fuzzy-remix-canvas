import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, database } from "./firebase";
import { ref as dbRef, set, get } from "firebase/database";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  "arthurdimpoz@gmail.com",
].map((e) => e.toLowerCase());

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser?.email) {
        const userEmail = currentUser.email.toLowerCase().trim();
        setIsAdmin(ADMIN_EMAILS.includes(userEmail));
      } else {
        setIsAdmin(false);
      }

      // Auto-clear stale browsing data for logged-in users so payment retries
      // are not blocked by cached responses / stale sessionStorage state.
      if (currentUser) {
        try {
          const flagKey = `browsingDataCleared_${currentUser.uid}`;
          const lastCleared = localStorage.getItem(flagKey);
          const now = Date.now();
          // Clear once per session, and again every 30 minutes.
          if (!lastCleared || now - Number(lastCleared) > 30 * 60 * 1000) {
            // Wipe payment-related sessionStorage keys
            try {
              const keys = Object.keys(sessionStorage);
              keys.forEach((k) => {
                if (/pay|deposit|withdraw|txn|transaction|reference|msisdn|phone/i.test(k)) {
                  sessionStorage.removeItem(k);
                }
              });
            } catch {}

            // Wipe payment-related localStorage keys (keep auth + prefs)
            try {
              const keys = Object.keys(localStorage);
              keys.forEach((k) => {
                if (/pay|deposit|withdraw|txn|transaction|reference|pendingPayment/i.test(k)) {
                  localStorage.removeItem(k);
                }
              });
            } catch {}

            // Drop any cached fetch responses (Service Worker / PWA cache)
            try {
              if ("caches" in window) {
                const names = await caches.keys();
                await Promise.all(
                  names.map(async (name) => {
                    const cache = await caches.open(name);
                    const reqs = await cache.keys();
                    await Promise.all(
                      reqs.map((req) =>
                        /function-bun-production|\/api\/(deposit|withdraw|request-status|validate-phone|transactions|wallet)/i.test(
                          req.url
                        )
                          ? cache.delete(req)
                          : Promise.resolve(false)
                      )
                    );
                  })
                );
              }
            } catch {}

            localStorage.setItem(flagKey, String(now));
          }
        } catch (e) {
          console.warn("Auto browsing-data cleanup failed:", e);
        }
      }



      if (currentUser) {
        try {
          const userRef = dbRef(database, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          await set(userRef, {
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
            photoURL: currentUser.photoURL,
            phoneNumber: currentUser.phoneNumber || snapshot.val()?.phoneNumber || "",
            lastLogin: new Date().toISOString(),
            createdAt: snapshot.exists() ? snapshot.val().createdAt : new Date().toISOString(),
            isAdmin: ADMIN_EMAILS.includes((currentUser.email || "").toLowerCase().trim()),
          });
        } catch (error) {
          console.error("Error saving user to database:", error);
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Disable right-click for everyone except admin users
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (!isAdmin) e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [isAdmin]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
