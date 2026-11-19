import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bookmark, Building2, Check, Download, Flame, GitCompare, Landmark, MapPin, Rocket, Sparkles, TrendingUp, Users, Wallet, X } from "lucide-react";
import { businessModels, fmtFunding, getStartup, startupCategories, startupIndustries, startupLocations, startupLookingFor, startups, startupStages, startupTech, type Startup } from "../startups";
import { getFounder } from "../founders";
import { eventsForFounder } from "../events";
import { DirectoryPage, type FilterValues } from "../components/DirectoryPage";
import { SaveBtn } from "../components/ui/Actions";
import { ContactFounderBtn, StartupShareBtn } from "../components/ui/StartupActions";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ProfileShell";
import { clearCompareStartups, toast, toggleCompareStartup, track, useStore } from "../store";
import { cn } from "../utils/cn";
import { businessApi } from "../api";
import { BusinessCardShimmer } from "../components/ui/Shimmer";

const HERO = "/images/hero.jpg";
const fundingSteps = [0, 10, 50, 100, 300, 500, 1000];
const teamSteps = [1, 5, 10, 25, 50];

const filters = [
  { key: "industry", label: "Industry", type: "select" as const, options: startupIndustries },
  { key: "stage", label: "Startup Stage", type: "checks" as const, options: startupStages },
  { key: "location", label: "Location", type: "select" as const, options: startupLocations },
  { key: "tech", label: "Technology", type: "select" as const, options: startupTech, placeholder: "All Technologies" },
  { key: "funding", label: "Funding Raised (min)", type: "select" as const, options: fundingSteps.slice(1).map((v) => `≥ ${fmtFunding(v)}`), placeholder: "Any Amount" },
  { key: "team", label: "Team Size (min)", type: "select" as const, options: teamSteps.slice(1).map((v) => `≥ ${v} people`), placeholder: "Any size" },
  { key: "founded", label: "Founded Year", type: "select" as const, options: ["2025 & later", "2022 – 2024", "2019 – 2021", "Before 2019"], placeholder: "Any Year" },
  { key: "model", label: "Business Model", type: "checks" as const, options: businessModels },
  { key: "looking", label: "Looking For", type: "checks" as const, options: startupLookingFor },
  { key: "verified", label: "Verified", type: "toggle" as const, placeholder: "Verified only" },
  { key: "women", label: "Women Founded", type: "toggle" as const, placeholder: "Women-founded only" },
];

const foundedMatch = (y: number, f: string) => !f || (f === "2025 & later" ? y >= 2025 : f === "2022 – 2024" ? y >= 2022 && y <= 2024 : f === "2019 – 2021" ? y >= 2019 && y <= 2021 : y < 2019);
function match(x: Startup, q: string, f: FilterValues) {
  if (q) {
    const founder = getFounder(x.founderSlug);
    const hay = [x.name, x.tagline, x.description, x.industry, x.category, x.location, founder?.name ?? "", ...x.technologies, ...x.businessModel].join(" ").toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.category && x.category !== f.category && !x.technologies.some((t) => t.startsWith(f.category as string))) return false;
  if (f.industry && x.industry !== f.industry) return false;
  if ((f.stage as string[]).length && !(f.stage as string[]).includes(x.stage)) return false;
  if (f.location && x.location !== f.location) return false;
  if (f.tech && !x.technologies.includes(f.tech as string)) return false;
  if (f.funding) { const i = fundingSteps.slice(1).findIndex((v) => `≥ ${fmtFunding(v)}` === f.funding); if (i >= 0 && x.fundingRaised < fundingSteps[i + 1]) return false; }
  if (f.team) { const i = teamSteps.slice(1).findIndex((v) => `≥ ${v} people` === f.team); if (i >= 0 && x.teamSize < teamSteps[i + 1]) return false; }
  if (!foundedMatch(x.founded, f.founded as string)) return false;
  if ((f.model as string[]).length && !(f.model as string[]).some((m) => x.businessModel.includes(m as never))) return false;
  if ((f.looking as string[]).length && !(f.looking as string[]).some((m) => x.lookingFor.includes(m as never))) return false;
  if (f.verified && !x.verified) return false;
  if (f.women && !x.womenFounded) return false;
  return true;
}
const sortFn = (a: Startup, b: Startup, s: string) =>
  s === "trending" ? b.trending - a.trending : s === "funding" ? b.fundingRaised - a.fundingRaised : s === "alpha" ? a.name.localeCompare(b.name) : s === "viewed" ? b.views - a.views : s === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : b.addedAt.localeCompare(a.addedAt);

