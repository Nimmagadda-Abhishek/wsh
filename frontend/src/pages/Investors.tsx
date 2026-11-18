import { Link } from "react-router-dom";
import { BadgeCheck, Briefcase, Landmark, MapPin, PieChart, Wallet } from "lucide-react";
import { investorQuick, investorRanges, investors, investorSectors, ticketLabel, type Investor, type InvestorType } from "../investors";
import { DirectoryPage, type FilterValues } from "../components/DirectoryPage";
import { InterestedBtn, IntroBtn, SaveBtn, ShareBtn } from "../components/ui/Actions";
import { getState } from "../store";
import { Avatar } from "../components/ProfileShell";
import { cn } from "../utils/cn";

const HERO = "https://images.pexels.com/photos/7433919/pexels-photo-7433919.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1400";
const quickToType: Record<string, InvestorType> = {
  "Angel Investors": "Angel Investor", "VC Firms": "VC Firm", "Angel Networks": "Angel Network", "Family Offices": "Family Office", "Corporate Investors": "Corporate", Government: "Government", CSR: "CSR", Accelerators: "Accelerator", Incubators: "Incubator",
};
const types = Object.values(quickToType);

const filters = [
  { key: "type", label: "Investor Type", type: "select" as const, options: types, placeholder: "All Types" },
  { key: "stage", label: "Investment Stage", type: "checks" as const, options: ["Pre-Seed", "Seed", "Series A", "Series B+", "Growth"] },
  { key: "sector", label: "Industry Interest", type: "select" as const, options: investorSectors, placeholder: "Select Industry" },
  { key: "location", label: "Location", type: "select" as const, options: ["Warangal", "Hyderabad", "Bengaluru", "Mumbai", "New Delhi"] },
  { key: "range", label: "Investment Range", type: "select" as const, options: investorRanges.slice(1).map((r) => r.label), placeholder: "Any Range" },
  { key: "looking", label: "Looking For", type: "checks" as const, options: ["Startups", "Partnerships", "Co-Investors", "Advisory"] },
  { key: "format", label: "Format", type: "select" as const, options: ["Equity", "Grant", "Convertible", "Debt"], placeholder: "Any" },
  { key: "portfolio", label: "Portfolio Size", type: "select" as const, options: ["Under 10", "10 – 25", "25+"], placeholder: "Any" },
  { key: "verified", label: "Verified", type: "toggle" as const, placeholder: "Verified only" },
  { key: "active", label: "Active Portfolio", type: "toggle" as const, placeholder: "Actively investing" },
  { key: "saved", label: "Saved", type: "toggle" as const, placeholder: "Saved investors only" },
];

function match(x: Investor, q: string, f: FilterValues) {
  if (q) {
    const hay = [x.name, x.firm, x.type, x.location, x.bio, ...x.sectors, ...x.stages, ...x.focus].join(" ").toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.type && x.type !== f.type) return false;
  if ((f.stage as string[]).length && !(f.stage as string[]).some((s) => x.stages.includes(s as never))) return false;
  if (f.sector && !x.sectors.includes(f.sector as string) && !(x.sectors.includes("Sector Agnostic"))) return false;
  if (f.location && x.location !== f.location) return false;
  if (f.range) {
    const r = investorRanges.find((r) => r.label === f.range);
    if (r && (x.ticketMax < r.min || x.ticketMin > r.max)) return false;
  }
  if ((f.looking as string[]).length && !(f.looking as string[]).some((l) => x.lookingFor.includes(l as never))) return false;
  if (f.format && !x.format.includes(f.format as never)) return false;
  if (f.portfolio) {
    const n = x.portfolioSize;
    if (f.portfolio === "Under 10" ? n >= 10 : f.portfolio === "10 – 25" ? n < 10 || n > 25 : n <= 25) return false;
  }
  if (f.verified && !x.verified) return false;
  if (f.active && !x.active) return false;
  if (f.saved && !getState().saved.investor.includes(x.slug)) return false;
  return true;
}
const sortFn = (a: Investor, b: Investor, s: string) =>
  s === "viewed" ? b.views - a.views : s === "ticket" ? b.ticketMax - a.ticketMax : s === "portfolio" ? b.portfolioSize - a.portfolioSize : b.joinedAt.localeCompare(a.joinedAt);

