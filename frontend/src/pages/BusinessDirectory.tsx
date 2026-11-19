import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Handshake,
  LayoutGrid,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { industries, locations, popularSearches, type BusinessRecord } from "../businesses";
import { EmptyDataCard } from "../components/EmptyDataCard";
import { BusinessCard } from "../components/BusinessCard";
import { Reveal } from "../components/Reveal";
import { cn } from "../utils/cn";
import { businessApi, homeApi } from "../api";
import { BusinessCardShimmer } from "../components/ui/Shimmer";

const PAGE_SIZE = 6;
const types = ["Startup", "SME", "Large Enterprise"] as const;
const years = ["Any Year", "2020 & later", "2010 – 2019", "2000 – 2009", "Before 2000"];
const memberships = ["Any", "Free", "Premium", "Enterprise"];
const sorts: { value: string; label: string }[] = [
  { value: "recent", label: "Recently Added" },
  { value: "viewed", label: "Most Viewed" },
  { value: "rated", label: "Highest Rated" },
  { value: "verified", label: "Recently Verified" },
  { value: "alpha", label: "Alphabetical" },
];

const allTags: string[] = [];

interface Filters {
  q: string;
  category: string;
  industry: string;
  location: string;
  type: string[];
  verified: boolean;
  rating: number;
  year: string;
  ps: string;
  membership: string;
}

function matchYear(y: number, f: string) {
  switch (f) {
    case "2020 & later":
      return y >= 2020;
    case "2010 – 2019":
      return y >= 2010 && y <= 2019;
    case "2000 – 2009":
      return y >= 2000 && y <= 2009;
    case "Before 2000":
      return y < 2000;
    default:
      return true;
  }
}

