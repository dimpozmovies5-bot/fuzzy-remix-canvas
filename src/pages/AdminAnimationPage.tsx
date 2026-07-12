import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, push, get, remove, update } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Animation {
  id: string;
  title: string;
  image: string;
  rating: number;
  year: number;
  genre: string;
  streamlink: string;
}

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi", "Romance", "Thriller"];

export default function AdminAnimationPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [newAnim, setNewAnim] = useState({ title: "", image: "", rating: 7.5, year: new Date().getFullYear(), genre: "Action", streamlink: "", type: "anime" });
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingAnim, setEditingAnim] = useState<Animation | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadAnimations();
  }, [isAdmin]);

  const loadAnimations = async () => {
    try {
      const snapshot = await get(dbRef(database, "movies"));
      if (snapshot.exists()) {
        setAnimations(Object.entries(snapshot.val()).map(([id, value]: any) => ({ id, ...value })).filter((i: any) => i.category?.toLowerCase() === "animation"));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnim.image.trim() || !newAnim.title.trim() || !newAnim.streamlink.trim()) { alert("Fill required fields"); return; }

    setUploading(true);
    try {
      const data = { title: newAnim.title, image: newAnim.image, rating: Number(newAnim.rating), year: newAnim.year, category: "Animation", genre: newAnim.genre, streamlink: newAnim.streamlink, type: newAnim.type };

      if (editingAnim) {
        await update(dbRef(database, `movies/${editingAnim.id}`), { ...data, updatedAt: new Date().toISOString() });
        setSuccessMessage("Updated!");
        setEditingAnim(null);
      } else {
        await push(dbRef(database, "movies"), { ...data, createdAt: new Date().toISOString() });
        setSuccessMessage("Added!");
      }

      setTimeout(() => setSuccessMessage(""), 3000);
      setNewAnim({ title: "", image: "", rating: 7.5, year: new Date().getFullYear(), genre: "Action", streamlink: "", type: "anime" });
      loadAnimations();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete?")) {
      await remove(dbRef(database, `movies/${id}`));
      setSuccessMessage("Deleted!");
      setTimeout(() => setSuccessMessage(""), 3000);
      loadAnimations();
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Manage Animations</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {successMessage && <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-400 text-sm">{successMessage}</div>}

        <Card className="bg-card border-border p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{editingAnim ? "Edit Animation" : "Add New Animation"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">Title *</label><Input value={newAnim.title} onChange={(e) => setNewAnim({ ...newAnim, title: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Genre</label>
                <select value={newAnim.genre} onChange={(e) => setNewAnim({ ...newAnim, genre: e.target.value })} className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm">
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Stream Link *</label><Input type="url" value={newAnim.streamlink} onChange={(e) => setNewAnim({ ...newAnim, streamlink: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Rating</label><Input type="number" min="0" max="10" step="0.1" value={newAnim.rating} onChange={(e) => setNewAnim({ ...newAnim, rating: parseFloat(e.target.value) })} className="bg-secondary border-border text-foreground" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Year</label><Input type="number" value={newAnim.year} onChange={(e) => setNewAnim({ ...newAnim, year: parseInt(e.target.value) })} className="bg-secondary border-border text-foreground" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Poster URL *</label><Input type="url" value={newAnim.image} onChange={(e) => setNewAnim({ ...newAnim, image: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
            </div>
            <Button type="submit" disabled={uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {uploading ? "Saving..." : editingAnim ? "Update" : "Add Animation"}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {animations.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <img src={a.image || "/placeholder.svg"} alt={a.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{a.title}</p>
                <p className="text-muted-foreground text-xs">{a.genre} · {a.year}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => { setEditingAnim(a); setNewAnim({ title: a.title, image: a.image, rating: a.rating, year: a.year, genre: a.genre, streamlink: a.streamlink, type: "anime" }); }} className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30">Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)} className="h-7 text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
