import { Component, useEffect, type ReactNode } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Compass, Construction } from "lucide-react";
import { AuthForm } from "../components/ui/AuthForm";
import { useStore } from "../store";

/* ---------- Auth page ---------- */
export function AuthPage() {
  const user = useStore((s) => s.user);
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  useEffect(() => {
    document.title = "Sign in — WS Hub";
  }, []);
  if (user) return <Navigate to={next} replace />;
  return (
    <div className="page-in relative overflow-hidden bg-navy-900 py-14">
      <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 to-navy-950" />
      <div className="relative mx-auto grid max-w-[1000px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div className="text-white">
          <h1 className="text-[36px] font-black leading-tight">Join <span className="text-gold-500">WS Hub</span></h1>
          <p className="mt-3 max-w-md text-[14px] text-white/85">One membership to connect with 1,250+ businesses, 700+ founders and 95+ investors across Warangal.</p>
          <ul className="mt-5 space-y-2 text-[13px] text-white/80">
            {["Send connection & introduction requests", "Apply to funding, grants and tenders", "Save profiles and track everything in your dashboard", "Get notified when investors view your profile"].map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold-500" /> {t}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><AuthForm /></div>
      </div>
    </div>
  );
}

/* ---------- Coming soon (roadmap) ---------- */
const roadmap: Record<string, { title: string; text: string; milestone: number; links: { label: string; to: string }[] }> = {
  requirements: { title: "Requirements", text: "Post and browse specific business requirements.", milestone: 9, links: [{ label: "Browse opportunities", to: "/opportunities" }] },
  collaboration: { title: "Collaboration", text: "Messaging, shared workspaces and deal rooms.", milestone: 10, links: [{ label: "Connect with founders", to: "/founders" }] },
  jobs: { title: "Jobs", text: "Roles at Warangal startups and businesses.", milestone: 13, links: [{ label: "Hiring opportunities", to: "/opportunities?type=Hiring" }] },
  map: { title: "Ecosystem Map", text: "Businesses, startups and events on a map of Warangal.", milestone: 12, links: [{ label: "Explore businesses", to: "/businesses" }] },
  achievements: { title: "Achievements", text: "Ecosystem milestones and awards.", milestone: 14, links: [{ label: "Read stories", to: "/stories" }] },
  reviews: { title: "Reviews", text: "Community reviews across profiles.", milestone: 14, links: [{ label: "Explore businesses", to: "/businesses" }] },
  "help-center": { title: "Help Center", text: "Guides and support.", milestone: 16, links: [{ label: "Membership FAQs", to: "/membership" }] },
  "contact-us": { title: "Contact Us", text: "Reach the WS Hub team.", milestone: 16, links: [{ label: "Go to dashboard", to: "/dashboard" }] },
  "privacy-policy": { title: "Privacy Policy", text: "How we handle your data.", milestone: 16, links: [{ label: "Back to membership", to: "/membership" }] },
  "terms-of-service": { title: "Terms of Service", text: "Membership and platform terms.", milestone: 16, links: [{ label: "Back to membership", to: "/membership" }] },
  plans: { title: "Plans", text: "See all membership plans.", milestone: 15, links: [{ label: "Membership", to: "/membership" }] },
  compare: { title: "Compare Plans", text: "Side-by-side plan comparison.", milestone: 15, links: [{ label: "Membership", to: "/membership" }] },
  "for-businesses": { title: "Membership for Businesses", text: "Business plan details.", milestone: 15, links: [{ label: "Business plan", to: "/membership/business" }] },
  "for-startups": { title: "Membership for Startups", text: "Premium plan details.", milestone: 15, links: [{ label: "Premium plan", to: "/membership/premium" }] },
  profile: { title: "Profile", text: "Your public profile editor.", milestone: 17, links: [{ label: "Go to dashboard", to: "/dashboard" }] },
  stories: { title: "Stories", text: "Founder journeys and community stories.", milestone: 18, links: [{ label: "Explore founders", to: "/founders" }] },
  membership: { title: "Membership", text: "Membership plans and benefits.", milestone: 18, links: [{ label: "Explore founders", to: "/founders" }] },
};

export function ComingSoon() {
  const { pathname } = useLocation();
  const key = pathname.split("/")[1];
  const r = roadmap[key];
  useEffect(() => {
    document.title = `${r?.title ?? "Coming soon"} — WS Hub`;
  }, [r]);
  if (!r) return <NotFound />;
  return (
    <div className="page-in mx-auto max-w-2xl px-4 py-16 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100 text-gold-800"><Construction className="h-8 w-8" /></span>
      <p className="mt-5 text-[12px] font-bold uppercase tracking-wide text-gold-800">Roadmap milestone {r.milestone}</p>
      <h1 className="mt-1 text-[30px] font-black text-navy-900">{r.title}</h1>
      <p className="mt-2 text-[14px] text-slate-600">{r.text} This section is being built next — here's where you can go in the meantime.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {r.links.map((l) => <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-navy-700">{l.label} <ArrowRight className="h-3.5 w-3.5" /></Link>)}
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">Back home</Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="page-in mx-auto max-w-xl px-4 py-20 text-center">
      <Compass className="mx-auto h-10 w-10 text-slate-300" />
      <h1 className="mt-4 text-[28px] font-black text-navy-900">Page not found</h1>
      <p className="mt-2 text-[13.5px] text-slate-600">The link may be broken or the profile may have been removed.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link to="/businesses" className="btn-navy px-5 py-2.5">Explore businesses</Link>
        <Link to="/" className="rounded-md border border-slate-300 px-5 py-2.5 text-xs font-semibold text-navy-800 hover:bg-navy-50">Home</Link>
      </div>
    </div>
  );
}

/* ---------- Error boundary with retry ---------- */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-[24px] font-black text-navy-900">Something went wrong</h1>
        <p className="mt-2 text-[13px] text-slate-600">{this.state.error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => this.setState({ error: undefined })} className="btn-navy px-5 py-2.5">Retry</button>
          <button type="button" onClick={() => { window.location.hash = "#/"; this.setState({ error: undefined }); }} className="rounded-md border border-slate-300 px-5 py-2.5 text-xs font-semibold text-navy-800">Go home</button>
        </div>
      </div>
    );
  }
}
