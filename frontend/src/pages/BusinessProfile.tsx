import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Flag,
  Globe,
  Handshake,
  Mail,
  MapPin,
  Navigation,
  Newspaper,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  Target,
  ThumbsUp,
  TrendingUp,
  User,
  Users,
  X,
  Wrench,
} from "lucide-react";
import { relatedBusinesses, type Achievement, type GalleryItem } from "../businesses";
import { ActionButtons, LogoBadge, SaveButton, VerifiedPill, WhatsAppIcon } from "../components/BusinessCard";
import { Stars } from "../components/Stars";
import { founders } from "../founders";
import { startups } from "../startups";
import { opportunities, typeColor } from "../opportunities";
import { Avatar } from "../components/ProfileShell";
import { Reveal } from "../components/Reveal";
import { cn } from "../utils/cn";
import { useTrackView } from "../components/ui/Actions";
import { businessApi } from "../api";

const tabs = ["Overview", "Products", "Services", "Gallery", "Achievements", "Reviews", "Contact"] as const;
type Tab = (typeof tabs)[number];

const achievementIcon: Record<Achievement["type"], typeof Award> = {
  Award: Award,
  Certification: ShieldCheck,
  Expansion: TrendingUp,
  Media: Newspaper,
};

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function SectionCard({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="scroll-mt-[128px] rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div id={id} className="scroll-mt-[128px]" />
      <h2 className="text-[18px] font-bold text-navy-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </Reveal>
  );
}

