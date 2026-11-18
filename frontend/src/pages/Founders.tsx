import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, CalendarDays, Check, Flame, GitCompare, MapPin, Sparkles, Target, Users, X } from "lucide-react";
import { featuredFounder, founderIndustries, founderLanguages, founderLookingFor, founderQuick, founderRevenues, founders, founderSkills, getFounder, mutualNames, recentFounders, trendingFounders, type Founder } from "../founders";
import { eventsForFounder, fmtEventDate } from "../events";
import { getOpportunity } from "../opportunities";
import { DirectoryPage, type FilterValues } from "../components/DirectoryPage";
import { ConnectBtn, IntroBtn, SaveBtn, ShareBtn } from "../components/ui/Actions";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ProfileShell";
import { clearCompare, toggleCompare, track, useStore } from "../store";
import { cn } from "../utils/cn";

const HERO = "https://images.pexels.com/photos/3307831/pexels-photo-3307831.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1400";

const filters = [
  { key: "industry", label: "Industry", type: "select" as const, options: founderIndustries },
  { key: "stage", label: "Startup Stage", type: "checks" as const, options: ["Ideation", "Pre-Seed", "Seed", "Early Stage", "Growth", "Established"] },
  { key: "skills", label: "Skills", type: "select" as const, options: founderSkills, placeholder: "Select Skills" },
  { key: "experience", label: "Experience", type: "select" as const, options: ["0 – 2 years", "3 – 5 years", "6 – 10 years", "10+ years"], placeholder: "Any" },
  { key: "looking", label: "Looking For", type: "checks" as const, options: founderLookingFor.slice(0, 6) },
  { key: "location", label: "Location", type: "select" as const, options: ["Warangal", "Hanamkonda", "Kazipet"] },
  { key: "revenue", label: "Startup Revenue", type: "select" as const, options: founderRevenues, placeholder: "Any" },
  { key: "funding", label: "Funding Raised", type: "select" as const, options: ["Bootstrapped", "Under ₹50L", "₹50L – ₹2Cr", "₹2Cr+"], placeholder: "Any" },
  { key: "availability", label: "Availability", type: "select" as const, options: ["Open to connect", "Selective", "Busy"], placeholder: "Any" },
  { key: "language", label: "Languages", type: "select" as const, options: founderLanguages, placeholder: "Any" },
  { key: "women", label: "Women Founder", type: "toggle" as const, placeholder: "Women founders only" },
  { key: "student", label: "Student Founder", type: "toggle" as const, placeholder: "Student founders only" },
  { key: "verified", label: "Verified Only", type: "toggle" as const, placeholder: "Show verified founders only" },
];

const expMatch = (y: number, f: string) => !f || (f === "0 – 2 years" ? y <= 2 : f === "3 – 5 years" ? y >= 3 && y <= 5 : f === "6 – 10 years" ? y >= 6 && y <= 10 : y > 10);
const fundMatch = (l: number, f: string) => !f || (f === "Bootstrapped" ? l === 0 : f === "Under ₹50L" ? l > 0 && l < 50 : f === "₹50L – ₹2Cr" ? l >= 50 && l < 200 : l >= 200);

function match(x: Founder, q: string, f: FilterValues) {
  if (q) {
    const hay = [x.name, x.company, x.industry, x.location, x.bio, ...x.tags, ...x.skills, ...x.quick].join(" ").toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.quick && !x.quick.includes(f.quick as string)) return false;
  if (f.industry && x.industry !== f.industry) return false;
  if ((f.stage as string[]).length && !(f.stage as string[]).includes(x.stage)) return false;
  if (f.location && x.location !== f.location) return false;
  if (!expMatch(x.experience, f.experience as string)) return false;
  if ((f.looking as string[]).length && !(f.looking as string[]).some((l) => x.lookingFor.includes(l as never))) return false;
  if (f.availability && x.availability !== f.availability) return false;
  if (f.skills && !x.skills.includes(f.skills as string)) return false;
  if (f.language && !x.languages.includes(f.language as string)) return false;
  if (f.revenue && x.revenueRange !== f.revenue) return false;
  if (!fundMatch(x.fundingRaised, f.funding as string)) return false;
  if (f.women && !x.women) return false;
  if (f.student && !x.student) return false;
  if (f.verified && !x.verified) return false;
  return true;
}
const sortFn = (a: Founder, b: Founder, s: string) =>
  s === "trending" ? b.trending - a.trending : s === "viewed" ? b.views - a.views : s === "mutual" ? b.mutual - a.mutual : b.joinedAt.localeCompare(a.joinedAt);