function applyFilters(list: BusinessRecord[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return list.filter((b) => {
    if (q) {
      const hay = [b.name, b.category, b.industry, b.description, b.location, ...b.tags, ...b.products.map((p) => p.name), ...b.services.map((s) => s.name)]
        .join(" ")
        .toLowerCase();
      const words = q.split(/\s+/);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.category && b.category !== f.category) return false;
    if (f.industry && b.industry !== f.industry) return false;
    if (f.location && b.location !== f.location) return false;
    if (f.type.length && !f.type.includes(b.businessType)) return false;
    if (f.verified && !b.verified) return false;
    if (f.rating && b.rating < f.rating) return false;
    if (!matchYear(b.established, f.year)) return false;
    if (f.ps && !b.tags.includes(f.ps)) return false;
    if (f.membership && f.membership !== "Any" && b.membership !== f.membership) return false;
    return true;
  });
}

function sortList(list: BusinessRecord[], sort: string) {
  const c = [...list];
  switch (sort) {
    case "viewed":
      return c.sort((a, b) => b.views - a.views);
    case "rated":
      return c.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "verified":
      return c.sort((a, b) => (b.verifiedAt || "").localeCompare(a.verifiedAt || ""));
    case "alpha":
      return c.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return c.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }
}

/* ---------- Filter panel ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[12.5px] font-bold text-navy-900">{label}</p>
      {children}
    </div>
  );
}

function FilterPanel({
  f,
  set,
  clear,
  activeCount,
  categories,
}: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  clear: () => void;
  activeCount: number;
  categories: { id: string; name: string; slug: string }[];
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-navy-900">
          Filters{activeCount > 0 && <span className="ml-2 rounded-full bg-gold-100 px-2 py-0.5 text-[10.5px] font-semibold text-gold-800">{activeCount}</span>}
        </h2>
        <button type="button" onClick={clear} className="text-[12px] font-medium text-navy-600 transition-colors hover:text-navy-800">
          Clear All
        </button>
      </div>

      <Field label="Category">
        <select className="select" value={f.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
          <option value="">All Categories</option>
          {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
      </Field>

      <Field label="Industry">
        <select className="select" value={f.industry} onChange={(e) => set({ industry: e.target.value })} aria-label="Industry">
          <option value="">All Industries</option>
          {industries.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Location">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select className="select pl-8" value={f.location} onChange={(e) => set({ location: e.target.value })} aria-label="Location">
            <option value="">All Locations</option>
            {locations.map((c) => <option key={c}>{c}</option>)}
          </select>
          {f.location && (
            <button type="button" aria-label="Clear location" onClick={() => set({ location: "" })} className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-navy-800">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </Field>

      <Field label="Business Type">
        <div className="space-y-2">
          {types.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-slate-700">
              <input
                type="checkbox"
                className="checkbox"
                checked={f.type.includes(t)}
                onChange={(e) => set({ type: e.target.checked ? [...f.type, t] : f.type.filter((x) => x !== t) })}
              />
              {t}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Verification">
        <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-slate-700">
          <input type="checkbox" className="checkbox" checked={f.verified} onChange={(e) => set({ verified: e.target.checked })} />
          Verified Only
        </label>
      </Field>

      <Field label="Rating">
        <div className="space-y-1.5">
          {[4, 3, 0].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set({ rating: r })}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                f.rating === r ? "bg-navy-50 text-navy-900" : "text-slate-600 hover:bg-slate-50",
              )}
              aria-pressed={f.rating === r}
            >
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-3.5 w-3.5", i < (r || 5) ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              {r ? `${r}+ & above` : "Any rating"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Year Established">
        <select className="select" value={f.year} onChange={(e) => set({ year: e.target.value })} aria-label="Year established">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
      </Field>

      <Field label="Products / Services">
        <select className="select" value={f.ps} onChange={(e) => set({ ps: e.target.value })} aria-label="Products or services">
          <option value="">Select</option>
          {allTags.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>

      <Field label="Membership">
        <select className="select" value={f.membership} onChange={(e) => set({ membership: e.target.value })} aria-label="Membership">
          {memberships.map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
    </div>
  );
}

/* ---------- Page ---------- */

export default function BusinessDirectory() {
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [focus, setFocus] = useState(false);
  const [apiTotal, setApiTotal] = useState<number | null>(null);
  const [apiBusinesses, setApiBusinesses] = useState<BusinessRecord[] | null>(null);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    let active = true;
    homeApi.categories().then((items: any[]) => {
      if (active) setCategoryOptions(Array.isArray(items) ? items : []);
    }).catch(() => { if (active) setCategoryOptions([]); });
    return () => { active = false; };
  }, []);

  const f: Filters = {
    q: params.get("q") || "",
    category: params.get("category") || "",
    industry: params.get("industry") || "",
    location: params.get("location") || "",
    type: params.get("type")?.split(",").filter(Boolean) || [],
    verified: params.get("verified") === "1",
    rating: Number(params.get("rating") || 0),
    year: params.get("year") || "Any Year",
    ps: params.get("ps") || "",
    membership: params.get("membership") || "Any",
  };
  const sort = params.get("sort") || "recent";
  const view = (params.get("view") as "grid" | "list") || "grid";
  const page = Math.max(1, Number(params.get("page") || 1));
  const [query, setQuery] = useState(f.q);
  useEffect(() => setQuery(f.q), [f.q]);

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete("page");
    setParams(next, { replace: false });
  };

  const set = (patch: Partial<Filters>) =>
    update({
      ...(patch.q !== undefined && { q: patch.q }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.industry !== undefined && { industry: patch.industry }),
      ...(patch.location !== undefined && { location: patch.location }),
      ...(patch.type !== undefined && { type: patch.type.join(",") }),
      ...(patch.verified !== undefined && { verified: patch.verified ? "1" : "" }),
      ...(patch.rating !== undefined && { rating: patch.rating ? String(patch.rating) : "" }),
      ...(patch.year !== undefined && { year: patch.year === "Any Year" ? "" : patch.year }),
      ...(patch.ps !== undefined && { ps: patch.ps }),
      ...(patch.membership !== undefined && { membership: patch.membership === "Any" ? "" : patch.membership }),
    });

  const clear = () => {
    const next = new URLSearchParams();
    if (sort !== "recent") next.set("sort", sort);
    if (view !== "grid") next.set("view", view);
    setParams(next);
  };

  const activeCount =
    (f.q ? 1 : 0) + (f.category ? 1 : 0) + (f.industry ? 1 : 0) + (f.location ? 1 : 0) + f.type.length + (f.verified ? 1 : 0) + (f.rating ? 1 : 0) + (f.year !== "Any Year" ? 1 : 0) + (f.ps ? 1 : 0) + (f.membership !== "Any" ? 1 : 0);

  const results = useMemo(() => apiBusinesses ? sortList(applyFilters(apiBusinesses, f), sort) : [], [params, apiBusinesses]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    set({ q: query });
  };

  useEffect(() => {
    document.title = "Explore Businesses — WS Hub";
  }, []);

  useEffect(() => {
    let active = true;
    setBusinessesLoading(true);
    setApiBusinesses(null);
    businessApi.list({
      listingType: "business",
      q: f.q || undefined,
      category: f.category || undefined,
      city: f.location || undefined,
      minRating: f.rating || undefined,
      sort: sort === "recent" ? "newest" : sort === "viewed" ? "popular" : sort === "rated" ? "rating" : sort === "alpha" ? "name" : "newest",
      page,
      limit: PAGE_SIZE,
    }).then((result: any) => {
      const payload = Array.isArray(result) ? result : result?.data;
      const meta = Array.isArray(result) ? null : result?.meta;
      const records: BusinessRecord[] = (payload ?? []).map((b: any) => ({
        slug: b.slug,
        name: b.name,
        category: b.category?.name || "Business",
        industry: b.category?.slug || "General",
        location: b.city || b.location || "Warangal",
        area: b.address || b.city || "",
        tagline: b.description || "Published on WS Hub",
        description: b.description || "",
        mission: "",
        vision: "",
        founder: "",
        employees: b.employee_count == null ? "Not listed" : String(b.employee_count),
        established: Number(b.established_year || 0),
        hours: "",
        businessType: b.listing_type === "startup" ? "Startup" : "SME",
        membership: "Free",
        verified: Boolean(b.is_verified),
        rating: Number(b.avg_rating ?? b.rating ?? 0),
        reviews: Number(b.review_count ?? b.reviews ?? 0),
        views: Number(b.view_count ?? b.views ?? 0),
        addedAt: b.created_at || "",
        verifiedAt: "",
        tags: Array.isArray(b.tags) ? b.tags : [],
        products: Array.isArray(b.products) ? b.products : [],
        services: [],
        gallery: Array.isArray(b.gallery) ? b.gallery : [],
        achievements: [],
        reviewList: [],
        contact: {
          phone: b.phone || "",
          whatsapp: b.phone || "",
          email: b.email || "",
          website: b.website || "",
          address: b.address || b.city || "",
          maps: b.map_url || "",
          instagram: b.social_links?.instagram,
          linkedin: b.social_links?.linkedin,
        },
        cover: b.cover_url || "/images/hero.jpg",
        logo: { initials: b.name?.slice(0, 2).toUpperCase() || "WS", bg: "#0f2a4a", fg: "#ffffff" },
      }));
      if (active) { setApiBusinesses(records); setApiTotal(meta?.total ?? records.length); }
    }).catch(() => {
      if (active) { setApiBusinesses([]); setApiTotal(0); }
    }).finally(() => { if (active) setBusinessesLoading(false); });
    return () => { active = false; };
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const goPage = (p: number) => {
    update({ page: p > 1 ? String(p) : undefined }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-in pb-20 lg:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-full md:w-[55%]">
            <img src="/images/hero.jpg" alt="" className="h-full w-full object-cover object-[center_40%]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/20 md:via-45%" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-4 pb-8 pt-7 sm:px-6 lg:px-8 lg:pb-9 lg:pt-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/80">
            <Link to="/" className="transition-colors hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-white">Businesses</span>
          </nav>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="text-[40px] font-black leading-none tracking-tight sm:text-[52px]">
                Explore <span className="text-gold-500">Businesses</span>
              </h1>
              <p className="mt-3 text-[15px] text-white/90 sm:text-base">Discover verified businesses across Warangal. Connect, collaborate and grow together.</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-[17px] font-bold leading-snug text-white">Local Businesses<br />Stronger Warangal</p>
              <span className="mt-2 block h-[2px] w-20 bg-gold-500" />
            </div>
          </div>

          <form
            role="search"
            onSubmit={submit}
            className={cn(
              "mt-6 flex max-w-[800px] overflow-hidden rounded-lg bg-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.6)] transition-all duration-500",
              focus && "max-w-[860px] ring-2 ring-gold-400/80",
            )}
          >
            <label htmlFor="dir-search" className="sr-only">Search businesses</label>
            <span className="flex items-center pl-4 pr-3 text-navy-800"><Search className="h-[18px] w-[18px]" strokeWidth={2.2} /></span>
            <input
              id="dir-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="Search businesses by name, category, products or services..."
              className="h-12 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); set({ q: "" }); }} className="px-2 text-slate-400 hover:text-navy-800">
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="submit" className="shrink-0 bg-gold-500 px-5 text-[13.5px] font-semibold text-navy-900 transition-colors hover:bg-gold-400 sm:px-8">Search</button>
          </form>
        </div>
      </section>

      {/* Popular searches */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 overflow-x-auto px-4 py-3 hide-scrollbar sm:px-6 lg:px-8">
          <span className="shrink-0 text-[12.5px] font-semibold text-navy-900">Popular searches:</span>
          {popularSearches.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setQuery(p); set({ q: p }); }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 hover:-translate-y-0.5 hover:border-navy-700 hover:text-navy-900",
                f.q === p ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips (mobile/tablet horizontal filters) */}
      <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button type="button" onClick={() => setDrawer(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy-800 bg-navy-800 px-3.5 py-1.5 text-[11.5px] font-semibold text-white">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
          <button type="button" onClick={() => set({ category: "" })} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium", !f.category ? "border-gold-500 bg-gold-100 text-gold-800" : "border-slate-200 bg-white text-slate-600")}>All</button>
          {categoryOptions.map((category) => (
            <button key={category.id} type="button" onClick={() => set({ category: category.slug })} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium", f.category === category.slug ? "border-gold-500 bg-gold-100 text-gold-800" : "border-slate-200 bg-white text-slate-600")}>{category.name}</button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[76px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] hide-scrollbar">
              <FilterPanel f={f} set={set} clear={clear} activeCount={activeCount} categories={categoryOptions} />
            </div>
          </aside>

          <section aria-label="Results">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-navy-900">
                  {(apiTotal ?? results.length).toLocaleString("en-IN")} {(apiTotal ?? results.length) === 1 ? "Business" : "Businesses"}
                </h2>
                <p className="text-[12px] text-slate-500">
                  {f.q ? <>Results for “{f.q}”</> : <>Showing results in {f.location || "Warangal"}</>}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <label htmlFor="sort" className="hidden text-[12px] font-medium text-slate-600 sm:block">Sort by</label>
                <select id="sort" className="select h-9 w-auto min-w-[160px] text-[12px]" value={sort} onChange={(e) => update({ sort: e.target.value === "recent" ? undefined : e.target.value })}>
                  {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="hidden items-center gap-1.5 sm:flex" role="group" aria-label="View">
                  <button
                    type="button"
                    onClick={() => update({ view: undefined }, false)}
                    aria-pressed={view === "grid"}
                    className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-all", view === "grid" ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:bg-slate-50")}
                  >
                    <LayoutGrid className="h-4 w-4" /> Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ view: "list" }, false)}
                    aria-pressed={view === "list"}
                    className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-all", view === "list" ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:bg-slate-50")}
                  >
                    <List className="h-4 w-4" /> List
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {f.category && <Chip label={f.category} onRemove={() => set({ category: "" })} />}
                {f.industry && <Chip label={f.industry} onRemove={() => set({ industry: "" })} />}
                {f.location && <Chip label={f.location} onRemove={() => set({ location: "" })} />}
                {f.type.map((t) => <Chip key={t} label={t} onRemove={() => set({ type: f.type.filter((x) => x !== t) })} />)}
                {f.verified && <Chip label="Verified" onRemove={() => set({ verified: false })} />}
                {f.rating > 0 && <Chip label={`${f.rating}+ stars`} onRemove={() => set({ rating: 0 })} />}
                {f.year !== "Any Year" && <Chip label={f.year} onRemove={() => set({ year: "Any Year" })} />}
                {f.ps && <Chip label={f.ps} onRemove={() => set({ ps: "" })} />}
                {f.membership !== "Any" && <Chip label={f.membership} onRemove={() => set({ membership: "Any" })} />}
              </div>
            )}

            {businessesLoading ? <div className="mt-6"><BusinessCardShimmer count={6} /></div> : pageItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-3 text-[16px] font-bold text-navy-900">Welcome — no businesses yet</h3>
                <p className="mt-1 text-[13px] text-slate-500">Published real businesses will appear here. Add the first business to get started.</p>
                <Link to="/dashboard" className="btn-navy mt-4 inline-flex px-5 py-2.5 text-xs">Add a business</Link>
              </div>
            ) : (
              <div key={`${view}-${safePage}-${params.toString()}`} className={cn("mt-5 grid gap-4", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {pageItems.map((b, i) => (
                  <Reveal key={b.slug} delay={i * 60}>
                    <BusinessCard b={b} view={view} />
                  </Reveal>
                ))}
              </div>
            )}

            {/* Pagination */}
            {results.length > 0 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <nav aria-label="Pagination" className="flex items-center gap-1.5">
                  <PageBtn disabled={safePage === 1} onClick={() => goPage(safePage - 1)} aria-label="Previous page"><ArrowLeft className="h-4 w-4" /></PageBtn>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PageBtn key={i} active={safePage === i + 1} onClick={() => goPage(i + 1)} aria-current={safePage === i + 1 ? "page" : undefined}>{i + 1}</PageBtn>
                  ))}
                  <PageBtn disabled={safePage === totalPages} onClick={() => goPage(safePage + 1)} aria-label="Next page"><ArrowRight className="h-4 w-4" /></PageBtn>
                </nav>
                <p className="text-[12px] text-slate-500">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, results.length)} of {results.length} businesses
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Owner CTA */}
        <Reveal className="my-10 flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between lg:my-12">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Handshake className="h-7 w-7" strokeWidth={1.6} /></span>
            <div>
              <h3 className="text-[16px] font-bold text-navy-900">Are you a business owner?</h3>
              <p className="text-[12.5px] text-slate-600">List your business on WS Hub and get discovered by customers, partners and investors.</p>
            </div>
          </div>
          <Link to="/signup" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold-500 px-5 py-3 text-[13px] font-bold text-navy-900 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-[0_12px_24px_-10px_rgba(226,176,74,0.9)]">
            Register Your Business <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>

      {/* Mobile filter drawer */}
      <div className={cn("fixed inset-0 z-[60] lg:hidden", drawer ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!drawer}>
        <div className={cn("absolute inset-0 bg-navy-950/60 transition-opacity duration-300", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={cn("absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]", drawer ? "translate-x-0" : "-translate-x-full")}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="text-[15px] font-bold text-navy-900">Refine results</span>
            <button type="button" aria-label="Close filters" onClick={() => setDrawer(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5"><FilterPanel f={f} set={set} clear={clear} activeCount={activeCount} categories={categoryOptions} /></div>
          <div className="border-t border-line p-4">
            <button type="button" onClick={() => setDrawer(false)} className="btn-navy w-full py-3 text-sm">Show {results.length} results</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 py-1 pl-3 pr-1.5 text-[11.5px] font-medium text-navy-800">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 hover:bg-navy-100"><X className="h-3 w-3" /></button>
    </span>
  );
}

function PageBtn({ active, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-[12.5px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50",
        className,
      )}
      {...rest}
    />
  );
}
