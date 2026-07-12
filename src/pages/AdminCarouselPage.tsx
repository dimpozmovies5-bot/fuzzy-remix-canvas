import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, push, get, remove } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CarouselItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export default function AdminCarouselPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [newItem, setNewItem] = useState({ title: "", subtitle: "", image: "" });
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadCarousel();
  }, [isAdmin]);

  const loadCarousel = async () => {
    try {
      const snapshot = await get(dbRef(database, "carousel"));
      if (snapshot.exists()) {
        setItems(Object.entries(snapshot.val()).map(([id, value]: any) => ({ id, ...value })));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.image.trim() || !newItem.title.trim()) { alert("Fill required fields"); return; }

    setUploading(true);
    try {
      await push(dbRef(database, "carousel"), { ...newItem, createdAt: new Date().toISOString() });
      setSuccessMessage("Added!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setNewItem({ title: "", subtitle: "", image: "" });
      loadCarousel();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete?")) {
      await remove(dbRef(database, `carousel/${id}`));
      setSuccessMessage("Deleted!");
      setTimeout(() => setSuccessMessage(""), 3000);
      loadCarousel();
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Manage Carousel</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {successMessage && <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-400 text-sm">{successMessage}</div>}

        <Card className="bg-card border-border p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Add Carousel Item</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-foreground mb-1">Title *</label><Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Subtitle</label><Input value={newItem.subtitle} onChange={(e) => setNewItem({ ...newItem, subtitle: e.target.value })} className="bg-secondary border-border text-foreground" /></div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Image URL *</label><Input type="url" value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })} className="bg-secondary border-border text-foreground" required /></div>
            </div>
            <Button type="submit" disabled={uploading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {uploading ? "Adding..." : "Add Item"}
            </Button>
          </form>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative rounded-xl overflow-hidden border border-border group">
              <div className="aspect-video">
                <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-foreground font-bold text-sm">{item.title}</p>
                <p className="text-muted-foreground text-xs">{item.subtitle}</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} className="absolute top-2 right-2 h-7 text-xs opacity-0 group-hover:opacity-100 transition">
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
