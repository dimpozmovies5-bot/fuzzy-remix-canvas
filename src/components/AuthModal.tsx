import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import Logo from "@/components/Logo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || (isSignup ? "Signup failed" : "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Google auth failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-md w-full p-[3px] rounded-3xl animate-gradient-border">
        <div
          className="bg-card/95 backdrop-blur-xl rounded-3xl w-full p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          <div className="text-center mb-6 flex flex-col items-center">
            <Logo size="lg" />
            <p className="text-muted-foreground text-sm mt-3">
              {isSignup ? "Create Account" : "Welcome Back"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-accent/20 border border-accent/50 rounded text-accent text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-secondary border-border text-foreground"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 bg-secondary border-border text-foreground"
                placeholder="Enter your password"
                required
              />
            </div>
            {isSignup && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 bg-secondary border-border text-foreground"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold"
            >
              {loading ? (isSignup ? "Creating..." : "Logging in...") : isSignup ? "Sign Up" : "Login"}
            </Button>
          </form>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleAuth}
            disabled={loading}
            variant="outline"
            className="w-full h-9 text-sm mb-4"
          >
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(""); setConfirmPassword(""); }}
              className="text-primary hover:underline font-medium"
            >
              {isSignup ? "Login" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
