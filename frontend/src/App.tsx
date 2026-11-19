import { HashRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BottomNav } from "./components/BottomNav";
import { ScrollToTop } from "./components/ScrollToTop";
import { Toaster } from "./components/ui/Toaster";
import Home from "./pages/Home";
import BusinessDirectory from "./pages/BusinessDirectory";
import BusinessProfile from "./pages/BusinessProfile";
import MemberDirectory, { MemberProfilePage } from "./pages/MemberDirectory";
import Opportunities from "./pages/Opportunities";
import OpportunityDetails from "./pages/OpportunityDetails";
import Dashboard from "./pages/Dashboard";
import Startups from "./pages/Startups";
import StartupProfile from "./pages/StartupProfile";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import { AuthPage, ComingSoon, ErrorBoundary, NotFound } from "./pages/Misc";
import { AuthResetPasswordPage, BusinessManagerPage, EditBusinessPage, EditProfilePage, EmailVerifiedPage, ListingPaymentPage } from "./pages/OwnerPages";
import AdminPanel from "./pages/AdminPanel";
import LegalPage from "./pages/LegalPages";

const roadmap = ["requirements", "collaboration", "jobs", "profile", "map", "achievements", "reviews", "help-center", "plans", "compare", "for-businesses", "for-startups"];

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-surface">
        <button
          type="button"
          onClick={() => document.getElementById("main")?.focus()}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900"
        >
          Skip to content
        </button>
        <Navbar />
        <main id="main" tabIndex={-1} className="outline-none">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/businesses" element={<BusinessDirectory />} />
              <Route path="/businesses/:slug" element={<BusinessProfile />} />
              <Route path="/startups" element={<Startups />} />
              <Route path="/startups/:slug" element={<StartupProfile />} />
              <Route path="/founders" element={<MemberDirectory kind="founders" />} />
              <Route path="/investors" element={<MemberDirectory kind="investors" />} />
              <Route path="/members/:id" element={<MemberProfilePage />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/opportunities/:slug" element={<OpportunityDetails />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:slug" element={<EventDetails />} />
              <Route path="/stories/*" element={<ComingSoon />} />
              <Route path="/membership/*" element={<ComingSoon />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/businesses/manage" element={<BusinessManagerPage />} />
              <Route path="/businesses/:id/edit" element={<EditBusinessPage />} />
              <Route path="/businesses/:id/payment" element={<ListingPaymentPage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/auth/verified" element={<EmailVerifiedPage />} />
              <Route path="/auth/reset-password" element={<AuthResetPasswordPage />} />
              <Route path="/terms-of-service" element={<LegalPage />} />
              <Route path="/terms-and-conditions" element={<LegalPage />} />
              <Route path="/privacy-policy" element={<LegalPage />} />
              <Route path="/refund-policy" element={<LegalPage />} />
              <Route path="/shipping-policy" element={<LegalPage />} />
              <Route path="/about-us" element={<LegalPage />} />
              <Route path="/contact-us" element={<LegalPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              {roadmap.map((r) => (
                <Route key={r} path={`/${r}/*`} element={<ComingSoon />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
        <BottomNav />
        <Toaster />
      </div>
    </HashRouter>
  );
}
