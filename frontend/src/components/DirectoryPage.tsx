import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { addRecentSearch } from "../store";
import { Reveal } from "./Reveal";
import { cn } from "../utils/cn";

export type FilterValues = Record<string, string | string[] | boolean>;
export interface FilterDef {
  key: string;
  label: string;
  type: "select" | "checks" | "toggle";
  options?: string[];
  placeholder?: string;
}
export interface QuickFilter {
  label: string;
  params: Record<string, string>;
}
export interface DirectoryProps<T> {
  entity: string;
  singular: string;
  breadcrumb: string;
  title: [string, string];
  subtitle: string;
  quote: [string, string];
  heroImage: string;
  searchPlaceholder: string;
  quickFilters: QuickFilter[];
  filters: FilterDef[];
  sorts: { value: string; label: string }[];
  items: T[];
  match: (item: T, q: string, f: FilterValues) => boolean;
  sort: (a: T, b: T, sort: string) => number;
  keyOf: (item: T) => string;
  renderCard: (item: T, view: "grid" | "list") => ReactNode;
  cta: { title: string; text: string; button: string; to: string; icon: ReactNode };
  banner: { title: string; highlight: string; text: string; image: string };
  pageSize?: number;
  emptyHint?: string;
  listOnly?: boolean;
  beforeResults?: ReactNode;
  afterResults?: ReactNode;
  heroAside?: ReactNode;
  resultsToolbar?: ReactNode;
}

export function readFilters(params: URLSearchParams, defs: FilterDef[]): FilterValues {
  const f: FilterValues = {};
  defs.forEach((d) => {
    const raw = params.get(d.key);
    if (d.type === "checks") f[d.key] = raw ? raw.split(",").filter(Boolean) : [];
    else if (d.type === "toggle") f[d.key] = raw === "1";
    else f[d.key] = raw || "";
  });
  return f;
}

