import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import MobileNav from "@/components/MobileNav";
import HeroCarousel from "@/components/HeroCarousel";
import PopularGrid from "@/components/PopularGrid";
import CategoriesRow from "@/components/CategoriesRow";
import AuthModal from "@/components/AuthModal";
import SubscriptionModal from "@/components/SubscriptionModal";
import NewContentToast from "@/components/NewContentToast";
import AgentBanner from "@/components/AgentBanner";
import EasterBanner from "@/components/EasterBanner";
import { useAuth } from "@/lib/auth-context";
import { trackNavigation } from "@/lib/track-navigation";

const Index = () => {
  const [activeFilter, setActiveFilter] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { user } = useAuth();

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setSearchQuery("");
    setCategoryFilter("all");
    if (user) trackNavigation(user.uid, filter, user.email || undefined);
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden max-w-[100vw]">
      <Sidebar onFilterChange={handleFilterChange} activeFilter={activeFilter} onShowSubscription={() => setShowSubscriptionModal(true)} />

      <div className="flex-1 md:ml-[72px] flex flex-col min-w-0 overflow-x-hidden">
        <TopHeader
          onSearch={(q) => {
            setSearchQuery(q);
            setActiveFilter("search");
          }}
        />

        <main className="flex-1 pt-14 px-3 md:px-5 lg:px-6 overflow-x-hidden">
          <EasterBanner />
          {activeFilter === "home" && (
            <div className="space-y-3">
              <HeroCarousel />
              <CategoriesRow
                onSelectCategory={setCategoryFilter}
                activeCategory={categoryFilter}
              />
            </div>
          )}
          <PopularGrid
            activeFilter={activeFilter}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            onShowSubscription={() => setShowSubscriptionModal(true)}
            onRequireAuth={() => setShowAuthModal(true)}
          />
        </main>

        <MobileNav onFilterChange={handleFilterChange} activeFilter={activeFilter} onShowSubscription={() => setShowSubscriptionModal(true)} />
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      <NewContentToast />
      <AgentBanner onUpgrade={() => setShowSubscriptionModal(true)} />

    </div>
  );
};

export default Index;
