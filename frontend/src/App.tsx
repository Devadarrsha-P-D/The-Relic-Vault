import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import Hero3DBackground from "./components/Hero3DBackground";
import { MarketplaceGallery } from "./pages/MarketplaceGallery";
import { MintPage } from "./pages/MintPage";
import { CardDetail } from "./pages/CardDetail";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";

function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <Hero3DBackground />
        <Header />
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-10">
          <Routes>
            <Route path="/" element={<MarketplaceGallery />} />
            <Route path="/card/:tokenId" element={<CardDetail />} />
            <Route path="/mint" element={<MintPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;