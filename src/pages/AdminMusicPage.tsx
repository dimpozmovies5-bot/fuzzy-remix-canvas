import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, push, get, remove, update } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music } from "lucide-react";

interface MusicVideo {
  id: string;
  title: string;
  image: string;
  rating: number;
  year: number;
  streamlink: string;
  artist?: string;
}

export default function AdminMusicPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [musicVideos, setMusicVideos] = useState<MusicVideo[]>([]);
  const [newMusic, setNewMusic] = useState({ title: "", image: "", rating: 7.5, year: new Date().getFullYear(), streamlink: "", artist: "" });
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingMusic, setEditingMusic] = useState<MusicVideo | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadMusic();
  }, [isAdmin]);

  const loadMusic = async () => {
    try {
      const snapshot = await get(dbRef(database, "movies"));
      if (snapshot.exists()) {
        setMusicVideos(Object.entries(snapshot.val()).map(([id, value]: any) => ({ id, ...value })).filter((i: any) => i.category?.toLowerCase() === "music"));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMusic.image.trim() || !newMusic.title.trim() || !newMusic.streamlink.trim()) { alert("Fill required fields"); return; }

    setUploading(true);
    try {
      const data = { title: newMusic.title, image: newMusic.image, rating: Number(newMusic.rating), year: newMusic.year, category: "Music", streamlink: newMusic.streamlink, artist: newMusic.artist, type: "music" };

      if (editingMusic) {
        await update(dbRef(database, `movies/${editingMusic.id}`), { ...data, updatedAt: new Date().toISOString() });
        setSuccessMessage("Updated!");
        setEditingMusic(null);
      } else {
        await push(dbRef(database, "movies"), { ...data, createdAt: new Date().toISOString() });
        setSuccessMessage("Added!");
      }

      setTimeout(() => setSuccessMessage(""), 3000);
      setNewMusic({ title: "", image: "", rating: 7.5, year: new Date().getFullYear(), streamlink: "", artist: "" });
      loadMusic();
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
      loadMusic();
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3"><Music className="w-6 h-6" /> Manage Music</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {successMessage && <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-400 text-sm">{successMessage}</div>}

        <Card className="bg-card border-border p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{editingMusic ? "Edit Music Video" : "Add New Music Video"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">Title *</label><Input value={newMusic.title} onChange={(e) => setNewMusic({ ...newMusic, title: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Artist</label><Input value={newMusic.artist} onChange={(e) => setNewMusic({ ...newMusic, artist: e.target.value })} className="bg-secondary border-border text-foreground" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Stream Link *</label><Input type="url" value={newMusic.streamlink} onChange={(e) => setNewMusic({ ...newMusic, streamlink: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Rating</label><Input type="number" min="0" max="10" step="0.1" value={newMusic.rating} onChange={(e) => setNewMusic({ ...newMusic, rating: parseFloat(e.target.value) })} className="bg-secondary border-border text-foreground" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Year</label><Input type="number" value={newMusic.year} onChange={(e) => setNewMusic({ ...newMusic, year: parseInt(e.target.value) })} className="bg-secondary border-border text-foreground" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Thumbnail URL *</label><Input type="url" value={newMusic.image} onChange={(e) => setNewMusic({ ...newMusic, image: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
            </div>
            <Button type="submit" disabled={uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {uploading ? "Saving..." : editingMusic ? "Update" : "Add Music Video"}
            </Button>
          </form>
        </Card>

        <div className="space-y-2">
          {musicVideos.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <img src={m.image || "/placeholder.svg"} alt={m.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{m.title}</p>
                <p className="text-muted-foreground text-xs">{m.artist || "-"} · {m.year}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => { setEditingMusic(m); setNewMusic({ title: m.title, image: m.image, rating: m.rating, year: m.year, streamlink: m.streamlink, artist: m.artist || "" }); }} className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30">Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)} className="h-7 text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
