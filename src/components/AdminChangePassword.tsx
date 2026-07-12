import React, { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";
import { Lock, Eye, EyeOff, Check } from "lucide-react";

const DEFAULT_PASSWORD = "admin123";

export default function AdminChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [storedPassword, setStoredPassword] = useState(DEFAULT_PASSWORD);

  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const snap = await get(dbRef(database, "adminSettings/password"));
        if (snap.exists()) setStoredPassword(snap.val());
      } catch {}
    };
    fetchPassword();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (currentPassword !== storedPassword) {
      setError("Current password is incorrect");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await set(dbRef(database, "adminSettings/password"), newPassword);
      setStoredPassword(newPassword);
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Change Admin Password</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <input
          type={showPasswords ? "text" : "password"}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm focus:outline-none focus:border-primary"
          required
        />
        <input
          type={showPasswords ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm focus:outline-none focus:border-primary"
          required
        />
        <input
          type={showPasswords ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2 bg-secondary text-foreground rounded border border-border text-sm focus:outline-none focus:border-primary"
          required
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showPasswords} onChange={() => setShowPasswords(!showPasswords)} />
          Show passwords
        </label>
        {error && <p className="text-destructive text-xs">{error}</p>}
        {success && <p className="text-green-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" />{success}</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
