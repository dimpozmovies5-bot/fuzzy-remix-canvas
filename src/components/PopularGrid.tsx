import React, { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue, get } from "firebase/database";
import { ChevronRight } from "lucide-react";
import { Play, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-context";
import { Check } from "lucide-react";

interface Episode {
  episodeNumber: number;
  title: string;
  streamlink: string;
  season?: number;
}

interface Movie {
  id: string;
  title: string;
  year: number;
  rating: number;
  image: string;
  category?: string;
  type?: string;
  isTrending?: boolean;
  createdAt?: string;
  updatedAt?: string;
  streamlink?: string;
  genre?: string;
  episodes?: Episode[];
  seasons?: number;
}

interface PopularGridProps {
  activeFilter?: string;
  searchQuery?: string;
  onShowSubscription: () => void;
  onRequireAuth?: () => void;
  categoryFilter?: string;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ITEMS_PER_PAGE = 8;

export default function PopularGrid({
  activeFilter = "home",
  searchQuery = "",
  onShowSubscription,
  onRequireAuth,
  categoryFilter = "all",
}: PopularGridProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<Movie | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { hasActiveSubscription } = useSubscription();

  useEffect(() => {
    setSelectedSeries(null);
    setSelectedSeason(1);
    setShowAllEpisodes(false);
  }, [activeFilter, searchQuery, categoryFilter]);

  // Open subscription modal when subscription filter is selected
  useEffect(() => {
    if (activeFilter === "subscription") {
      onShowSubscription();
    }
  }, [activeFilter]);

  useEffect(() => {
    const fetchContent = () => {
      setLoading(true);

      if (activeFilter === "search" && searchQuery) {
        const searchContent = async () => {
          try {
            const [moviesSnap, seriesSnap, originalsSnap] = await Promise.all([
              get(ref(database, "movies")),
              get(ref(database, "series")),
              get(ref(database, "originals")),
            ]);

            const allContent: Movie[] = [];
            const searchLower = searchQuery.toLowerCase();

            const searchInPath = (snap: any, type: string) => {
              if (snap.exists()) {
                Object.entries(snap.val()).forEach(([id, data]: [string, any]) => {
                  if (
                    data.title?.toLowerCase().includes(searchLower) ||
                    data.genre?.toLowerCase().includes(searchLower) ||
                    data.category?.toLowerCase().includes(searchLower)
                  ) {
                    allContent.push({ id, ...data, type });
                  }
                });
              }
            };

            searchInPath(moviesSnap, "movie");
            searchInPath(seriesSnap, "series");
            searchInPath(originalsSnap, "original");

            setMovies(allContent);
            setLoading(false);
          } catch (error) {
            console.error("Error searching:", error);
            setLoading(false);
          }
        };
        searchContent();
        return;
      }

      let paths: string[] = [];
      if (activeFilter === "movies") paths = ["movies"];
      else if (activeFilter === "series") paths = ["series"];
      else if (activeFilter === "anime") paths = ["movies"];
      else paths = ["movies", "series", "originals"];

      const unsubscribes: (() => void)[] = [];
      const allContent: Movie[] = [];
      const addedIds = new Set<string>();
      let pathsLoaded = 0;
      const totalPaths = paths.length;

      const processAndSetContent = () => {
        pathsLoaded++;
        if (pathsLoaded === totalPaths) {
          let filteredContent = allContent;

          if (activeFilter === "anime") {
            filteredContent = filteredContent.filter((item) => item.category?.toLowerCase() === "animation");
          } else if (activeFilter === "music") {
            filteredContent = filteredContent.filter((item) => item.category?.toLowerCase() === "music");
          } else if (activeFilter === "top-rated") {
            filteredContent = filteredContent.filter((item) => item.rating >= 4);
          }

          filteredContent.sort((a, b) => {
            const dateA = Math.max(
              a.updatedAt ? new Date(a.updatedAt).getTime() : 0,
              a.createdAt ? new Date(a.createdAt).getTime() : 0
            );
            const dateB = Math.max(
              b.updatedAt ? new Date(b.updatedAt).getTime() : 0,
              b.createdAt ? new Date(b.createdAt).getTime() : 0
            );
            return dateB - dateA;
          });

          setMovies(filteredContent);
          setLoading(false);
        }
      };

      paths.forEach((path) => {
        const dbRef = ref(database, path);
        const unsubscribe = onValue(dbRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.entries(data).forEach(([key, value]: [string, any]) => {
              if (!addedIds.has(key)) {
                allContent.push({
                  id: key,
                  type: path === "movies" ? "movie" : path === "series" ? "series" : "original",
                  ...value,
                });
                addedIds.add(key);
              }
            });
          }
          processAndSetContent();
        });
        unsubscribes.push(unsubscribe);
      });

      return () => unsubscribes.forEach((unsub) => unsub());
    };

    const unsubscribe = fetchContent();
    return unsubscribe;
  }, [activeFilter, searchQuery]);

  const handlePosterClick = (movie: Movie) => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!hasActiveSubscription && !isAdmin) {
      onShowSubscription();
      return;
    }
    const type = movie.type || "movie";
    if (type === "series" && movie.episodes?.length) {
      navigate(`/play/${movie.id}?type=series&ep=1`);
    } else {
      navigate(`/play/${movie.id}?type=${type}`);
    }
  };

  // Apply category filter
  const filteredMovies = categoryFilter === "all"
    ? movies
    : movies.filter((m) =>
        m.category?.toLowerCase() === categoryFilter.toLowerCase() ||
        m.genre?.toLowerCase().includes(categoryFilter.toLowerCase())
      );

  // Recently added (last 2 days)
  const now = Date.now();
  const recentlyAdded = filteredMovies.filter((m) => {
    if (!m.createdAt) return false;
    return now - new Date(m.createdAt).getTime() < TWO_DAYS_MS;
  });

  // Latest episodes - series with updatedAt or createdAt within last 7 days
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const latestEpisodes = filteredMovies.filter((m) => {
    if (m.type !== "series" || !m.episodes || m.episodes.length === 0) return false;
    const timestamp = m.updatedAt || m.createdAt;
    if (!timestamp) return false;
    return now - new Date(timestamp).getTime() < SEVEN_DAYS_MS;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (activeFilter === "subscription") {
    return null;
  }

  const getTitle = () => {
    if (activeFilter === "search") return `Search Results for "${searchQuery}"`;
    if (activeFilter === "movies") return "Movies";
    if (activeFilter === "series") return "Series";
    if (activeFilter === "anime") return "Anime";
    if (activeFilter === "music") return "Music";
    if (activeFilter === "top-rated") return "Top Rated";
    return "Popular on LUO CINEMA";
  };

  if (selectedSeries) {
    const episodes = selectedSeries.episodes || [];
    const episodesArray = Array.isArray(episodes) ? episodes : Object.values(episodes) as Episode[];
    const seasonNumbers = [...new Set(episodesArray.map(ep => ep.season || 1))].sort((a, b) => a - b);
    const hasMultipleSeasons = seasonNumbers.length > 1 || (selectedSeries.seasons && selectedSeries.seasons > 1);
    const filteredEpisodes = hasMultipleSeasons
      ? episodesArray.filter(ep => (ep.season || 1) === selectedSeason)
      : episodesArray;

    return (
      <div className="mb-4 pb-16 md:pb-0">
        <button onClick={() => { setSelectedSeries(null); setSelectedSeason(1); }} className="text-primary text-sm mb-3 hover:underline">
          ← Back to list
        </button>
        <h2 className="text-lg font-bold text-foreground mb-1">{selectedSeries.title}</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {seasonNumbers.length} Season{seasonNumbers.length > 1 ? 's' : ''} · {episodesArray.length} Episode{episodesArray.length !== 1 ? 's' : ''}
        </p>

        {hasMultipleSeasons && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {seasonNumbers.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSeason(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedSeason === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Season {s}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredEpisodes.map((ep, idx) => (
            <button
              key={`${ep.season || 1}-${ep.episodeNumber}-${idx}`}
              onClick={() => {
                if (!user) { onRequireAuth?.(); return; }
                if (!hasActiveSubscription && !isAdmin) { onShowSubscription(); return; }
                navigate(`/play/${selectedSeries.id}?type=series&ep=${ep.episodeNumber}&season=${ep.season || 1}`);
              }}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Episode {ep.episodeNumber}</p>
                <p className="text-xs text-muted-foreground">{ep.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // For search or specific filters, show flat grid
  if (activeFilter !== "home") {
    return (
      <div className="mb-4 pb-16 md:pb-0">
        <h2 className="text-sm font-bold text-foreground mb-3">{getTitle()}</h2>
        {filteredMovies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No content found</p>
          </div>
        ) : (
          <ContentGrid
            items={filteredMovies}
            onPosterClick={handlePosterClick}
            onSelectSeries={setSelectedSeries}
            user={user}
            onRequireAuth={onRequireAuth}
            onShowSubscription={onShowSubscription}
            hasActiveSubscription={hasActiveSubscription}
            isAdmin={isAdmin}
          />
        )}
      </div>
    );
  }

  // Home view: Recently Added + Latest Episodes + Popular
  return (
    <div className="mb-4 pb-16 md:pb-0 space-y-6">
      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">🆕 Recently Added</h2>
          <ContentGrid
            items={recentlyAdded}
            onPosterClick={handlePosterClick}
            onSelectSeries={setSelectedSeries}
            user={user}
            onRequireAuth={onRequireAuth}
            onShowSubscription={onShowSubscription}
            hasActiveSubscription={hasActiveSubscription}
            isAdmin={isAdmin}
            showDateBadge
          />
        </section>
      )}

      {/* Latest Episodes - each episode shown independently */}
      {latestEpisodes.length > 0 && (() => {
        // Only show the latest added episode per series, sorted by most recent first
        const allEps = latestEpisodes.map((series) => {
          const eps = Array.isArray(series.episodes) ? series.episodes : Object.values(series.episodes || {}) as Episode[];
          // Pick the most recently added episode (by timestamp or highest episode number)
          const sorted = [...eps].sort((a, b) => {
            const tsA = (a as any).createdAt || (a as any).addedAt || "";
            const tsB = (b as any).createdAt || (b as any).addedAt || "";
            if (tsA && tsB) {
              const diff = new Date(tsB).getTime() - new Date(tsA).getTime();
              if (diff !== 0) return diff;
            }
            // Prefer newer season, then higher episode number (surfaces newly added seasons)
            const seasonDiff = (b.season || 1) - (a.season || 1);
            if (seasonDiff !== 0) return seasonDiff;
            return b.episodeNumber - a.episodeNumber;
          });
          return sorted.length > 0 ? { series, ep: sorted[0] } : null;
        }).filter(Boolean as unknown as (v: any) => v is { series: any; ep: Episode }).sort((a, b) => {
          const epTsA = (a.ep as any).createdAt || (a.ep as any).addedAt || a.series.updatedAt || a.series.createdAt || "";
          const epTsB = (b.ep as any).createdAt || (b.ep as any).addedAt || b.series.updatedAt || b.series.createdAt || "";
          return new Date(epTsB).getTime() - new Date(epTsA).getTime();
        });
        const visibleEps = showAllEpisodes ? allEps : allEps.slice(0, 8);

        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">📺 New Episodes</h2>
              {allEps.length > 8 && (
                <button
                  onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                  className="flex items-center gap-0.5 text-xs text-primary font-medium hover:underline"
                >
                  {showAllEpisodes ? "Show Less" : "More"}
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllEpisodes ? "rotate-90" : ""}`} />
                </button>
              )}
            </div>
            {!showAllEpisodes ? (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {visibleEps.map(({ series, ep }, idx) => (
                  <button
                    key={`${series.id}-s${ep.season || 1}-e${ep.episodeNumber}-${idx}`}
                    onClick={() => {
                      if (!user) { onRequireAuth?.(); return; }
                      if (!hasActiveSubscription && !isAdmin) { onShowSubscription(); return; }
                      navigate(`/play/${series.id}?type=series&ep=${ep.episodeNumber}&season=${ep.season || 1}`);
                    }}
                    className="flex-shrink-0 w-[100px] md:w-[120px] flex flex-col items-center group focus:outline-none"
                  >
                    <div className="relative bg-card w-full hover:scale-105 transition-all duration-200 border-2 border-transparent rounded-lg overflow-hidden group-focus:border-primary group-active:border-primary hover:border-[hsl(var(--glow))] hover:shadow-[0_0_12px_hsl(var(--glow)/0.4)]">
                      <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
                        <div className="absolute inset-0 bg-secondary" />
                        <img src={series.image || "/placeholder.svg"} alt={`${series.title} S${ep.season || 1} E${ep.episodeNumber}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute top-1 right-1 px-2 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[9px] md:text-[10px] font-bold rounded-md shadow-lg border border-primary-foreground/20">
                          S{ep.season || 1} E{ep.episodeNumber}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <p className="text-[9px] md:text-[10px] text-foreground font-bold leading-tight truncate drop-shadow-lg">{series.title}</p>
                          <p className="text-[7px] md:text-[8px] text-foreground/70 truncate">{ep.title}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-2.5 w-full overflow-hidden">
                {allEps.map(({ series, ep }, idx) => (
                  <button
                    key={`${series.id}-s${ep.season || 1}-e${ep.episodeNumber}-${idx}`}
                    onClick={() => {
                      if (!user) { onRequireAuth?.(); return; }
                      if (!hasActiveSubscription && !isAdmin) { onShowSubscription(); return; }
                      navigate(`/play/${series.id}?type=series&ep=${ep.episodeNumber}&season=${ep.season || 1}`);
                    }}
                    className="flex flex-col items-center group focus:outline-none"
                  >
                    <div className="relative bg-card w-full hover:scale-105 transition-all duration-200 border-2 border-transparent rounded-lg overflow-hidden group-focus:border-primary group-active:border-primary hover:border-[hsl(var(--glow))] hover:shadow-[0_0_12px_hsl(var(--glow)/0.4)]">
                      <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
                        <div className="absolute inset-0 bg-secondary" />
                        <img src={series.image || "/placeholder.svg"} alt={`${series.title} S${ep.season || 1} E${ep.episodeNumber}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute top-1 right-1 px-2 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[9px] md:text-[10px] font-bold rounded-md shadow-lg border border-primary-foreground/20">
                          S{ep.season || 1} E{ep.episodeNumber}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <p className="text-[9px] md:text-[10px] text-foreground font-bold leading-tight truncate drop-shadow-lg">{series.title}</p>
                          <p className="text-[7px] md:text-[8px] text-foreground/70 truncate">{ep.title}</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-foreground text-[8px] md:text-[10px] font-medium text-center line-clamp-2 leading-tight w-full px-0.5">{series.title}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* Popular */}
      <section>
        <h2 className="text-sm font-bold text-foreground mb-3">🔥 Popular on LUO CINEMA</h2>
        {filteredMovies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No content found</p>
          </div>
        ) : (
          <ContentGrid
            items={filteredMovies}
            onPosterClick={handlePosterClick}
            onSelectSeries={setSelectedSeries}
            user={user}
            onRequireAuth={onRequireAuth}
            onShowSubscription={onShowSubscription}
            hasActiveSubscription={hasActiveSubscription}
            isAdmin={isAdmin}
          />
        )}
      </section>
    </div>
  );
}

function getDateBadge(createdAt?: string): string | null {
  if (!createdAt) return null;
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return `${diffDays} days ago`;
  return null;
}

interface ContentGridProps {
  items: Movie[];
  onPosterClick: (movie: Movie) => void;
  onSelectSeries: (movie: Movie) => void;
  user: any;
  onRequireAuth?: () => void;
  onShowSubscription: () => void;
  hasActiveSubscription: boolean;
  isAdmin: boolean;
  showDateBadge?: boolean;
}

function ContentGrid({ items, onPosterClick, onSelectSeries, showDateBadge }: ContentGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-2.5 w-full overflow-hidden">
      {items.map((movie) => {
        const badge = showDateBadge ? getDateBadge(movie.createdAt) : null;
        return (
          <button
            key={movie.id}
            onClick={() => onPosterClick(movie)}
            className="flex flex-col items-center group focus:outline-none"
          >
            <div className="relative bg-card w-full hover:scale-105 transition-all duration-200 border-2 border-transparent rounded-lg overflow-hidden group-focus:border-green-500 group-active:border-green-500 hover:border-[hsl(var(--glow))] hover:shadow-[0_0_12px_hsl(var(--glow)/0.4)]">
              <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
                <div className="absolute inset-0 bg-secondary" />
                <img
                  src={movie.image || "/placeholder.svg"}
                  alt={movie.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-[8px] text-yellow-400 font-bold">{movie.rating}</span>
                </div>
                {badge && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-[7px] font-bold rounded">
                    {badge}
                  </div>
                )}
                {(() => {
                  if (!movie.createdAt) return null;
                  const isNew = Date.now() - new Date(movie.createdAt).getTime() < 48 * 60 * 60 * 1000;
                  if (!isNew) return null;
                  return (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[7px] font-bold rounded animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)]">
                      NEW
                    </div>
                  );
                })()}
                {movie.type === "series" && movie.episodes && (() => {
                  const eps = Array.isArray(movie.episodes) ? movie.episodes : Object.values(movie.episodes) as Episode[];
                  if (eps.length === 0) return null;
                  const latestSeason = movie.seasons || Math.max(...eps.map((e: Episode) => e.season || 1));
                  const latestSeasonEps = eps.filter((e: Episode) => (e.season || 1) === latestSeason).length;
                  return (
                    <div className="absolute top-1 right-1 px-2 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[9px] md:text-[10px] font-bold rounded-md shadow-lg border border-primary-foreground/20">
                      S{latestSeason} · {latestSeasonEps}ep
                    </div>
                  );
                })()}
              </div>
            </div>
            <p className="mt-1 text-foreground text-[8px] md:text-[10px] font-medium text-center line-clamp-2 leading-tight w-full px-0.5">
              {movie.title}
            </p>
          </button>
        );
      })}
    </div>
  );
}
