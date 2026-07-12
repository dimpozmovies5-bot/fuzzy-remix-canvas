import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, push, get, remove, update } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Movie {
  id: string;
  title: string;
  image: string;
  rating: number;
  year: number;
  category: string;
  streamlink: string;
  genre?: string;
  isTrending?: boolean;
  isRecentlyAdded?: boolean;
}

const CATEGORIES = ["Action", "Adventure", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Fantasy", "Western", "Documentary", "Nigerian", "Ugandan", "Bongo", "Ghanaian", "Animation", "Music", "Special"];

export default function AdminMoviesPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [newMovie, setNewMovie] = useState({
    title: "", image: "", rating: 7.5, year: new Date().getFullYear(),
    category: "Action", streamlink: "", genre: "", isTrending: false, isRecentlyAdded: false,
  });
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadMovies();
  }, [isAdmin]);

  const loadMovies = async () => {
    try {
      const snapshot = await get(dbRef(database, "movies"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMovies(Object.entries(data).map(([id, value]: any) => ({ id, ...value })));
      }
    } catch (error) {
      console.error("Error loading movies:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovie.image.trim() || !newMovie.title.trim() || !newMovie.streamlink.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      const movieData = {
        title: newMovie.title, image: newMovie.image,
        rating: Number(newMovie.rating), year: newMovie.year,
        category: newMovie.category, streamlink: newMovie.streamlink,
        genre: newMovie.genre, isTrending: newMovie.isTrending,
        isRecentlyAdded: newMovie.isRecentlyAdded,
        ...(editingMovie ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() }),
      };

      if (editingMovie) {
        await update(dbRef(database, `movies/${editingMovie.id}`), movieData);
        setSuccessMessage("Movie updated!");
        setEditingMovie(null);
      } else {
        await push(dbRef(database, "movies"), movieData);
        setSuccessMessage("Movie added!");
      }

      setTimeout(() => setSuccessMessage(""), 3000);
      setNewMovie({ title: "", image: "", rating: 7.5, year: new Date().getFullYear(), category: "Action", streamlink: "", genre: "", isTrending: false, isRecentlyAdded: false });
      loadMovies();
    } catch (error) {
      console.error("Error:", error);
      alert("Error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setNewMovie({
      title: movie.title, image: movie.image, rating: movie.rating,
      year: movie.year, category: movie.category, streamlink: movie.streamlink,
      genre: movie.genre || "", isTrending: movie.isTrending || false,
      isRecentlyAdded: movie.isRecentlyAdded || false,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this movie?")) {
      await remove(dbRef(database, `movies/${id}`));
      setSuccessMessage("Movie deleted!");
      setTimeout(() => setSuccessMessage(""), 3000);
      loadMovies();
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Manage Movies</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-400 text-sm">{successMessage}</div>
        )}

        <Card className="bg-card border-border p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{editingMovie ? "Edit Movie" : "Add New Movie"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
                <Input value={newMovie.title} onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })} className="bg-secondary border-border text-foreground" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
                <select value={newMovie.category} onChange={(e) => setNewMovie({ ...newMovie, category: e.target.value })} className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Stream Link *</label>
                <Input type="url" value={newMovie.streamlink} onChange={(e) => setNewMovie({ ...newMovie, streamlink: e.target.value })} className="bg-secondary border-border text-foreground" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rating</label>
                <Input type="number" min="0" max="10" step="0.1" value={newMovie.rating} onChange={(e) => setNewMovie({ ...newMovie, rating: parseFloat(e.target.value) })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                <Input type="number" value={newMovie.year} onChange={(e) => setNewMovie({ ...newMovie, year: parseInt(e.target.value) })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Poster Image URL *</label>
                <Input type="url" value={newMovie.image} onChange={(e) => setNewMovie({ ...newMovie, image: e.target.value })} className="bg-secondary border-border text-foreground" required />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={newMovie.isTrending} onChange={(e) => setNewMovie({ ...newMovie, isTrending: e.target.checked })} />
                Trending
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={newMovie.isRecentlyAdded} onChange={(e) => setNewMovie({ ...newMovie, isRecentlyAdded: e.target.checked })} />
                Recently Added
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={uploading} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {uploading ? "Saving..." : editingMovie ? "Update Movie" : "Add Movie"}
              </Button>
              {editingMovie && (
                <Button type="button" variant="outline" onClick={() => { setEditingMovie(null); setNewMovie({ title: "", image: "", rating: 7.5, year: new Date().getFullYear(), category: "Action", streamlink: "", genre: "", isTrending: false, isRecentlyAdded: false }); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="space-y-2">
          {movies.map((movie) => (
            <div key={movie.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition">
              <img src={movie.image || "/placeholder.svg"} alt={movie.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{movie.title}</p>
                <p className="text-muted-foreground text-xs">{movie.category} · {movie.year} · ⭐ {movie.rating}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => handleEdit(movie)} className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30">Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(movie.id)} className="h-7 text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