export default function BusinessProfile() {
  const { slug = "" } = useParams();
  useTrackView("business:" + slug);
  const [apiBusiness, setApiBusiness] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  useEffect(() => {
    setProfileLoading(true);
    businessApi.get(slug).then((raw: any) => {
      if (!raw) throw new Error("Business not found");
      const b = raw?.business ?? raw.data?.data ?? raw.data ?? raw;
      setApiBusiness({
        slug: b.slug,
        name: b.name,
        category: b.category?.name || "Business",
        industry: b.category?.slug || "General",
        location: b.city || b.location || "",
        area: b.address || b.city || "",
        tagline: b.description || "",
        description: b.description || "",
        mission: "",
        vision: "",
        founder: b.owner?.full_name || "",
        employees: "",
        established: 0,
        hours: "",
        businessType: "Large Enterprise",
        membership: b.plan_code || "Free",
        verified: Boolean(b.is_verified),
        rating: Number(b.avg_rating || 0),
        reviews: Number(b.review_count || 0),
        views: Number(b.view_count || 0),
        addedAt: b.created_at || "",
        verifiedAt: "",
        tags: b.tags || [],
        products: [],
        services: b.services || [],
        gallery: [],
        achievements: [],
        reviewList: b.recentReviews || [],
        contact: {
          phone: b.phone || "",
          whatsapp: b.phone || "",
          email: b.email || "",
          website: b.website || "",
          address: b.address || b.city || "",
          maps: "",
          instagram: b.social_links?.instagram,
          linkedin: b.social_links?.linkedin,
        },
        cover: b.cover_url || b.coverUrl || "/images/hero.jpg",
        logoUrl: b.logo_url || b.logoUrl || undefined,
        logo: { initials: b.name?.slice(0, 2).toUpperCase() || "WS", bg: "#0f2a4a", fg: "#ffffff" },
      });
    }).catch(() => setApiBusiness(null)).finally(() => setProfileLoading(false));
  }, [slug]);
  const b = apiBusiness;
  const [active, setActive] = useState<Tab>("Overview");
  const [galleryGroup, setGalleryGroup] = useState<"All" | GalleryItem["group"]>("All");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [collab, setCollab] = useState(false);
  const [sent, setSent] = useState(false);
  const [helpful, setHelpful] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (b) document.title = `${b.name} — WS Hub`;
  }, [b]);

  useEffect(() => {
    if (!slug) return;
    businessApi.trackView(slug).catch(() => undefined);
  }, [slug]);

  // Scroll-spy
  useEffect(() => {
    if (!b) return;
    const els = tabs.map((t) => document.getElementById(t.toLowerCase())).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target.id.charAt(0).toUpperCase() + e.target.id.slice(1)) as Tab);
        });
      },
      { rootMargin: "-130px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [b]);

  useEffect(() => {
    document.body.style.overflow = collab || lightbox ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [collab, lightbox]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCollab(false);
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (profileLoading) {
    return <div className="page-in mx-auto max-w-[1280px] px-4 py-16"><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></div>;
  }
  if (!b) return <Navigate to="/businesses" replace />;

  const related = relatedBusinesses(b);
  const galleryItems = galleryGroup === "All" ? b.gallery : b.gallery.filter((g) => g.group === galleryGroup);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: b.name, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* dismissed */
    }
  };

  const jump = (t: Tab) => {
    document.getElementById(t.toLowerCase())?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(t);
  };

  const submitCollab = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const ratingDist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    pct: Math.round((b.reviewList.filter((r) => r.rating === s).length / b.reviewList.length) * 100),
  }));

  return (
    <div className="page-in pb-20 lg:pb-0">
      {/* Cover */}
      <div className="relative z-0 isolate h-[220px] overflow-hidden bg-navy-900 sm:h-[280px] lg:h-[320px]">
        <img src={b.cover} alt="" className="ken-burns h-full w-full object-cover" onError={(event) => { if (!event.currentTarget.src.endsWith("/images/hero.jpg")) event.currentTarget.src = "/images/hero.jpg"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-navy-950/30" />
        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/85">
              <Link to="/" className="hover:text-white">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/businesses" className="hover:text-white">Businesses</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate font-semibold text-white">{b.name}</span>
            </nav>
          </div>
        </div>
        <div className="absolute right-4 top-4 flex gap-2 sm:right-6 lg:right-8">
          <button type="button" onClick={share} aria-label="Share" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 bg-white/95 text-navy-800 shadow-sm transition-all hover:bg-white">
            <Share2 className="h-4 w-4" />
            {copied && <span className="fade-in absolute right-0 top-11 whitespace-nowrap rounded-md bg-navy-900 px-2 py-1 text-[10px] font-semibold text-white">Link copied</span>}
          </button>
          <SaveButton slug={b.slug} />
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:-mt-14 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <LogoBadge b={b} size="xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-black leading-tight tracking-tight text-navy-900 sm:text-[30px]">{b.name}</h1>
                  {b.verified && <VerifiedPill />}
                </div>
                <p className="mt-1 text-[13px] font-medium text-slate-600">{b.tagline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {b.category} · {b.industry}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.area}, {b.location}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {b.views.toLocaleString("en-IN")} views</span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <Stars rating={b.rating} reviews={b.reviews} size={14} />
                  <button type="button" onClick={() => jump("Reviews")} className="text-[12px] font-medium text-navy-600 hover:underline">Read reviews</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:max-w-[360px] md:justify-end">
              <a href={`tel:${b.contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-navy-50 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 transition-colors hover:bg-navy-100"><Phone className="h-4 w-4" /> Call</a>
              <a href={`https://wa.me/${b.contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-50 px-4 py-2.5 text-[12.5px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
              <a href={`https://${b.contact.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 transition-colors hover:border-navy-700 hover:bg-navy-50"><Globe className="h-4 w-4" /> Website</a>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(b.contact.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 transition-colors hover:border-navy-700 hover:bg-navy-50"><Navigation className="h-4 w-4" /> Directions</a>
              <button type="button" onClick={() => { setSent(false); setCollab(true); }} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-gold-500 px-5 py-2.5 text-[12.5px] font-bold text-navy-900 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-[0_12px_24px_-10px_rgba(226,176,74,0.9)] sm:col-span-1">
                <Handshake className="h-4 w-4" /> Collaborate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div ref={tabsRef} className="sticky top-[60px] z-30 mt-5 border-y border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto hide-scrollbar" aria-label="Profile sections">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => jump(t)}
                aria-current={active === t ? "true" : undefined}
                className={cn(
                  "relative shrink-0 px-4 py-3.5 text-[13px] font-semibold transition-colors",
                  active === t ? "text-navy-900" : "text-slate-500 hover:text-navy-800",
                )}
              >
                {t}
                <span className={cn("absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-gold-500 transition-transform duration-300", active === t ? "scale-x-100" : "scale-x-0")} />
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Overview */}
            <SectionCard id="overview" title="Overview">
              <p className="text-[14px] leading-relaxed text-slate-700">{b.description} {b.tagline} Based in {b.area}, {b.location}, {b.name} has been serving customers since {b.established} and is a {b.businessType.toLowerCase()} in the {b.industry.toLowerCase()} space.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-navy-50/60 p-4">
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-navy-700"><Target className="h-4 w-4" /> Mission</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{b.mission}</p>
                </div>
                <div className="rounded-lg border border-line bg-gold-100/50 p-4">
                  <p className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-gold-800"><Eye className="h-4 w-4" /> Vision</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{b.vision}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { icon: User, k: "Founder", v: b.founder },
                  { icon: Users, k: "Employees", v: b.employees },
                  { icon: CalendarDays, k: "Established", v: String(b.established) },
                  { icon: Clock, k: "Working Hours", v: b.hours },
                ].map(({ icon: Icon, k, v }) => (
                  <div key={k} className="flex gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-navy-700"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-slate-500">{k}</dt>
                      <dd className="text-[12.5px] font-semibold leading-snug text-navy-900">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </SectionCard>

            {/* Products */}
            <SectionCard id="products" title="Products" subtitle={`${b.products.length} products & offerings`}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {b.products.map((p) => (
                  <article key={p.name} className="card group flex flex-col overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-1 flex-col p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[13.5px] font-bold text-navy-900">{p.name}</h3>
                        {p.price && <span className="shrink-0 rounded-md bg-gold-100 px-2 py-0.5 text-[10.5px] font-bold text-gold-800">{p.price}</span>}
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">{p.description}</p>
                      <button type="button" onClick={() => { setSent(false); setCollab(true); }} className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-navy-800 px-3 py-2 text-[11.5px] font-semibold text-navy-800 transition-all hover:bg-navy-800 hover:text-white">Send Enquiry</button>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>

            {/* Services */}
            <SectionCard id="services" title="Services">
              <div className="grid gap-3 sm:grid-cols-3">
                {b.services.map((s, i) => (
                  <div key={s.name} className="group rounded-lg border border-line p-4 transition-all duration-300 hover:-translate-y-1 hover:border-navy-100 hover:shadow-[var(--shadow-card-hover)]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800 text-gold-400 transition-transform duration-300 group-hover:scale-110">
                      {i === 0 ? <Target className="h-5 w-5" /> : i === 1 ? <Wrench className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
                    </span>
                    <h3 className="mt-3 text-[13.5px] font-bold text-navy-900">{s.name}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{s.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Gallery */}
            <SectionCard id="gallery" title="Gallery">
              <div className="mb-4 flex flex-wrap gap-2">
                {(["All", "Office", "Team", "Events"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setGalleryGroup(g)} className={cn("rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition-all", galleryGroup === g ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-navy-700")}>{g}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {galleryItems.map((g, i) => (
                  <button key={g.image + i} type="button" onClick={() => setLightbox(g)} className={cn("group relative overflow-hidden rounded-lg", i === 0 && "col-span-2 row-span-2 sm:col-span-2")}>
                    <img src={g.image} alt={g.label} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent px-3 pb-2 pt-8 text-left text-[11.5px] font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">{g.label}</span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Achievements */}
            <SectionCard id="achievements" title="Achievements" subtitle="Awards, certifications, expansion and media">
              <ol className="relative ml-3 border-l-2 border-navy-100 pl-6">
                {b.achievements.map((a) => {
                  const Icon = achievementIcon[a.type];
                  return (
                    <li key={a.title} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-navy-900 ring-4 ring-white"><Icon className="h-3.5 w-3.5" strokeWidth={2.2} /></span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-bold text-gold-800">{a.year}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{a.type}</span>
                      </div>
                      <h3 className="mt-1 text-[13.5px] font-bold text-navy-900">{a.title}</h3>
                      <p className="mt-0.5 text-[12px] text-slate-600">{a.description}</p>
                    </li>
                  );
                })}
              </ol>
            </SectionCard>

            {/* Reviews */}
            <SectionCard id="reviews" title="Reviews">
              <div className="grid gap-5 md:grid-cols-[200px_1fr]">
                <div className="rounded-lg bg-navy-50/70 p-4 text-center">
                  <p className="text-[42px] font-black leading-none text-navy-900">{b.rating.toFixed(1)}</p>
                  <div className="mt-2 flex justify-center"><Stars rating={b.rating} reviews={b.reviews} size={14} /></div>
                  <div className="mt-4 space-y-1.5">
                    {ratingDist.map((r) => (
                      <div key={r.star} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="w-3">{r.star}</span>
                        <Star className="h-3 w-3 text-gold-500" fill="currentColor" strokeWidth={0} />
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-gold-500" style={{ width: `${r.pct}%` }} /></span>
                        <span className="w-7 text-right">{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-navy mt-4 w-full py-2.5">Write a Review</button>
                </div>
                <ul className="space-y-4">
                  {b.reviewList.map((r, i) => (
                    <li key={r.name} className="rounded-lg border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-[12px] font-bold text-white">{r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                          <div>
                            <p className="text-[13px] font-bold text-navy-900">{r.name}</p>
                            <p className="text-[11px] text-slate-500">{r.role} · {r.date}</p>
                          </div>
                        </div>
                        <span className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, s) => <Star key={s} className={cn("h-3.5 w-3.5", s < r.rating ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{r.text}</p>
                      <div className="mt-3 flex items-center gap-4 text-[11.5px]">
                        <button type="button" onClick={() => setHelpful((h) => ({ ...h, [i]: !h[i] }))} className={cn("inline-flex items-center gap-1.5 font-medium transition-colors", helpful[i] ? "text-navy-800" : "text-slate-500 hover:text-navy-800")}>
                          <ThumbsUp className="h-3.5 w-3.5" fill={helpful[i] ? "currentColor" : "none"} /> Helpful ({r.helpful + (helpful[i] ? 1 : 0)})
                        </button>
                        <button type="button" className="inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-red-600"><Flag className="h-3.5 w-3.5" /> Report</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard id="contact" title="Contact">
              <div className="grid gap-5 md:grid-cols-2">
                <ul className="space-y-3 text-[13px]">
                  {[
                    { icon: Phone, label: "Phone", value: b.contact.phone, href: `tel:${b.contact.phone.replace(/\s/g, "")}` },
                    { icon: Mail, label: "Email", value: b.contact.email, href: `mailto:${b.contact.email}` },
                    { icon: Globe, label: "Website", value: b.contact.website, href: `https://${b.contact.website}` },
                    { icon: LinkedinIcon, label: "LinkedIn", value: b.contact.linkedin, href: `https://${b.contact.linkedin}` },
                    { icon: InstagramIcon, label: "Instagram", value: b.contact.instagram, href: "#" },
                    { icon: MapPin, label: "Address", value: b.contact.address, href: `https://maps.google.com/?q=${encodeURIComponent(b.contact.address)}` },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <li key={label} className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="group inline-flex items-center gap-1 break-all font-semibold text-navy-900 hover:text-navy-600">
                          {value}
                          {href.startsWith("http") && <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="overflow-hidden rounded-lg border border-line">
                  <iframe
                    title={`Map of ${b.name}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(b.contact.address)}&z=14&output=embed`}
                    className="h-[260px] w-full md:h-full md:min-h-[300px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-[124px] lg:self-start">
            <div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-[14px] font-bold text-navy-900">Quick Info</h3>
              <dl className="mt-3 space-y-2.5 text-[12.5px]">
                {[
                  ["Business Type", b.businessType],
                  ["Membership", b.membership],
                  ["Established", String(b.established)],
                  ["Employees", b.employees],
                  ["Location", b.location],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line pb-2 last:border-0">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold text-navy-900">{v}</dd>
                  </div>
                ))}
              </dl>
              {b.verified && (
                <p className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-[11.5px] font-medium text-emerald-700"><BadgeCheck className="h-4 w-4" /> Verified by WS Hub team</p>
              )}
            </div>
            {(() => {
              const founder = founders.find((f) => f.businessSlug === b.slug);
              const startup = startups.find((st) => st.businessSlug === b.slug);
              const opps = opportunities.filter((o) => o.postedBy.slug === b.slug);
              if (!founder && opps.length === 0 && !startup) return null;
              return (
                <div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                  {startup && <Link to={`/startups/${startup.slug}`} className="mb-3 flex items-center gap-3 rounded-lg border border-gold-300 bg-gold-100/40 p-3 hover:bg-gold-100"><span className="flex h-10 w-10 items-center justify-center rounded-lg text-[11px] font-black" style={{ background: startup.logo.bg, color: startup.logo.fg }}>{startup.logo.initials}</span><span className="min-w-0"><span className="block text-[11px] text-slate-500">Startup profile</span><span className="block truncate text-[13px] font-bold text-navy-900">{startup.name} · {startup.stage}</span></span></Link>}
                  {founder && (
                    <>
                      <h3 className="text-[14px] font-bold text-navy-900">Founder</h3>
                      <Link to={`/founders/${founder.slug}`} className="mt-3 flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:border-navy-700 hover:bg-navy-50">
                        <Avatar initials={founder.initials} color={founder.color} size="sm" />
                        <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-navy-900">{founder.name}</span><span className="block text-[11px] text-slate-500">{founder.role} · {founder.stage}</span></span>
                      </Link>
                    </>
                  )}
                  {opps.length > 0 && (
                    <>
                      <h3 className={cn("text-[14px] font-bold text-navy-900", founder && "mt-4")}>Active opportunities</h3>
                      <ul className="mt-3 space-y-2">
                        {opps.map((o) => (
                          <li key={o.slug}>
                            <Link to={`/opportunities/${o.slug}`} className="block rounded-lg border border-line p-3 transition-colors hover:border-navy-700 hover:bg-navy-50">
                              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", typeColor[o.type])}>{o.type}</span>
                              <span className="mt-1 block text-[12.5px] font-semibold text-navy-900">{o.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-[14px] font-bold text-navy-900">Products &amp; Services</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...b.tags, ...b.services.map((s) => s.name)].map((t) => (
                  <Link key={t} to={`/businesses?q=${encodeURIComponent(t)}`} className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-navy-800 hover:text-white">{t}</Link>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-navy-900 p-5 text-white shadow-[var(--shadow-card)]">
              <Handshake className="h-7 w-7 text-gold-400" />
              <h3 className="mt-3 text-[15px] font-bold">Want to work with {b.name}?</h3>
              <p className="mt-1 text-[12px] text-white/75">Send a collaboration request for partnerships, supply or investment.</p>
              <button type="button" onClick={() => { setSent(false); setCollab(true); }} className="mt-4 w-full rounded-md bg-gold-500 py-2.5 text-[12.5px] font-bold text-navy-900 transition-colors hover:bg-gold-400">Request Collaboration</button>
            </div>
          </aside>
        </div>

        {/* Related */}
        <section className="mt-12 mb-10" aria-labelledby="related">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="related" className="text-[19px] font-bold text-navy-800">Similar Businesses</h2>
              <p className="text-[12px] text-slate-500">More in {b.category} and {b.industry}</p>
            </div>
            <Link to={`/businesses?category=${encodeURIComponent(b.category)}`} className="view-all">View All <ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((r, i) => (
              <Reveal key={r.slug} delay={i * 70}>
                <article className="card group flex h-full flex-col overflow-hidden">
                  <Link to={`/businesses/${r.slug}`} className="relative block aspect-[16/8] overflow-hidden">
                    <img src={r.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </Link>
                  <div className="px-3 pb-3">
                    <div className="-mt-6 flex items-end justify-between">
                      <LogoBadge b={r} size="sm" />
                      {r.verified && <VerifiedPill className="mb-0.5" />}
                    </div>
                    <h3 className="mt-2 truncate text-[13.5px] font-bold text-navy-900"><Link to={`/businesses/${r.slug}`} className="hover:text-navy-600">{r.name}</Link></h3>
                    <p className="text-[11px] text-slate-500">{r.industry} · {r.location}</p>
                    <div className="mt-1.5"><Stars rating={r.rating} reviews={r.reviews} /></div>
                    <div className="mt-3"><ActionButtons b={r} compact /></div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lightbox && createPortal(
        <div className="fade-in fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/90 p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label={lightbox.label}>
          <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          <figure className="max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.image} alt={lightbox.label} className="max-h-[80vh] w-full rounded-lg object-contain" />
            <figcaption className="mt-3 text-center text-[13px] text-white/80">{lightbox.label}</figcaption>
          </figure>
        </div>,
        document.body,
      )}

      {/* Collaboration modal */}
      {collab && createPortal(
        <div className="fade-in fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/70 p-0 sm:items-center sm:p-4" onClick={() => setCollab(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="collab-title" className="page-in w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 id="collab-title" className="text-[18px] font-bold text-navy-900">Request Collaboration</h2>
                <p className="text-[12.5px] text-slate-500">with {b.name}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setCollab(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {sent ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-verified" />
                <h3 className="mt-3 text-[16px] font-bold text-navy-900">Request sent!</h3>
                <p className="mt-1 text-[13px] text-slate-600">{b.name} will get back to you within 2 business days.</p>
                <button type="button" onClick={() => setCollab(false)} className="btn-navy mt-5 px-6 py-2.5 text-sm">Done</button>
              </div>
            ) : (
              <form onSubmit={submitCollab} className="mt-5 space-y-3.5">
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Input label="Your name" placeholder="Full name" required />
                  <Input label="Phone / WhatsApp" placeholder="+91" type="tel" required />
                </div>
                <Input label="Company (optional)" placeholder="Your business or startup" />
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-navy-900" htmlFor="ctype">Collaboration type</label>
                  <select id="ctype" className="select">
                    {["Partnership", "Supplier / Vendor", "Distribution", "Investment", "Service Enquiry", "Other"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-navy-900" htmlFor="msg">Message</label>
                  <textarea id="msg" required rows={4} placeholder="Briefly describe what you'd like to collaborate on…" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-[13px] focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15" />
                </div>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 py-3 text-[13.5px] font-bold text-navy-900 transition-colors hover:bg-gold-400"><Handshake className="h-4 w-4" /> Send Request</button>
                <p className="text-center text-[11px] text-slate-500">Your details are shared only with {b.name}.</p>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Input({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-semibold text-navy-900">{label}</label>
      <input id={id} className="h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15" {...rest} />
    </div>
  );
}
