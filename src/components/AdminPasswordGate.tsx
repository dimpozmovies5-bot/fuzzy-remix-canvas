import React, { useState, useEffect } from "react";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";

interface AdminPasswordGateProps {
  children: React.ReactNode;
}

const DEFAULT_PASSWORD = "admin123";

export default function AdminPasswordGate({ children }: AdminPasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storedPassword, setStoredPassword] = useState(DEFAULT_PASSWORD);

  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const snap = await get(dbRef(database, "adminSettings/password"));
        if (snap.exists()) {
          setStoredPassword(snap.val());
        }
      } catch (err) {
        console.error("Error fetching admin password:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPassword();

    // Check session
    const session = sessionStorage.getItem("adminAuth");
    if (session === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === storedPassword) {
      setAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
              <p className="text-xs text-muted-foreground">Enter password to continue</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-10 py-2.5 bg-secondary text-foreground rounded-lg border border-border text-sm focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
