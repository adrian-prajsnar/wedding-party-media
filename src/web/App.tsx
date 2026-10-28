import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Chrome";
import { Footer } from "./components/Footer";
import { GuestGate } from "./components/GuestGate";
import { ConfigProvider } from "./config";
import { copy } from "./i18n";
import { AdminPage } from "./pages/AdminPage";
import { GuestDeniedPage } from "./pages/GuestDeniedPage";
import { GalleryPage } from "./pages/GalleryPage";
import { QrPage } from "./pages/QrPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { UploadPage } from "./pages/UploadPage";

export function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <Shell />
      </ConfigProvider>
    </BrowserRouter>
  );
}

function Shell() {
  const location = useLocation();
  return (
    <>
      <a className="skip-link" href="#tresc">
        {copy.skip}
      </a>
      <div className="page-wash" aria-hidden="true" />
      <Header />
      <main id="tresc">
        <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/unauthorized" element={<GuestDeniedPage />} />
            <Route path="/brak-dostepu" element={<Navigate to="/unauthorized" replace />} />
            <Route
              path="/"
              element={
                <GuestGate>
                  <GalleryPage />
                </GuestGate>
              }
            />
            <Route
              path="/upload"
              element={
                <GuestGate>
                  <UploadPage />
                </GuestGate>
              }
            />
            <Route path="/dodaj" element={<Navigate to="/upload" replace />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/qr" element={<QrPage />} />
            <Route path="/admin/kody" element={<Navigate to="/admin/qr" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </>
  );
}