/* ---------- Quick view ---------- */
export function StartupQuickView({ s, open, onClose }: { s: Startup; open: boolean; onClose: () => void }) {
  const founder = getFounder(s.founderSlug);
  const evs = founder ? eventsForFounder(founder.slug).slice(0, 2) : [];
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="flex items-start gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[16px] font-black ring-4 ring-white shadow" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[20px] font-bold text-navy-900">{s.name}</h2>{s.verified && <BadgeCheck className="h-4 w-4 text-verified" />}<span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">{s.stage}</span></div><p className="text-[12.5px] text-slate-500">{s.tagline} · {s.industry} · {s.location}</p><p className="mt-2 text-[13px] text-slate-700">{s.overview.mission}</p></div></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Revenue", s.traction.revenue], ["Funding", fmtFunding(s.fundingRaised)], ["Team", `${s.teamSize}`], ["Growth", s.traction.growth]].map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-[10.5px] text-slate-500">{k}</p><p className="text-[13px] font-bold text-navy-900">{v}</p></div>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Looking for</p><div className="mt-1.5 flex flex-wrap gap-1.5">{s.lookingFor.map((l) => <span key={l} className="rounded-md bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-800">{l}</span>)}</div><p className="mt-3 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Sparkles className="h-3.5 w-3.5 text-gold-500" /> Recent</p><p className="text-[12.5px] font-semibold text-navy-900">{s.recentAchievement}</p></div>
        <div className="rounded-lg border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Founder</p>{founder && <Link to={`/founders/${founder.slug}`} onClick={onClose} className="mt-1.5 flex items-center gap-2"><Avatar initials={founder.initials} color={founder.color} size="sm" /><span><span className="block text-[12.5px] font-bold text-navy-900">{founder.name}</span><span className="text-[10.5px] text-slate-500">{founder.role}</span></span></Link>}{evs.length > 0 && <><p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Upcoming events</p>{evs.map((e) => <Link key={e.slug} to={`/events/${e.slug}`} onClick={onClose} className="block text-[12px] font-semibold text-navy-700 hover:underline">{e.title}</Link>)}</>}</div>
      </div>
      <div className="mt-5 flex gap-2"><Link to={`/startups/${s.slug}`} onClick={onClose} className="btn-navy flex-1 py-2.5">View Startup</Link><ContactFounderBtn s={s} className="flex-1" /></div>
    </Modal>
  );
}

