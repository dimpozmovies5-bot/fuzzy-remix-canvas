interface CategoriesRowProps {
  onSelectCategory: (category: string) => void;
  activeCategory: string;
}

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi",
  "Thriller", "Fantasy", "Western", "Documentary", "Nigerian",
  "Ugandan", "Bongo", "Ghanaian",
];

export default function CategoriesRow({ onSelectCategory, activeCategory }: CategoriesRowProps) {
  return (
    <div className="mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
      <div className="flex gap-1.5 w-max py-1">
        <button
          onClick={() => onSelectCategory("all")}
          className={`px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 whitespace-nowrap ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          All
        </button>
        {GENRES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 whitespace-nowrap ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
