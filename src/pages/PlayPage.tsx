import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { Star, Download, Share2, ArrowLeft, Play, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { canDownload, recordDownload, getLimitInfo } from "@/lib/download-limits";

interface Episode {
  episodeNumber: number;
  title: string;
  streamlink: string;
  season?: number;
}

interface ContentData {
  id: string;
  title: string;
  image: string;
  rating: number;
  year: number;
  category?: string;
  genre?: string;
  description?: string;
  country?: string;
  streamlink?: string;
  episodes?: Episode[];
  createdAt?: string;
}

interface RelatedItem {
  id: string;
  title: string;
  image: string;
  rating: number;
  type: string;
  category?: string;
  genre?: string;
  episodes?: Episode[];
}

export default function PlayPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get("type") || "movie";
  const epNum = searchParams.get("ep");
  const { user, isAdmin } = useAuth();
  const { hasActiveSubscription, currentPlanId, subscription } = useSubscription();

  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<number>(epNum ? parseInt(epNum) : 1);
  const [currentSeason, setCurrentSeason] = useState<number>(1);
  const [related, setRelated] = useState<RelatedItem[]>([]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!hasActiveSubscription && !isAdmin) { navigate("/subscribe"); return; }

    const fetchContent = async () => {
      try {
        const path = type === "series" ? "series" : type === "original" ? "originals" : "movies";
        const snapshot = await get(ref(database, `${path}/${id}`));
        if (snapshot.exists()) {
          const raw = snapshot.val();
          // Normalize episodes: Firebase may return object or sparse array
          let episodes: Episode[] = [];
          if (raw.episodes) {
            if (Array.isArray(raw.episodes)) {
              episodes = raw.episodes.filter(Boolean).map((ep: any, i: number) => ({
                episodeNumber: (ep.episodeNumber != null) ? ep.episodeNumber : (i + 1),
                title: ep.title || `Episode ${(ep.episodeNumber != null) ? ep.episodeNumber : (i + 1)}`,
                streamlink: ep.streamlink || ep.streamLink || ep.link || "",
                season: ep.season ? Number(ep.season) : 1,
              }));
            } else {
              episodes = Object.entries(raw.episodes).map(([key, ep]: [string, any]) => ({
                episodeNumber: (ep.episodeNumber != null) ? ep.episodeNumber : (parseInt(key) || 1),
                title: ep.title || `Episode ${(ep.episodeNumber != null) ? ep.episodeNumber : key}`,
                streamlink: ep.streamlink || ep.streamLink || ep.link || "",
                season: ep.season ? Number(ep.season) : 1,
              }));
            }
          }
          const data: ContentData = { id: id!, ...raw, episodes };
          console.log("Series data loaded:", data.title, "Episodes:", episodes.length, episodes);
          setContent(data);
          fetchRelated(data);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, type, user, hasActiveSubscription, isAdmin, navigate]);

  const fetchRelated = async (currentContent: ContentData) => {
    try {
      const paths = ["movies", "series", "originals"];
      const allRelated: RelatedItem[] = [];

      for (const path of paths) {
        const snap = await get(ref(database, path));
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([key, value]: [string, any]) => {
            if (key === id) return;
            const itemCategory = (value.category || "").toLowerCase();
            const itemGenre = (value.genre || "").toLowerCase();
            const contentCategory = (currentContent.category || "").toLowerCase();
            const contentGenre = (currentContent.genre || "").toLowerCase();

            const isRelated =
              (contentCategory && itemCategory === contentCategory) ||
              (contentGenre && contentGenre.split(",").some((g: string) => itemGenre.includes(g.trim())));

            if (isRelated) {
              allRelated.push({
                id: key, title: value.title, image: value.image, rating: value.rating || 0,
                type: path === "movies" ? "movie" : path === "series" ? "series" : "original",
                category: value.category, genre: value.genre, episodes: value.episodes,
              });
            }
          });
        }
      }
      setRelated(allRelated.slice(0, 12));
    } catch (error) {
      console.error("Error fetching related:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const getStreamUrl = () => {
    if (type === "series" && content.episodes?.length) {
      const ep = content.episodes.find(
        (e) => e.episodeNumber === currentEpisode && (e.season || 1) === currentSeason
      );
      return ep?.streamlink || content.streamlink || "";
    }
    return content.streamlink || "";
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch?.[1]) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    }
    return url;
  };

  const extractFileId = (url: string): string | null => {
    if (url.includes("drive.google.com")) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      return match?.[1] || null;
    }
    return null;
  };

  const getDownloadFilename = () => {
    if (type === "series" && content.episodes?.length) {
      const ep = content.episodes.find(
        (e) => e.episodeNumber === currentEpisode && (e.season || 1) === currentSeason
      );
      return `${content.title} - S${currentSeason}EP${currentEpisode} (LUO CINEMA).mp4`;
    }
    return `${content.title} (LUO CINEMA).mp4`;
  };

  const getDownloadUrl = (url: string) => {
    const fileId = extractFileId(url);
    if (fileId) {
      // Native Google Drive download endpoint — bypasses the Drive viewer/app
      return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    }
    return url;
  };

  const isContentNew = () => {
    if (!content?.createdAt) return false;
    const created = new Date(content.createdAt).getTime();
    const now = Date.now();
    return (now - created) < 48 * 60 * 60 * 1000; // within 48 hours
  };

  const handleDownload = async () => {
    if (downloading) return;
    if (!isAdmin) {
      const contentKey = isSeries ? `${id}-s${currentSeason}e${currentEpisode}` : `${id}`;
      const check = canDownload(currentPlanId, contentKey);
      if (!check.ok) {
        toast.error(check.reason || "Download limit reached");
        return;
      }
      recordDownload(currentPlanId, contentKey);
      const info = getLimitInfo(currentPlanId);
      if (info) {
        const remaining = Math.max(0, info.max - info.used - 1);
        toast.success(
          info.scope === "daily"
            ? `${remaining} downloads left today.`
            : `${remaining} downloads left on this plan.`
        );
      }
    }

    const url = getDownloadUrl(getStreamUrl());
    setDownloading(true);
    // Open the Google Drive consent/download flow as an in-page popin
    setDownloadUrl(url);
    setDownloading(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Watch ${content.title} on LUO CINEMA`;
    if (navigator.share) {
      try { await navigator.share({ title: content.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const streamUrl = getStreamUrl();
  const isSeries = type === "series" && content.episodes && content.episodes.length > 0;

  // Derive available seasons and filter episodes by current season
  const availableSeasons = isSeries
    ? [...new Set(content.episodes!.map((ep) => ep.season || 1))].sort((a, b) => a - b)
    : [];
  const hasMultipleSeasons = availableSeasons.length > 1;
  const filteredEpisodes = isSeries
    ? content.episodes!.filter((ep) => (ep.season || 1) === currentSeason)
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 bg-card/80 backdrop-blur-sm border border-border rounded-lg text-sm text-foreground hover:bg-secondary transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Desktop: Player + Episodes side by side */}
      <div className={`${isSeries ? "md:flex" : ""}`}>
        {/* Video Player */}
        <div className={`${isSeries ? "md:flex-1" : "w-full"}`}>
          {streamUrl && (
            <div className="relative w-full bg-background" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
              <iframe
                src={getEmbedUrl(streamUrl)}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ border: "none" }}
              />
              {/* Block Google Drive popout icon (top-right) */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="absolute top-0 right-0 w-14 h-14 z-20 flex items-center justify-center rounded-full bg-card/90 backdrop-blur-sm border border-border cursor-pointer hover:bg-primary/20 transition disabled:opacity-60"
                title={downloading ? "Downloading..." : "Download"}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-primary" />
                )}
              </button>
              <div
                className="absolute bottom-0 right-0 w-14 h-10 z-20"
                style={{ background: "transparent" }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              />
            </div>
          )}
        </div>

        {/* Episodes sidebar on desktop - small grid boxes */}
        {isSeries && (
          <div className="hidden md:block w-64 lg:w-72 bg-card border-l border-border overflow-y-auto" style={{ maxHeight: "70vh" }}>
            <div className="p-2 border-b border-border">
              <h3 className="text-foreground font-bold text-xs">Episodes</h3>
            </div>
            {hasMultipleSeasons && (
              <div className="p-1.5 flex gap-1 border-b border-border overflow-x-auto">
                {availableSeasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setCurrentSeason(s); const firstEp = content.episodes!.find((ep) => (ep.season || 1) === s); if (firstEp) setCurrentEpisode(firstEp.episodeNumber); }}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium whitespace-nowrap transition ${
                      currentSeason === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    S{s}
                  </button>
                ))}
              </div>
            )}
            <div className="p-1.5 grid grid-cols-5 gap-1">
              {filteredEpisodes.map((ep) => (
                <button
                  key={ep.episodeNumber}
                  onClick={() => setCurrentEpisode(ep.episodeNumber)}
                  className={`flex items-center justify-center rounded text-center transition aspect-square ${
                    currentEpisode === ep.episodeNumber
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-muted text-foreground border border-border"
                  }`}
                  title={ep.title}
                >
                  <span className="text-[9px] font-bold leading-none">{ep.episodeNumber}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons below player */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {streamUrl && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-primary-foreground rounded-lg text-sm font-medium transition shadow-lg shadow-primary/20"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? "Preparing..." : "Download"}
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* Content Info */}
      <div className="px-4 py-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">{content.title}</h1>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-foreground font-bold text-sm">{content.rating}</span>
          </div>
          <span className="text-muted-foreground text-sm">{content.year}</span>
          <span className="text-muted-foreground text-sm">{content.category || content.genre}</span>
        </div>
        {content.description && (
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">{content.description}</p>
        )}

        {/* Episodes on mobile - grid */}
        {isSeries && (
          <div className="md:hidden mb-6">
            <h3 className="text-foreground font-bold text-sm mb-3">Episodes</h3>
            {hasMultipleSeasons && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
                {availableSeasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setCurrentSeason(s); const firstEp = content.episodes!.find((ep) => (ep.season || 1) === s); if (firstEp) setCurrentEpisode(firstEp.episodeNumber); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                      currentSeason === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Season {s}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-7 xs:grid-cols-8 sm:grid-cols-10 gap-1.5">
              {filteredEpisodes.map((ep) => (
                <button
                  key={ep.episodeNumber}
                  onClick={() => setCurrentEpisode(ep.episodeNumber)}
                  className={`flex items-center justify-center rounded border text-center transition aspect-square ${
                    currentEpisode === ep.episodeNumber
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50 text-foreground"
                  }`}
                  title={ep.title}
                >
                  <span className="text-[9px] font-bold leading-none">{ep.episodeNumber}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Content */}
      {related.length > 0 && (
        <div className="px-4 pb-20 md:pb-6">
          <h3 className="text-foreground font-bold text-sm mb-3">Related</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-2.5">
            {related.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.type === "series" && item.episodes?.length) {
                    navigate(`/play/${item.id}?type=series&ep=1`);
                  } else {
                    navigate(`/play/${item.id}?type=${item.type}`);
                  }
                }}
                className="flex flex-col items-center group"
              >
                <div className="relative bg-card w-full hover:scale-105 transition-transform duration-200 border border-border/50 rounded-sm overflow-hidden">
                  <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[8px] text-yellow-400 font-bold">{item.rating}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-foreground text-[8px] md:text-[10px] font-medium text-center line-clamp-2 leading-tight w-full px-0.5">
                  {item.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download popin — Google Drive consent inside the watch page */}
      {downloadUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setDownloadUrl(null)}
        >
          <div
            className="relative w-full max-w-2xl h-[80vh] bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/60">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground truncate">
                  Downloading: {getDownloadFilename()}
                </h3>
              </div>
              <button
                onClick={() => setDownloadUrl(null)}
                className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-foreground transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={downloadUrl}
              title="Google Drive download"
              className="flex-1 w-full bg-white"
              style={{ border: "none" }}
              allow="downloads"
            />
            <div className="px-4 py-2 border-t border-border bg-background/60 text-[11px] text-muted-foreground text-center">
              If the download doesn't start automatically, tap the Google Drive download button above.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
