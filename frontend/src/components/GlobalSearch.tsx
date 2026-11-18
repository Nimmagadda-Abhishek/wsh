import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Clock, Search, X } from "lucide-react";
import { homeApi } from "../api";
import { addRecentSearch, clearRecentSearches, useStore } from "../store";
import { cn } from "../utils/cn";

interface Hit {
  group: "Businesses";
  title: string;
  sub: string;
  to: string;
}
const groupMeta = {
  Businesses: { icon: Building2, to: "/businesses" },
} as const;

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const recent = useStore((s) => s.recentSearches);
  const navigate = useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    let active = true;
    homeApi.search(term).then((result: any) => {
      if (!active) return;
      const businesses = Array.isArray(result?.businesses) ? result.businesses : [];
      const categories = Array.isArray(result?.categories) ? result.categories : [];
      setHits([
        ...businesses.slice(0, 5).map((business: any) => ({ group: "Businesses" as const, title: business.name, sub: [business.category?.name, business.city].filter(Boolean).join(" · "), to: `/businesses/${business.slug}` })),
        ...categories.slice(0, 3).map((category: any) => ({ group: "Businesses" as const, title: category.name, sub: "Business category", to: `/businesses?category=${encodeURIComponent(category.slug)}` })),
      ]);
    }).catch(() => { if (active) setHits([]); });
    return () => { active = false; };
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => ref.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => setIdx(0), [q]);

  const go = (to: string, term?: string) => {
    if (term) addRecentSearch(term);
    navigate(to);
    onClose();
  };
  const submitAll = () => {
    const term = q.trim();
    if (!term) return;
    go(`/businesses?q=${encodeURIComponent(term)}`, term);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); hits[idx] ? go(hits[idx].to, q.trim()) : submitAll(); }
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;
  const groups = hits.length ? (["Businesses"] as const) : [];
  let running = -1;

  return createPortal(
    <div className="fade-in fixed inset-0 z-[85] bg-navy-950/70 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Search WS Hub" className="page-in mx-auto mt-4 w-[94%] max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:mt-16" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-navy-700" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search businesses, founders, investors, opportunities…" className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-slate-400 focus:outline-none" aria-label="Search" aria-autocomplete="list" />
          {q && <button type="button" aria-label="Clear" onClick={() => setQ("")} className="text-slate-400 hover:text-navy-900"><X className="h-4 w-4" /></button>}
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">Esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <div className="p-2">
              {recent.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-2 pb-1"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Recent searches</p><button type="button" onClick={clearRecentSearches} className="text-[11px] font-semibold text-navy-700 hover:underline">Clear</button></div>
                  {recent.map((r) => <button key={r} type="button" onClick={() => setQ(r)} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-slate-700 hover:bg-navy-50"><Clock className="h-4 w-4 text-slate-400" /> {r}</button>)}
                </>
              ) : <p className="px-2 py-1 text-[12px] text-slate-500">Search businesses by name or category.</p>}
              <p className="mt-3 px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Browse</p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {(Object.keys(groupMeta) as (keyof typeof groupMeta)[]).map((g) => { const I = groupMeta[g].icon; return <button key={g} type="button" onClick={() => go(groupMeta[g].to)} className="flex flex-col items-center gap-1 rounded-lg border border-line p-3 text-[12px] font-semibold text-navy-900 hover:border-navy-700 hover:bg-navy-50"><I className="h-5 w-5 text-navy-700" /> {g}</button>; })}
              </div>
            </div>
          ) : hits.length === 0 ? (
            <div className="p-6 text-center"><p className="text-[13px] font-semibold text-navy-900">No quick matches for “{q}”</p><p className="mt-1 text-[12px] text-slate-500">Search the full business directory instead.</p><button type="button" onClick={submitAll} className="btn-navy mt-3 px-4 py-2">Search all</button></div>
          ) : (
            <>
              {groups.map((g) => { const I = groupMeta[g].icon; return (
                <div key={g} className="mb-2">
                  <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><I className="h-3.5 w-3.5" /> {g}</p>
                  {hits.filter((h) => h.group === g).map((h) => { running += 1; const i = running; return (
                    <button key={h.to} type="button" onMouseEnter={() => setIdx(i)} onClick={() => go(h.to, q.trim())} className={cn("flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left", idx === i ? "bg-navy-50" : "hover:bg-slate-50")}>
                      <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-navy-900">{h.title}</span><span className="block truncate text-[11.5px] text-slate-500">{h.sub}</span></span>
                      <ArrowRight className={cn("h-4 w-4 shrink-0 text-navy-600 transition-opacity", idx === i ? "opacity-100" : "opacity-0")} />
                    </button>
                  ); })}
                </div>
              ); })}
              <button type="button" onClick={submitAll} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 py-2.5 text-[12.5px] font-semibold text-navy-700 hover:bg-navy-50">See all results for “{q}” <ArrowRight className="h-3.5 w-3.5" /></button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
