import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref as dbRef, push, get, remove, update } from "firebase/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Copy } from "lucide-react";

interface Episode {
  episodeNumber: number;
  title: string;
  streamlink: string;
  season?: number;
}

interface Series {
  id: string;
  title: string;
  image: string;
  rating: number;
  year: number;
  category: string;
  episodes: Episode[];
  seasons?: number;
  isRecentlyAdded?: boolean;
}

const CATEGORIES = ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Fantasy", "Western", "Documentary", "Nigerian", "Ugandan", "Bongo", "Ghanaian", "Animation", "Special"];

const defaultForm = () => ({
  title: "", image: "", rating: 7.5, year: new Date().getFullYear(),
  category: "Action", seasons: 1,
  episodes: [{ episodeNumber: 1, title: "", streamlink: "", season: 1 }] as Episode[],
  isRecentlyAdded: false,
});

export default function AdminSeriesPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series[]>([]);
  const [newSeries, setNewSeries] = useState(defaultForm());
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const [bulkCount, setBulkCount] = useState(5);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) loadSeries();
  }, [isAdmin]);

  const loadSeries = async () => {
    try {
      const snapshot = await get(dbRef(database, "series"));
      if (snapshot.exists()) {
        setSeries(Object.entries(snapshot.val()).map(([id, value]: any) => ({ id, ...value })));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const seasonTabs = useMemo(() => {
    return Array.from({ length: newSeries.seasons }, (_, i) => i + 1);
  }, [newSeries.seasons]);

  const episodesForSeason = useMemo(() => {
    return newSeries.episodes.filter(ep => (ep.season || 1) === activeSeason);
  }, [newSeries.episodes, activeSeason]);

  const updateEpisode = (globalIndex: number, field: keyof Episode, value: any) => {
    const eps = [...newSeries.episodes];
    eps[globalIndex] = { ...eps[globalIndex], [field]: value };
    setNewSeries({ ...newSeries, episodes: eps });
  };

  const getGlobalIndex = (seasonEpIndex: number) => {
    let count = 0;
    for (let i = 0; i < newSeries.episodes.length; i++) {
      if ((newSeries.episodes[i].season || 1) === activeSeason) {
        if (count === seasonEpIndex) return i;
        count++;
      }
    }
    return -1;
  };

  const handleAddEpisode = () => {
    const seasonEps = newSeries.episodes.filter(ep => (ep.season || 1) === activeSeason);
    const nextEpNum = seasonEps.length > 0 ? Math.max(...seasonEps.map(e => e.episodeNumber)) + 1 : 1;
    setNewSeries({
      ...newSeries,
      episodes: [...newSeries.episodes, { episodeNumber: nextEpNum, title: "", streamlink: "", season: activeSeason }],
    });
  };

  const handleBulkAddEpisodes = () => {
    const seasonEps = newSeries.episodes.filter(ep => (ep.season || 1) === activeSeason);
    const startNum = seasonEps.length > 0 ? Math.max(...seasonEps.map(e => e.episodeNumber)) + 1 : 1;
    const newEps: Episode[] = Array.from({ length: bulkCount }, (_, i) => ({
      episodeNumber: startNum + i,
      title: `Episode ${startNum + i}`,
      streamlink: "",
      season: activeSeason,
    }));
    setNewSeries({ ...newSeries, episodes: [...newSeries.episodes, ...newEps] });
  };

  const handleRemoveEpisode = (globalIndex: number) => {
    setNewSeries({ ...newSeries, episodes: newSeries.episodes.filter((_, i) => i !== globalIndex) });
  };

  const handleClearSeason = () => {
    if (!confirm(`Remove all episodes from Season ${activeSeason}?`)) return;
    setNewSeries({
      ...newSeries,
      episodes: newSeries.episodes.filter(ep => (ep.season || 1) !== activeSeason),
    });
  };

  const handleDuplicateSeason = (fromSeason: number) => {
    const sourceEps = newSeries.episodes.filter(ep => (ep.season || 1) === fromSeason);
    const newSeasonNum = newSeries.seasons + 1;
    const duplicated = sourceEps.map(ep => ({
      ...ep,
      season: newSeasonNum,
      streamlink: "", // clear links so admin fills new ones
    }));
    setNewSeries({
      ...newSeries,
      seasons: newSeasonNum,
      episodes: [...newSeries.episodes, ...duplicated],
    });
    setActiveSeason(newSeasonNum);
  };

  const handleSeasonsChange = (newCount: number) => {
    const count = Math.max(1, newCount);
    setNewSeries({ ...newSeries, seasons: count });
    if (activeSeason > count) setActiveSeason(count);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeries.title.trim() || !newSeries.image.trim()) { alert("Fill required fields"); return; }
    if (newSeries.episodes.some((ep) => !ep.title.trim() || !ep.streamlink.trim())) { alert("Fill all episode details"); return; }

    setUploading(true);
    try {
      const data = {
        title: newSeries.title, image: newSeries.image,
        rating: Number(newSeries.rating), year: newSeries.year,
        category: newSeries.category, seasons: newSeries.seasons,
        episodes: newSeries.episodes, isRecentlyAdded: newSeries.isRecentlyAdded,
        ...(editingSeries ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() }),
      };

      if (editingSeries) {
        await update(dbRef(database, `series/${editingSeries.id}`), data);
        setSuccessMessage("Series updated!");
        setEditingSeries(null);
      } else {
        await push(dbRef(database, "series"), data);
        setSuccessMessage("Series added!");
      }

      setTimeout(() => setSuccessMessage(""), 3000);
      setNewSeries(defaultForm());
      setActiveSeason(1);
      loadSeries();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this series?")) {
      await remove(dbRef(database, `series/${id}`));
      setSuccessMessage("Series deleted!");
      setTimeout(() => setSuccessMessage(""), 3000);
      loadSeries();
    }
  };

  const episodeSummaryBySeason = useMemo(() => {
    const map: Record<number, number> = {};
    newSeries.episodes.forEach(ep => {
      const s = ep.season || 1;
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [newSeries.episodes]);

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Manage Series</h1>
          <Link to="/admin" className="text-primary hover:underline text-sm">← Back to Admin</Link>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-400 text-sm">{successMessage}</div>
        )}

        <Card className="bg-card border-border p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{editingSeries ? "Edit Series" : "Add New Series"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Series details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
                <Input value={newSeries.title} onChange={(e) => setNewSeries({ ...newSeries, title: e.target.value })} className="bg-secondary border-border text-foreground" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                <select value={newSeries.category} onChange={(e) => setNewSeries({ ...newSeries, category: e.target.value })} className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Poster URL *</label>
                <Input type="url" value={newSeries.image} onChange={(e) => setNewSeries({ ...newSeries, image: e.target.value })} className="bg-secondary border-border text-foreground" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rating</label>
                <Input type="number" min="0" max="10" step="0.1" value={newSeries.rating} onChange={(e) => setNewSeries({ ...newSeries, rating: parseFloat(e.target.value) })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                <Input type="number" value={newSeries.year} onChange={(e) => setNewSeries({ ...newSeries, year: parseInt(e.target.value) })} className="bg-secondary border-border text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Number of Seasons</label>
                <Input type="number" min="1" value={newSeries.seasons} onChange={(e) => handleSeasonsChange(parseInt(e.target.value) || 1)} className="bg-secondary border-border text-foreground" />
              </div>
            </div>

            {/* Season tabs */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm font-bold text-foreground mr-1">Seasons:</span>
                {seasonTabs.map(s => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={activeSeason === s ? "default" : "outline"}
                    onClick={() => setActiveSeason(s)}
                    className="h-8 px-3 text-xs relative"
                  >
                    S{s}
                    {episodeSummaryBySeason[s] ? (
                      <span className="ml-1 text-[10px] opacity-70">({episodeSummaryBySeason[s]})</span>
                    ) : null}
                  </Button>
                ))}
              </div>

              {/* Season actions bar */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Button type="button" size="sm" onClick={handleAddEpisode} variant="outline" className="h-8 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Episode to S{activeSeason}
                </Button>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-secondary border-border text-foreground w-16 h-8 text-xs"
                  />
                  <Button type="button" size="sm" onClick={handleBulkAddEpisodes} variant="outline" className="h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Bulk Add
                  </Button>
                </div>
                <Button type="button" size="sm" onClick={() => handleDuplicateSeason(activeSeason)} variant="outline" className="h-8 text-xs">
                  <Copy className="w-3 h-3 mr-1" /> Duplicate as New Season
                </Button>
                {episodesForSeason.length > 0 && (
                  <Button type="button" size="sm" onClick={handleClearSeason} variant="destructive" className="h-8 text-xs">
                    <Trash2 className="w-3 h-3 mr-1" /> Clear S{activeSeason}
                  </Button>
                )}
              </div>

              {/* Episodes list for active season */}
              {episodesForSeason.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No episodes in Season {activeSeason}. Add episodes above.</p>
              ) : (
                <div className="space-y-2">
                  {episodesForSeason.map((ep, seasonIdx) => {
                    const globalIdx = getGlobalIndex(seasonIdx);
                    return (
                      <div key={globalIdx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-1">
                          <label className="block text-[10px] text-muted-foreground mb-1">EP#</label>
                          <Input type="number" value={ep.episodeNumber} onChange={(e) => updateEpisode(globalIdx, 'episodeNumber', parseInt(e.target.value))} className="bg-secondary border-border text-foreground text-xs h-8" />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[10px] text-muted-foreground mb-1">Title</label>
                          <Input value={ep.title} onChange={(e) => updateEpisode(globalIdx, 'title', e.target.value)} className="bg-secondary border-border text-foreground text-xs h-8" />
                        </div>
                        <div className="col-span-6">
                          <label className="block text-[10px] text-muted-foreground mb-1">Stream Link</label>
                          <Input value={ep.streamlink} onChange={(e) => updateEpisode(globalIdx, 'streamlink', e.target.value)} className="bg-secondary border-border text-foreground text-xs h-8" />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleRemoveEpisode(globalIdx)} className="h-8 w-8 p-0">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overview of all seasons */}
            {newSeries.seasons > 1 && (
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-bold text-foreground mb-2">All Seasons Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {seasonTabs.map(s => (
                    <div
                      key={s}
                      onClick={() => setActiveSeason(s)}
                      className={`p-2 rounded border cursor-pointer text-xs transition-colors ${
                        activeSeason === s ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary/50 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <span className="font-medium">Season {s}</span>
                      <span className="block text-[10px] mt-0.5">{episodeSummaryBySeason[s] || 0} episodes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {uploading ? "Saving..." : editingSeries ? "Update Series" : "Add Series"}
            </Button>
          </form>
        </Card>

        {/* Existing series list */}
        <div className="space-y-2">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <img src={s.image || "/placeholder.svg"} alt={s.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{s.title}</p>
                <p className="text-muted-foreground text-xs">{s.category} · {s.seasons || 1} season{(s.seasons || 1) > 1 ? 's' : ''} · {s.episodes?.length || 0} eps</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => {
                  setEditingSeries(s);
                  setNewSeries({
                    title: s.title, image: s.image, rating: s.rating, year: s.year,
                    category: s.category, seasons: s.seasons || 1,
                    episodes: (s.episodes || []).map(ep => ({ ...ep, season: ep.season || 1 })),
                    isRecentlyAdded: s.isRecentlyAdded || false,
                  });
                  setActiveSeason(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30">Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)} className="h-7 text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