/* ---------- Card ---------- */
export function StartupCard({ s, view = "grid" }: { s: Startup; view?: "grid" | "list" }) {
  const founder = getFounder(s.founderSlug);
  const list = view === "list";
  const [quick, setQuick] = useState(false);
  const inCompare = useStore((x) => x.compareStartups.includes(s.slug));
  return (
    <article className={cn("card group relative flex overflow-hidden", list ? "flex-col sm:flex-row" : "flex-col", inCompare && "ring-2 ring-gold-500")}>
      <div className={cn("relative shrink-0", list ? "sm:w-[260px]" : "")}>
        <Link to={`/startups/${s.slug}`} className={cn("relative block overflow-hidden", list ? "aspect-[16/9] sm:h-full sm:aspect-auto" : "aspect-[16/8]")}>
          <img src={s.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 to-transparent" />
        </Link>
        <div className="absolute right-3 top-3 flex gap-1.5"><SaveBtn type="startup" slug={s.slug} /><StartupShareBtn s={s} /></div>
        <label className="absolute left-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[10.5px] font-semibold text-slate-600 shadow-sm backdrop-blur hover:text-navy-900"><input type="checkbox" className="checkbox h-3.5 w-3.5" checked={inCompare} onChange={() => toggleCompareStartup(s.slug)} /> Compare</label>
        <button type="button" onClick={() => { track("clicks", s.slug); setQuick(true); }} aria-label={`Quick view ${s.name}`} className={cn("absolute flex h-14 w-14 items-center justify-center rounded-full text-[14px] font-black ring-4 ring-white shadow-md transition-transform hover:scale-105", list ? "bottom-3 left-3" : "-bottom-6 left-4")} style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</button>
        {s.verified && <span className={cn("absolute inline-flex items-center gap-1 rounded-full bg-navy-800 px-2 py-0.5 text-[9.5px] font-semibold text-white", list ? "bottom-4 left-20" : "-bottom-3 left-20")}><BadgeCheck className="h-3 w-3 text-gold-400" /> Verified</span>}
      </div>
      <div className={cn("flex flex-1 flex-col px-4 pb-4", list ? "pt-4" : "pt-8")}>
        <h3 className="text-[15.5px] font-bold text-navy-900"><Link to={`/startups/${s.slug}`} className="hover:text-navy-600">{s.name}</Link></h3>
        <p className="text-[12px] text-slate-500">{s.tagline}</p>
        <div className="mt-2 flex flex-wrap gap-1.5"><span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"><Building2 className="h-3 w-3" /> {s.industry}</span><span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">{s.stage}</span>{s.womenFounded && <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-800">Women-founded</span>}</div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.location}</span>{founder && <Link to={`/founders/${founder.slug}`} className="inline-flex items-center gap-1 hover:text-navy-800"><Users className="h-3 w-3" /> {founder.name}</Link>}</p>
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">{s.description}</p>
        <div className="mt-2.5 flex flex-wrap gap-1">{s.technologies.slice(0, 3).map((t) => <span key={t} className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium text-navy-700">{t}</span>)}</div>
        <div className="mt-3 flex items-center gap-4 border-t border-dashed border-line pt-3 text-[12px]"><span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4 text-navy-600" /><span><span className="block font-bold text-navy-900">{fmtFunding(s.fundingRaised)}</span><span className="text-[10px] text-slate-500">Funding</span></span></span><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-navy-600" /><span><span className="block font-bold text-navy-900">{s.teamSize}</span><span className="text-[10px] text-slate-500">Team</span></span></span><span className="inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-navy-600" /><span><span className="block font-bold text-navy-900">{s.traction.growth.split(" ")[0]}</span><span className="text-[10px] text-slate-500">Growth</span></span></span></div>
        <div className="hidden overflow-hidden transition-all duration-500 lg:block lg:max-h-0 lg:opacity-0 lg:group-hover:mt-3 lg:group-hover:max-h-40 lg:group-hover:opacity-100"><div className="rounded-lg bg-navy-50/70 p-3 text-[11px] text-navy-900"><p><span className="font-bold">Mission:</span> {s.overview.mission}</p><p className="mt-1"><span className="font-bold">Revenue:</span> {s.traction.revenue} · <span className="font-bold">Looking for:</span> {s.lookingFor.join(", ")}</p><p className="mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3 text-gold-500" /> {s.recentAchievement}</p></div></div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3.5"><Link to={`/startups/${s.slug}`} className="btn-navy py-2 text-[11.5px]">View Profile</Link><ContactFounderBtn s={s} size="sm" className="!bg-white !text-navy-800 border border-slate-300 hover:!bg-navy-50" /></div>
      </div>
      <StartupQuickView s={s} open={quick} onClose={() => setQuick(false)} />
    </article>
  );
}

/* ---------- Compare bar ---------- */
function CompareBar() {
  const slugs = useStore((x) => x.compareStartups);
  const [open, setOpen] = useState(false);
  const list = slugs.map(getStartup).filter(Boolean) as Startup[];
  if (!list.length) return null;
  const rows: [string, (s: Startup) => React.ReactNode][] = [["Industry", (s) => s.industry], ["Stage", (s) => s.stage], ["Founded", (s) => s.founded], ["Location", (s) => s.location], ["Funding raised", (s) => fmtFunding(s.fundingRaised)], ["Seeking", (s) => s.funding.seeking ?? "—"], ["Revenue", (s) => s.traction.revenue], ["Customers", (s) => s.traction.customers], ["Growth", (s) => s.traction.growth], ["Team size", (s) => s.teamSize], ["Business model", (s) => s.businessModel.join(", ")], ["Technologies", (s) => s.technologies.join(", ")], ["Looking for", (s) => s.lookingFor.join(", ")], ["Verified", (s) => (s.verified ? <Check className="mx-auto h-4 w-4 text-verified" /> : <X className="mx-auto h-4 w-4 text-slate-300" />)]];
  return (
    <>
      <div className="fixed inset-x-0 bottom-[57px] z-40 lg:bottom-0"><div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 border-t border-line bg-navy-900 px-4 py-3 text-white shadow-[0_-10px_30px_-12px_rgba(6,19,48,0.6)] sm:px-6 lg:mx-4 lg:mb-4 lg:rounded-xl lg:border lg:px-5 xl:mx-auto"><div className="flex min-w-0 items-center gap-3"><GitCompare className="h-5 w-5 shrink-0 text-gold-400" /><div className="flex -space-x-2">{list.map((s) => <span key={s.slug} className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black ring-2 ring-navy-900" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span>)}</div><p className="hidden truncate text-[12.5px] sm:block"><span className="font-semibold">{list.length}/3 selected</span> · {list.map((s) => s.name).join(", ")}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={clearCompareStartups} className="rounded-md px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/10">Clear</button><button type="button" onClick={() => setOpen(true)} disabled={list.length < 2} className="rounded-md bg-gold-500 px-4 py-2 text-[12px] font-bold text-navy-900 hover:bg-gold-400 disabled:opacity-50">Compare{list.length < 2 && " (pick 2+)"}</button></div></div></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Compare startups" size="lg">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[12.5px]"><thead><tr><th className="w-32" />{list.map((s) => <th key={s.slug} className="px-2 py-2 text-center"><Link to={`/startups/${s.slug}`} onClick={() => setOpen(false)} className="inline-flex flex-col items-center gap-1"><span className="flex h-12 w-12 items-center justify-center rounded-xl text-[13px] font-black" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span><span className="text-[13px] font-bold text-navy-900">{s.name}</span></Link></th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map(([k, fn]) => <tr key={k}><td className="py-2.5 pr-3 font-semibold text-slate-600">{k}</td>{list.map((s) => <td key={s.slug} className="px-2 py-2.5 text-center text-slate-700">{fn(s)}</td>)}</tr>)}</tbody></table></div>
      </Modal>
    </>
  );
}

/* ---------- Hero stats + spotlight ---------- */
function useCount(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => { let raf = 0; const t0 = performance.now(); const tick = (n: number) => { const p = Math.min(1, (n - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [target, ms]);
  return v;
}
function HeroStats() {
  const a = useCount(430), b = useCount(1200), c = useCount(85);
  return (
    <div className="grid grid-cols-3 divide-x divide-white/20 rounded-xl bg-white/10 px-2 py-3 text-center backdrop-blur-sm lg:min-w-[360px]">
      {[[`${a}+`, "Startups", Rocket], [`${b.toLocaleString("en-IN")}+`, "Founders", Users], [`$${c}M+`, "Funding Raised", Landmark]].map(([v, l, I]) => { const Icon = I as typeof Rocket; return <div key={l as string} className="px-2"><Icon className="mx-auto h-5 w-5 text-gold-400" /><p className="mt-1 text-[20px] font-black leading-none text-white tabular-nums">{v as string}</p><p className="text-[10.5px] text-white/75">{l as string}</p></div>; })}
    </div>
  );
}
function Spotlight() {
  const featured = startups.filter((s) => s.featured);
  const raising = startups.filter((s) => s.funding.status === "Raising").sort((a, b) => b.trending - a.trending).slice(0, 4);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-2">{featured.slice(0, 2).map((s) => <Link key={s.slug} to={`/startups/${s.slug}`} className="group relative overflow-hidden rounded-xl bg-navy-900 text-white shadow-[var(--shadow-card)]"><img src={s.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-transparent" /><div className="relative flex h-full min-h-[180px] flex-col justify-between p-4"><span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-bold text-navy-900"><Sparkles className="h-3 w-3" /> Featured Startup</span><div className="flex items-end gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl text-[13px] font-black ring-2 ring-white/40" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span><div><p className="text-[17px] font-black">{s.name}</p><p className="text-[11.5px] text-white/80">{s.tagline}</p></div></div></div></Link>)}</div>
      <div className="rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)]"><p className="flex items-center gap-1.5 text-[13px] font-bold text-navy-900"><Flame className="h-4 w-4 text-gold-500" /> Trending & raising now</p><ul className="mt-3 space-y-2.5">{raising.map((s) => <li key={s.slug}><Link to={`/startups/${s.slug}#funding`} className="group flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-black" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-bold text-navy-900 group-hover:text-navy-600">{s.name}</span><span className="block truncate text-[10.5px] text-slate-500">Seeking {s.funding.seeking} · {s.stage}</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-navy-600" /></Link></li>)}</ul><Link to="/investors" className="view-all mt-3">Browse investors <ArrowRight className="h-3.5 w-3.5" /></Link></div>
    </div>
  );
}

/* ---------- Results toolbar extras: export + saved filters ---------- */
function Toolbar() {
  const [params, setParams] = useSearchParams();
  const user = useStore((x) => x.user);
  const plan = useStore((x) => x.membership.plan);
  const [saved, setSaved] = useState<{ name: string; qs: string }[]>(() => { try { return JSON.parse(localStorage.getItem("wshub:startup-filters") || "[]"); } catch { return []; } });
  const qs = params.toString();
  const persist = (n: typeof saved) => { setSaved(n); localStorage.setItem("wshub:startup-filters", JSON.stringify(n)); };
  const exportCsv = () => {
    if (!user) return toast("Sign in to export", "info", "/login");
    if (plan === "free") return toast("Export is a Business+ member feature", "info", "/membership");
    const rows = [["Name", "Industry", "Stage", "Location", "Funding (L)", "Team", "Website"], ...startups.map((s) => [s.name, s.industry, s.stage, s.location, s.fundingRaised, s.teamSize, s.website])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" })); a.download = "wshub-startups.csv"; a.click(); toast("CSV exported");
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[12px]">
      <span className="flex items-center gap-1 font-semibold text-navy-900"><Bookmark className="h-3.5 w-3.5" /> Saved filters:</span>
      {saved.length === 0 && <span className="text-slate-500">none yet</span>}
      {saved.map((f) => <span key={f.name} className="inline-flex items-center gap-1 rounded-full bg-navy-50 py-1 pl-3 pr-1 font-medium text-navy-800"><button type="button" onClick={() => setParams(new URLSearchParams(f.qs))}>{f.name}</button><button type="button" aria-label={`Delete ${f.name}`} onClick={() => persist(saved.filter((x) => x.name !== f.name))} className="rounded-full p-0.5 hover:bg-navy-100"><X className="h-3 w-3" /></button></span>)}
      {qs && <button type="button" onClick={() => { const name = window.prompt("Name this filter set", "My startups view"); if (name) persist([...saved.filter((x) => x.name !== name), { name, qs }]); }} className="rounded-md border border-slate-300 px-2.5 py-1 font-semibold text-navy-800 hover:bg-navy-50">+ Save current</button>}
      <button type="button" onClick={exportCsv} className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 font-semibold text-navy-800 hover:bg-navy-50"><Download className="h-3.5 w-3.5" /> Export <span className="text-[10px] text-slate-500">(Members)</span></button>
    </div>
  );
}

export default function Startups() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError, setBusinessesError] = useState("");
  useEffect(() => {
    let active = true;
    businessApi.list({ page: 1, limit: 12, sort: "newest", listingType: "startup" })
      .then((result: any) => { if (active) setBusinesses(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []); })
      .catch((reason: unknown) => { if (active) setBusinessesError(reason instanceof Error ? reason.message : "Businesses could not be loaded."); })
      .finally(() => { if (active) setBusinessesLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <section className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6 lg:px-8" aria-labelledby="listed-businesses-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-gold-700">WS Hub directory</p><h2 id="listed-businesses-heading" className="mt-1 text-2xl font-black text-navy-900">Businesses & startups</h2><p className="mt-1 text-[13px] text-slate-600">Explore businesses listed by founders in the WS Hub community.</p></div>
          <Link to="/businesses" className="inline-flex items-center gap-1 text-[12px] font-bold text-navy-800 hover:text-gold-800">Browse all businesses <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {businessesLoading ? <BusinessCardShimmer count={6} /> : businessesError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{businessesError}</div> : businesses.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {businesses.map((business) => <article key={business.id || business.slug} className="group overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg">
            <Link to={`/businesses/${encodeURIComponent(business.slug || business.id)}`} aria-label={`View ${business.name}`} className="block aspect-[16/8] overflow-hidden bg-navy-50">{(business.cover_url || business.coverUrl) ? <img src={business.cover_url || business.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-navy-300"><Building2 className="h-12 w-12" /></div>}</Link>
            <div className="p-4"><div className="flex items-center gap-3">{(business.logo_url || business.logoUrl) ? <img src={business.logo_url || business.logoUrl} alt="" className="h-11 w-11 rounded-lg border border-line object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-sm font-black text-white">{String(business.name || "WS").slice(0, 2).toUpperCase()}</span>}<div className="min-w-0"><h3 className="truncate text-[15px] font-bold text-navy-900"><Link to={`/businesses/${encodeURIComponent(business.slug || business.id)}`} className="hover:text-gold-800">{business.name}</Link></h3><p className="truncate text-[11.5px] text-slate-500">{business.category?.name || business.category || "Business"}{business.city ? ` · ${business.city}` : ""}</p></div></div>
              <p className="mt-3 line-clamp-2 min-h-10 text-[12.5px] leading-relaxed text-slate-600">{business.description || "Discover this business and its portfolio on WS Hub."}</p><Link to={`/businesses/${encodeURIComponent(business.slug || business.id)}`} className="btn-navy mt-3 flex items-center justify-center gap-1.5 py-2.5 text-[11.5px]">View business <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </article>)}
        </div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-9 text-center text-[13px] text-slate-600">No published business listings are available yet.</div>}
      </section>
      <DirectoryPage<Startup>
        entity="Startups" singular="Startup" breadcrumb="Startups"
        title={["Discover", "Startups"]} subtitle="Innovative ideas. Bold founders. A stronger Warangal. Find startups building the future, connect with founders and discover investment opportunities."
        quote={["From Warangal", "to the World"]} heroImage={HERO} heroAside={<HeroStats />}
        searchPlaceholder="Search startups by name, founder, technology, industry..."
        quickFilters={startupCategories.map((c) => ({ label: c, params: { category: c } }))}
        filters={[{ key: "category", label: "Category", type: "select", options: startupCategories, placeholder: "All Categories" }, ...filters]}
        sorts={[{ value: "recent", label: "Newest" }, { value: "trending", label: "Trending" }, { value: "funding", label: "Funding" }, { value: "alpha", label: "Alphabetical" }, { value: "viewed", label: "Most Viewed" }, { value: "updated", label: "Recently Updated" }]}
        items={[]} match={match} sort={sortFn} keyOf={(s) => s.slug} renderCard={(s, v) => <StartupCard s={s} view={v} />} pageSize={8}
        beforeResults={<Spotlight />} resultsToolbar={<Toolbar />}
        cta={{ title: "Are you a startup founder?", text: "List your startup on WS Hub and get discovered by investors, partners and customers.", button: "Register Your Startup", to: "/dashboard?tab=startup", icon: <Rocket className="h-7 w-7" strokeWidth={1.6} /> }}
        banner={{ title: "Innovative ideas.", highlight: "Bold founders.", text: "Explore the startups shaping Warangal's next decade.", image: "/images/cta-bg.jpg" }}
        emptyHint="No startups match these filters. Reset filters or widen the stage and funding range."
      />
      <CompareBar />
    </>
  );
}