export function DirectoryPage<T>(p: DirectoryProps<T>) {
  const PAGE = p.pageSize ?? 6;
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [focus, setFocus] = useState(false);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") || "";
  const sort = params.get("sort") || p.sorts[0].value;
  const view = p.listOnly ? "list" : ((params.get("view") as "grid" | "list") || "grid");
  const page = Math.max(1, Number(params.get("page") || 1));
  const f = readFilters(params, p.filters);
  const [query, setQuery] = useState(q);
  useEffect(() => setQuery(q), [q]);

  const key = params.toString();
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 320);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => {
    document.title = `${p.title.join(" ")} — WS Hub`;
  }, [p.title]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete("page");
    setParams(next);
  };
  const setFilter = (k: string, v: string | string[] | boolean) =>
    update({ [k]: Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? (v ? "1" : "") : v });
  const clear = () => {
    const next = new URLSearchParams();
    if (params.get("view")) next.set("view", params.get("view")!);
    setParams(next);
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (q) chips.push({ label: `“${q}”`, onRemove: () => update({ q: "" }) });
    p.filters.forEach((d) => {
      const v = f[d.key];
      if (d.type === "checks") (v as string[]).forEach((x) => chips.push({ label: x, onRemove: () => setFilter(d.key, (v as string[]).filter((y) => y !== x)) }));
      else if (d.type === "toggle" && v) chips.push({ label: d.label, onRemove: () => setFilter(d.key, false) });
      else if (d.type === "select" && v) chips.push({ label: String(v), onRemove: () => setFilter(d.key, "") });
    });
    return chips;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => [...p.items.filter((i) => p.match(i, q.trim().toLowerCase(), f))].sort((a, b) => p.sort(a, b, sort)), [key, p.items]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = results.slice((safePage - 1) * PAGE, safePage * PAGE);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addRecentSearch(query);
    update({ q: query.trim() });
  };
  const goPage = (n: number) => {
    update({ page: n > 1 ? String(n) : undefined }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const isQuickActive = (qf: QuickFilter) => Object.entries(qf.params).every(([k, v]) => (params.get(k) || "") === v);
  const allActive = activeChips.length === 0;

  const panel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-navy-900">
          Filters{activeChips.length > 0 && <span className="ml-2 rounded-full bg-gold-100 px-2 py-0.5 text-[10.5px] font-semibold text-gold-800">{activeChips.length}</span>}
        </h2>
        <button type="button" onClick={clear} className="text-[12px] font-medium text-navy-600 hover:text-navy-800">Clear All</button>
      </div>
      {p.filters.map((d) => (
        <div key={d.key}>
          <p className="mb-2 text-[12.5px] font-bold text-navy-900">{d.label}</p>
          {d.type === "select" && (
            <select className="select" aria-label={d.label} value={f[d.key] as string} onChange={(e) => setFilter(d.key, e.target.value)}>
              <option value="">{d.placeholder ?? `All ${d.label}`}</option>
              {d.options?.map((o) => <option key={o}>{o}</option>)}
            </select>
          )}
          {d.type === "checks" && (
            <div className="space-y-2">
              {d.options?.map((o) => {
                const arr = f[d.key] as string[];
                return (
                  <label key={o} className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-slate-700">
                    <input type="checkbox" className="checkbox" checked={arr.includes(o)} onChange={(e) => setFilter(d.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
                    {o}
                  </label>
                );
              })}
            </div>
          )}
          {d.type === "toggle" && (
            <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-slate-700">
              <input type="checkbox" className="checkbox" checked={f[d.key] as boolean} onChange={(e) => setFilter(d.key, e.target.checked)} />
              {d.placeholder ?? d.label}
            </label>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-in pb-20 lg:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-full md:w-[55%]">
            <img src={p.heroImage} alt="" className="h-full w-full object-cover object-center" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/30 md:via-45%" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-4 pb-8 pt-7 sm:px-6 lg:px-8 lg:pb-9 lg:pt-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/80">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-white">{p.breadcrumb}</span>
          </nav>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="text-[38px] font-black leading-none tracking-tight sm:text-[50px]">
                {p.title[0]} <span className="text-gold-500">{p.title[1]}</span>
              </h1>
              <p className="mt-3 max-w-[560px] text-[15px] text-white/90 sm:text-base">{p.subtitle}</p>
            </div>
            <div className={cn(p.heroAside ? "flex flex-col gap-4 lg:items-end" : "hidden lg:block")}>
              <p className="hidden text-[17px] font-bold italic leading-snug text-white lg:block">
                “{p.quote[0]}
                <br />
                {p.quote[1]}”
              </p>
              {p.heroAside ?? <span className="mt-2 block h-[2px] w-20 bg-gold-500" />}
            </div>
          </div>
          <form role="search" onSubmit={submit} className={cn("mt-6 flex max-w-[800px] overflow-hidden rounded-lg bg-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.6)] transition-all duration-500", focus && "max-w-[860px] ring-2 ring-gold-400/80")}>
            <label htmlFor="dir-q" className="sr-only">Search</label>
            <span className="flex items-center pl-4 pr-3 text-navy-800"><Search className="h-[18px] w-[18px]" strokeWidth={2.2} /></span>
            <input id="dir-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={p.searchPlaceholder} className="h-12 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-slate-400 focus:outline-none" />
            {query && (
              <button type="button" aria-label="Clear" onClick={() => { setQuery(""); update({ q: "" }); }} className="px-2 text-slate-400 hover:text-navy-800"><X className="h-4 w-4" /></button>
            )}
            <button type="submit" className="shrink-0 bg-gold-500 px-5 text-[13.5px] font-semibold text-navy-900 transition-colors hover:bg-gold-400 sm:px-8">Search</button>
          </form>
        </div>
      </section>

      {/* Quick filters */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto px-4 py-3 hide-scrollbar sm:px-6 lg:px-8">
          <button type="button" onClick={() => setDrawer(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy-800 bg-navy-800 px-3.5 py-1.5 text-[11.5px] font-semibold text-white lg:hidden">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters{activeChips.length > 0 && ` (${activeChips.length})`}
          </button>
          <button type="button" onClick={clear} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition-all", allActive ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-navy-700")}>All</button>
          {p.quickFilters.map((qf) => {
            const active = isQuickActive(qf);
            return (
              <button
                key={qf.label}
                type="button"
                onClick={() => update(active ? Object.fromEntries(Object.keys(qf.params).map((k) => [k, undefined])) : qf.params)}
                className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition-all duration-300 hover:-translate-y-0.5", active ? "border-gold-500 bg-gold-100 text-gold-800" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-navy-700 hover:text-navy-900")}
              >
                {qf.label}
              </button>
            );
          })}
        </div>
      </div>

      {p.beforeResults && activeChips.length === 0 && <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">{p.beforeResults}</div>}

      {/* Main */}
      <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[76px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] hide-scrollbar">{panel}</div>
          </aside>
          <section aria-label="Results" aria-busy={loading}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-navy-900">
                  {loading ? <span className="inline-block h-6 w-32 animate-pulse rounded bg-slate-200 align-middle" /> : `${results.length.toLocaleString("en-IN")} ${results.length === 1 ? p.singular : p.entity}`}
                </h2>
                <p className="text-[12px] text-slate-500">{q ? `Results for “${q}”` : `Showing all ${p.entity.toLowerCase()}`}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <label htmlFor="dir-sort" className="hidden text-[12px] font-medium text-slate-600 sm:block">Sort by</label>
                <select id="dir-sort" className="select h-9 w-auto min-w-[150px] text-[12px]" value={sort} onChange={(e) => update({ sort: e.target.value === p.sorts[0].value ? undefined : e.target.value })}>
                  {p.sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {!p.listOnly && (
                  <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="View">
                    <button type="button" onClick={() => update({ view: undefined }, false)} aria-pressed={view === "grid"} aria-label="Grid view" className={cn("flex h-9 w-9 items-center justify-center rounded-md border transition-all", view === "grid" ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:bg-slate-50")}><LayoutGrid className="h-4 w-4" /></button>
                    <button type="button" onClick={() => update({ view: "list" }, false)} aria-pressed={view === "list"} aria-label="List view" className={cn("flex h-9 w-9 items-center justify-center rounded-md border transition-all", view === "list" ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:bg-slate-50")}><List className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            </div>

            {p.resultsToolbar && <div className="mt-3">{p.resultsToolbar}</div>}
            {activeChips.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeChips.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1 rounded-full bg-navy-50 py-1 pl-3 pr-1.5 text-[11.5px] font-medium text-navy-800">
                    {c.label}
                    <button type="button" onClick={c.onRemove} aria-label={`Remove ${c.label}`} className="rounded-full p-0.5 hover:bg-navy-100"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <button type="button" onClick={clear} className="text-[11.5px] font-semibold text-navy-600 hover:underline">Clear all</button>
              </div>
            )}

            {loading ? (
              <div className={cn("mt-5 grid gap-4", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {Array.from({ length: PAGE }).map((_, i) => <SkeletonCard key={i} list={view === "list"} />)}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-3 text-[16px] font-bold text-navy-900">Welcome — no {p.entity.toLowerCase()} yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">{p.emptyHint ?? "This section is ready. Add the first record and it will appear here."}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button type="button" onClick={clear} className="btn-navy px-5 py-2.5 text-xs">Clear all filters</button>
                  <Link to={p.cta.to} className="inline-flex items-center rounded-md border border-slate-300 px-5 py-2.5 text-xs font-semibold text-navy-800 hover:bg-navy-50">{p.cta.button}</Link>
                </div>
              </div>
            ) : (
              <div key={key} className={cn("mt-5 grid gap-4", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {pageItems.map((it, i) => (
                  <Reveal key={p.keyOf(it)} delay={i * 50}>{p.renderCard(it, view)}</Reveal>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <nav aria-label="Pagination" className="flex items-center gap-1.5">
                  <PageBtn disabled={safePage === 1} onClick={() => goPage(safePage - 1)} aria-label="Previous page"><ArrowLeft className="h-4 w-4" /></PageBtn>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PageBtn key={i} active={safePage === i + 1} onClick={() => goPage(i + 1)} aria-current={safePage === i + 1 ? "page" : undefined}>{i + 1}</PageBtn>
                  ))}
                  <PageBtn disabled={safePage === totalPages} onClick={() => goPage(safePage + 1)} aria-label="Next page"><ArrowRight className="h-4 w-4" /></PageBtn>
                </nav>
                <p className="text-[12px] text-slate-500">Showing {(safePage - 1) * PAGE + 1}–{Math.min(safePage * PAGE, results.length)} of {results.length} {p.entity.toLowerCase()}</p>
              </div>
            )}
          </section>
        </div>

        {p.afterResults}

        {/* CTA */}
        <Reveal className="mt-10 flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">{p.cta.icon}</span>
            <div>
              <h3 className="text-[16px] font-bold text-navy-900">{p.cta.title}</h3>
              <p className="text-[12.5px] text-slate-600">{p.cta.text}</p>
            </div>
          </div>
          <Link to={p.cta.to} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold-500 px-5 py-3 text-[13px] font-bold text-navy-900 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-[0_12px_24px_-10px_rgba(226,176,74,0.9)]">
            {p.cta.button} <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>

      {/* Banner */}
      <Reveal className="mx-auto mt-6 max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-xl bg-navy-950 text-white">
          <img src={p.banner.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-950/20" />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14">
            <h2 className="text-[26px] font-bold leading-tight sm:text-[32px]">
              {p.banner.title} <span className="text-gold-500">{p.banner.highlight}</span>
            </h2>
            <p className="mt-2 max-w-md text-[13px] text-white/80">{p.banner.text}</p>
          </div>
        </div>
      </Reveal>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-[60] lg:hidden", drawer ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!drawer}>
        <div className={cn("absolute inset-0 bg-navy-950/60 transition-opacity duration-300", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
        <div role="dialog" aria-modal="true" aria-label="Filters" className={cn("absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]", drawer ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="text-[15px] font-bold text-navy-900">Refine results</span>
            <button type="button" aria-label="Close filters" onClick={() => setDrawer(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{panel}</div>
          <div className="border-t border-line p-4">
            <button type="button" onClick={() => setDrawer(false)} className="btn-navy w-full py-3 text-sm">Show {results.length} results</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ list }: { list: boolean }) {
  return (
    <div className={cn("animate-pulse rounded-xl border border-line bg-white p-4", list && "flex gap-4")} aria-hidden="true">
      <div className={cn("rounded-lg bg-slate-200", list ? "h-24 w-24 shrink-0" : "mx-auto h-16 w-16 rounded-full")} />
      <div className="mt-3 flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="mt-4 h-8 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}

function PageBtn({ active, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn("inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-[12.5px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40", active ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50", className)}
      {...rest}
    />
  );
}
