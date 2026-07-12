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
