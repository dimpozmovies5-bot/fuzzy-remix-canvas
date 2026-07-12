import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { updatePassword, updateProfile } from "firebase/auth";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";
import { ChevronLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import MobileNav from "@/components/MobileNav";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      await set(ref(database, `users/${user.uid}`), {
        email: user.email,
        displayName: displayName || user.email?.split("@")[0],
        photoURL: user.photoURL,
        updatedAt: new Date().toISOString(),
      });
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setSaving(false);
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setSaving(false);
      return;
    }

    try {
      await updatePassword(user, newPassword);
      setSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar onFilterChange={() => navigate("/")} activeFilter="settings" />

      <div className="flex-1 md:ml-16 flex flex-col">
        <TopHeader />

        <main className="flex-1 pt-16 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-primary hover:underline mb-6 text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

            {error && (
              <div className="mb-4 p-3 bg-accent/20 border border-accent/50 rounded text-accent text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-400 text-sm">{success}</div>
            )}

            <div className="bg-card rounded-lg p-6 mb-6 border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">Profile Settings</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm opacity-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-semibold text-sm transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Profile"}
                </button>
              </form>
            </div>

            <div className="bg-card rounded-lg p-6 mb-6 border border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">Change Password</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-semibold text-sm transition disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Change Password"}
                </button>
              </form>
            </div>
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
