import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import PlayPage from "./pages/PlayPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import SubscribePage from "./pages/SubscribePage";
import AdminPage from "./pages/AdminPage";
import AdminMoviesPage from "./pages/AdminMoviesPage";
import AdminSeriesPage from "./pages/AdminSeriesPage";
import AdminMusicPage from "./pages/AdminMusicPage";
import AdminAnimationPage from "./pages/AdminAnimationPage";
import AdminCarouselPage from "./pages/AdminCarouselPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminWalletPage from "./pages/AdminWalletPage";
import AdminActivityPage from "./pages/AdminActivityPage";
import AdminAgentsPage from "./pages/AdminAgentsPage";
import RouteTracker from "./components/RouteTracker";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <RouteTracker />
            
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/play/:id" element={<PlayPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/subscribe" element={<SubscribePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/movies" element={<AdminMoviesPage />} />
              <Route path="/admin/series" element={<AdminSeriesPage />} />
              <Route path="/admin/music" element={<AdminMusicPage />} />
              <Route path="/admin/animation" element={<AdminAnimationPage />} />
              <Route path="/admin/carousel" element={<AdminCarouselPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/wallet" element={<AdminWalletPage />} />
              <Route path="/admin/activity" element={<AdminActivityPage />} />
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