/* ---------- Quick View ---------- */
export function FounderQuickView({ f, open, onClose }: { f: Founder; open: boolean; onClose: () => void }) {
  const opps = f.openRequirements.map(getOpportunity).filter(Boolean);
  const evs = eventsForFounder(f.slug).slice(0, 2);
  const mutual = mutualNames(f);
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Avatar initials={f.initials} color={f.color} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-[20px] font-bold text-navy-900">{f.name}</h2>{f.verified && <BadgeCheck className="h-4 w-4 text-verified" />}<span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">{f.stage}</span></div>
          <p className="text-[12.5px] text-slate-500">{f.role}, {f.company} · {f.industry} · {f.location}</p>
          <p className="mt-2 text-[13px] text-slate-700">{f.about}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Startup</p><p className="mt-1 text-[13.5px] font-bold text-navy-900">{f.company}</p><p className="text-[12px] text-slate-600">{f.startup.description}</p><p className="mt-1 text-[11.5px] text-slate-500">{f.startup.revenue} · {f.startup.customers}</p></div>
        <div className="rounded-lg border border-line p-3"><p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Sparkles className="h-3.5 w-3.5 text-gold-500" /> Recent achievement</p><p className="mt-1 text-[13px] font-semibold text-navy-900">{f.recentAchievement}</p><p className="mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Users className="h-3.5 w-3.5" /> Common connections</p><p className="text-[12px] text-slate-600">{f.mutual ? `${f.mutual} mutual${mutual.length ? ` — ${mutual.join(", ")}` : ""}` : "None yet"}</p></div>
        <div className="rounded-lg border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Open opportunities</p>{opps.length ? <ul className="mt-1 space-y-1">{opps.map((o) => o && <li key={o.slug}><Link to={`/opportunities/${o.slug}`} onClick={onClose} className="text-[12.5px] font-semibold text-navy-700 hover:underline">{o.title}</Link></li>)}</ul> : <p className="mt-1 text-[12px] text-slate-500">None open right now</p>}</div>
        <div className="rounded-lg border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Upcoming events</p>{evs.length ? <ul className="mt-1 space-y-1">{evs.map((e) => <li key={e.slug}><Link to={`/events/${e.slug}`} onClick={onClose} className="text-[12.5px] font-semibold text-navy-700 hover:underline">{e.title}</Link><span className="block text-[10.5px] text-slate-500"><CalendarDays className="mr-1 inline h-3 w-3" />{fmtEventDate(e.start)}</span></li>)}</ul> : <p className="mt-1 text-[12px] text-slate-500">No upcoming talks</p>}</div>
      </div>
      <div className="mt-5 flex gap-2"><Link to={`/founders/${f.slug}`} onClick={onClose} className="btn-navy flex-1 py-2.5">Open Profile</Link><ConnectBtn founderSlug={f.slug} founderName={f.name} className="flex-1" /></div>
    </Modal>
  );
}