export function InvestorCard({ i, view = "grid" }: { i: Investor; view?: "grid" | "list" }) {
  const list = view === "list";
  return (
    <article className={cn("card group relative flex overflow-hidden", list ? "flex-col sm:flex-row sm:items-start" : "flex-col")}>
      <div className="absolute right-3 top-3 z-10 flex gap-1.5"><SaveBtn type="investor" slug={i.slug} /><ShareBtn title={`${i.name} — ${i.type}`} path={`/investors/${i.slug}`} /></div>
      {!i.active && <span className="absolute left-3 top-3 rounded-full bg-slate-200 px-2 py-0.5 text-[9.5px] font-semibold text-slate-600">Not active</span>}
      <div className={cn("flex flex-col items-center px-4 pt-6 text-center", list ? "sm:w-[200px] sm:shrink-0 sm:border-r sm:border-line sm:pb-6" : "")}>
        <Link to={`/investors/${i.slug}`} className="transition-transform duration-300 group-hover:scale-105"><Avatar initials={i.initials} color={i.color} size="lg" /></Link>
        {i.verified && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-navy-800 px-2 py-0.5 text-[9.5px] font-semibold text-white"><BadgeCheck className="h-3 w-3 text-gold-400" /> Verified</span>}
        <h3 className="mt-2 text-[15px] font-bold text-navy-900"><Link to={`/investors/${i.slug}`} className="hover:text-navy-600">{i.name}</Link></h3>
        <p className="text-[11.5px] text-slate-500">{i.type}{i.firm !== "Independent" && ` · ${i.firm}`}</p>
      </div>
      <div className={cn("flex flex-1 flex-col px-4 pb-4", list ? "pt-4 sm:pt-6" : "pt-3")}>
        <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {i.stages.map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{s}</span>)}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {i.location}</span>
          <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> {ticketLabel(i)}</span>
          <span className="inline-flex items-center gap-1"><PieChart className="h-3 w-3" /> {i.portfolioSize} portfolio</span>
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {i.format.join(", ")}</span>
        </div>
        <p className="mt-2.5 text-center text-[12.5px] leading-relaxed text-slate-600 sm:text-left">{i.bio}</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {i.sectors.slice(0, 3).map((s) => <span key={s} className="rounded-md bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">{s}</span>)}
        </div>
        <div className="mt-auto space-y-2 pt-3.5">
          <Link to={`/investors/${i.slug}`} className="btn-navy w-full py-2 text-[11.5px]">View Profile</Link>
          <div className="grid grid-cols-2 gap-2">
            <InterestedBtn investorSlug={i.slug} investorName={i.name} size="sm" />
            <IntroBtn targetType="investor" targetSlug={i.slug} targetName={i.name} size="sm" />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Investors() {
  return (
    <DirectoryPage<Investor>
      entity="Investors"
      singular="Investor"
      breadcrumb="Investors"
      title={["Connect with", "Investors"]}
      subtitle="Explore angel investors, VCs and funds interested in innovative ideas from Warangal and beyond."
      quote={["Capital for", "brighter tomorrows"]}
      heroImage={HERO}
      searchPlaceholder="Search investors by name, firm, investment stage or industry..."
      quickFilters={[...investorQuick.map((l) => ({ label: l, params: { type: quickToType[l] } })), { label: "Saved", params: { saved: "1" } }]}
      filters={filters}
      sorts={[
        { value: "recent", label: "Recently Added" },
        { value: "viewed", label: "Most Viewed" },
        { value: "ticket", label: "Largest Ticket" },
        { value: "portfolio", label: "Portfolio Size" },
      ]}
      items={[]}
      match={match}
      sort={sortFn}
      keyOf={(i) => i.slug}
      renderCard={(i, v) => <InvestorCard i={i} view={v} />}
      cta={{ title: "Are you an investor?", text: "Discover promising startups, connect with founders and be part of Warangal's growth story.", button: "Join as an Investor", to: "/signup?role=investor", icon: <Landmark className="h-7 w-7" strokeWidth={1.6} /> }}
      banner={{ title: "Invest in People.", highlight: "Build the Future.", text: "Back the founders shaping North Telangana's next decade.", image: "/images/cta-bg.jpg" }}
    />
  );
}
