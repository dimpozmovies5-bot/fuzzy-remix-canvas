import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import MobileNav from "@/components/MobileNav";
import { Play } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  image: string;
  type: string;
  streamlink: string;
  genre?: string;
  rating?: number;
  episodes?: any[];
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchContent = async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        const [moviesSnap, seriesSnap, originalsSnap] = await Promise.all([
          get(ref(database, "movies")),
          get(ref(database, "series")),
          get(ref(database, "originals")),
        ]);

        const allContent: ContentItem[] = [];
        const searchLower = query.toLowerCase();

        const searchIn = (snap: any, type: string) => {
          if (snap.exists()) {
            Object.entries(snap.val()).forEach(([id, data]: [string, any]) => {
              if (
                data.title?.toLowerCase().includes(searchLower) ||
                data.genre?.toLowerCase().includes(searchLower)
              ) {
                allContent.push({ id, ...data, type });
              }
            });
          }
        };

        searchIn(moviesSnap, "movie");
        searchIn(seriesSnap, "series");
        searchIn(originalsSnap, "original");

        setResults(allContent);
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setLoading(false);
      }
    };

    searchContent();
  }, [query]);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar onFilterChange={() => {}} activeFilter="home" />

      <div className="flex-1 md:ml-16">
        <TopHeader />

        <main className="pt-16 px-4 md:px-6">
          <h1 className="text-xl font-bold text-foreground mb-4">
            Search Results for "{query}"
          </h1>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/play/${item.id}?type=${item.type}`)}
                  className="group relative text-left"
                >
                  <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "2/3" }}>
                    <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <Play className="w-5 h-5 text-accent-foreground" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-1.5 text-xs font-medium text-foreground line-clamp-2">{item.title}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {item.type} {item.rating && `• ⭐ ${item.rating.toFixed(1)}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