/* ---------- Card ---------- */
export function FounderCard({ f, view = "grid" }: { f: Founder; view?: "grid" | "list" }) {
  const list = view === "list";
  const [quick, setQuick] = useState(false);
  const inCompare = useStore((s) => s.compare.includes(f.slug));
  return (
    <article className={cn("card group relative flex overflow-hidden", list ? "flex-col sm:flex-row sm:items-start" : "flex-col", inCompare && "ring-2 ring-gold-500")}>
      <div className="absolute right-3 top-3 z-10 flex gap-1.5"><SaveBtn type="founder" slug={f.slug} /><ShareBtn title={`${f.name} — ${f.company}`} path={`/founders/${f.slug}`} /></div>
      <label className="absolute left-3 top-3 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[10.5px] font-semibold text-slate-600 shadow-sm backdrop-blur hover:text-navy-900" title="Add to compare">
        <input type="checkbox" className="checkbox h-3.5 w-3.5" checked={inCompare} onChange={() => toggleCompare(f.slug)} /> Compare
      </label>
      <div className={cn("flex flex-col items-center px-4 pt-10 text-center", list ? "sm:w-[200px] sm:shrink-0 sm:border-r sm:border-line sm:pb-6" : "")}>
        <button type="button" onClick={() => { track("clicks", f.slug); setQuick(true); }} className="rounded-full transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold-400" aria-label={`Quick view ${f.name}`}>
          <Avatar initials={f.initials} color={f.color} size="lg" />
        </button>
        {f.verified && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-navy-800 px-2 py-0.5 text-[9.5px] font-semibold text-white"><BadgeCheck className="h-3 w-3 text-gold-400" /> Verified</span>}
        <h3 className="mt-2 text-[15px] font-bold text-navy-900"><Link to={`/founders/${f.slug}`} className="hover:text-navy-600">{f.name}</Link></h3>
        <p className="text-[11.5px] text-slate-500">{f.role}, {f.businessSlug ? <Link to={`/businesses/${f.businessSlug}`} className="font-medium text-navy-700 hover:underline">{f.company}</Link> : f.company}</p>
      </div>
      <div className={cn("flex flex-1 flex-col px-4 pb-4", list ? "pt-4 sm:pt-10" : "pt-3")}>
        <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {f.tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{t}</span>)}
          <span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">{f.stage}</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {f.location}</span>
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {f.experience} yrs experience</span>
          <span className="inline-flex items-center gap-1 truncate"><Target className="h-3 w-3 shrink-0" /> {f.lookingFor.slice(0, 2).join(", ")}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {f.mutual} mutual</span>
        </div>
        <p className="mt-2.5 text-center text-[12.5px] leading-relaxed text-slate-600 sm:text-left">{f.bio}</p>
        <div className="mt-3 hidden overflow-hidden rounded-lg bg-navy-50/70 text-[11px] text-navy-900 transition-all duration-500 lg:block lg:max-h-0 lg:opacity-0 lg:group-hover:max-h-32 lg:group-hover:opacity-100">
          <ul className="space-y-1 p-3">
            <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-gold-500" /> <span className="font-semibold">Recent:</span> {f.recentAchievement}</li>
            <li className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-navy-600" /> <span className="font-semibold">Open requirements:</span> {f.openRequirements.length || "None"}</li>
            <li className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-navy-600" /> <span className="font-semibold">Revenue:</span> {f.revenueRange}</li>
          </ul>
        </div>
        <div className="mt-auto space-y-2 pt-3.5">
          <Link to={`/founders/${f.slug}`} className="btn-navy w-full py-2 text-[11.5px]">View Profile</Link>
          <div className="grid grid-cols-2 gap-2"><IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} size="sm" /><ConnectBtn founderSlug={f.slug} founderName={f.name} size="sm" /></div>
        </div>
      </div>
      <FounderQuickView f={f} open={quick} onClose={() => setQuick(false)} />
    </article>
  );
}

/* ---------- Compare ---------- */
function CompareBar() {
  const slugs = useStore((s) => s.compare);
  const [open, setOpen] = useState(false);
  const list = slugs.map(getFounder).filter(Boolean) as Founder[];
  if (!list.length) return null;
  const rows: [string, (f: Founder) => React.ReactNode][] = [
    ["Startup", (f) => f.company], ["Industry", (f) => f.industry], ["Stage", (f) => f.stage], ["Location", (f) => f.location], ["Experience", (f) => `${f.experience} yrs`],
    ["Revenue", (f) => f.revenueRange], ["Funding raised", (f) => (f.fundingRaised ? `₹${f.fundingRaised} L` : "Bootstrapped")], ["Team size", (f) => f.team.length], ["Looking for", (f) => f.lookingFor.join(", ")],
    ["Skills", (f) => f.skills.join(", ")], ["Languages", (f) => f.languages.join(", ")], ["Availability", (f) => f.availability], ["Verified", (f) => (f.verified ? <Check className="mx-auto h-4 w-4 text-verified" /> : <X className="mx-auto h-4 w-4 text-slate-300" />)], ["Mutual connections", (f) => f.mutual],
  ];
  return (
    <>
      <div className="fixed inset-x-0 bottom-[57px] z-40 lg:bottom-0"><div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 border-t border-line bg-navy-900 px-4 py-3 text-white shadow-[0_-10px_30px_-12px_rgba(6,19,48,0.6)] sm:px-6 lg:mx-4 lg:mb-4 lg:rounded-xl lg:border lg:px-5 xl:mx-auto">
        <div className="flex min-w-0 items-center gap-3"><GitCompare className="h-5 w-5 shrink-0 text-gold-400" /><div className="flex -space-x-2">{list.map((f) => <span key={f.slug} className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white ring-2 ring-navy-900" style={{ background: f.color }}>{f.initials}</span>)}</div><p className="hidden truncate text-[12.5px] sm:block"><span className="font-semibold">{list.length}/3 selected</span> · {list.map((f) => f.name.split(" ")[0]).join(", ")}</p></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={clearCompare} className="rounded-md px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/10">Clear</button><button type="button" onClick={() => setOpen(true)} disabled={list.length < 2} className="rounded-md bg-gold-500 px-4 py-2 text-[12px] font-bold text-navy-900 hover:bg-gold-400 disabled:opacity-50">Compare{list.length < 2 && " (pick 2+)"}</button></div>
      </div></div>
      <Modal open={open} onClose={() => setOpen(false)} title="Compare founders" subtitle="Side-by-side view" size="lg">
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[12.5px]">
          <thead><tr><th className="w-36 py-2" /> {list.map((f) => <th key={f.slug} className="px-2 py-2 text-center"><Link to={`/founders/${f.slug}`} onClick={() => setOpen(false)} className="inline-flex flex-col items-center gap-1"><Avatar initials={f.initials} color={f.color} size="md" /><span className="text-[13px] font-bold text-navy-900">{f.name}</span></Link></th>)}</tr></thead>
          <tbody className="divide-y divide-line">{rows.map(([k, fn]) => <tr key={k}><td className="py-2.5 pr-3 font-semibold text-slate-600">{k}</td>{list.map((f) => <td key={f.slug} className="px-2 py-2.5 text-center text-slate-700">{fn(f)}</td>)}</tr>)}</tbody>
        </table></div>
        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0,1fr))` }}>{list.map((f) => <ConnectBtn key={f.slug} founderSlug={f.slug} founderName={f.name} size="sm" />)}</div>
      </Modal>
    </>
  );
}

/* ---------- Hero extras ---------- */
function Discover() {
  const ff = featuredFounder;
  if (!ff) return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-[15px] font-bold text-navy-900">No founder profiles yet</h2><p className="mt-1 text-[12px] text-slate-500">Founder profiles will appear here when they are available from WS Hub.</p></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
      <Link to={`/founders/${ff.slug}`} className="group relative overflow-hidden rounded-xl bg-navy-900 text-white shadow-[var(--shadow-card)]">
        <img src={ff.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-5">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[10.5px] font-bold text-navy-900"><Sparkles className="h-3 w-3" /> Featured Founder</span>
          <div className="mt-8 flex items-end gap-3"><Avatar initials={ff.initials} color={ff.color} size="lg" /><div><p className="text-[20px] font-black">{ff.name}</p><p className="text-[12.5px] text-white/80">{ff.role}, {ff.company} · {ff.recentAchievement}</p><p className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-gold-400">View profile <ArrowRight className="h-3.5 w-3.5" /></p></div></div>
        </div>
      </Link>
      {[{ t: "Trending Founders", icon: Flame, list: trendingFounders(4), meta: (f: Founder) => `${f.views.toLocaleString("en-IN")} views` }, { t: "Recently Joined", icon: Users, list: recentFounders(4), meta: (f: Founder) => `Joined ${new Date(f.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` }].map((b) => (
        <div key={b.t} className="rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-navy-900"><b.icon className="h-4 w-4 text-gold-500" /> {b.t}</p>
          <ul className="mt-3 space-y-2.5">{b.list.map((f) => <li key={f.slug}><Link to={`/founders/${f.slug}`} className="group flex items-center gap-2.5"><Avatar initials={f.initials} color={f.color} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-bold text-navy-900 group-hover:text-navy-600">{f.name}</span><span className="block truncate text-[10.5px] text-slate-500">{f.company} · {b.meta(f)}</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-600" /></Link></li>)}</ul>
        </div>
      ))}
    </div>
  );
}

export default function Founders() {
  return (
    <>
      <DirectoryPage<Founder>
        entity="Founders" singular="Founder" breadcrumb="Founders"
        title={["Meet", "Founders"]} subtitle="Connect with visionary founders building Warangal's future."
        quote={["Big ideas.", "Stronger together"]} heroImage={HERO}
        searchPlaceholder="Search founders by name, skills, industry or company..."
        quickFilters={founderQuick.map((l) => ({ label: l, params: { quick: l } }))}
        filters={[{ key: "quick", label: "Focus", type: "select", options: founderQuick, placeholder: "Any focus" }, ...filters]}
        sorts={[{ value: "recent", label: "Recently Added" }, { value: "trending", label: "Trending" }, { value: "viewed", label: "Most Viewed" }, { value: "mutual", label: "Most Mutual Connections" }]}
        items={[]} match={match} sort={sortFn} keyOf={(f) => f.slug} renderCard={(f, v) => <FounderCard f={f} view={v} />}
        beforeResults={<Discover />}
        cta={{ title: "Are you a founder?", text: "Create your profile, showcase your journey, and connect with investors, mentors and partners.", button: "Join as a Founder", to: "/signup?role=founder", icon: <Users className="h-7 w-7" strokeWidth={1.6} /> }}
        banner={{ title: "Local Founders.", highlight: "Global Impact.", text: "Warangal is home to bold builders. Be part of the movement.", image: "/images/cta-bg.jpg" }}
        emptyHint="No founders match these filters yet. Try widening the stage or industry, or invite a founder you know."
      />
      <CompareBar />
    </>
  );
}
