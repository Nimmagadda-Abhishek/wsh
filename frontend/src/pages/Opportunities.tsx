import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, CalendarDays, Eye, Inbox, MapPin, Users, Wallet } from "lucide-react";
import { daysLeft, fmtDate, oppBudgets, oppIndustries, oppPosters, oppQuick, oppStages, oppTypes, opportunities, posterLink, typeColor, type Opportunity } from "../opportunities";
import { DirectoryPage, type FilterValues } from "../components/DirectoryPage";
import { ApplyBtn, SaveBtn, ShareBtn } from "../components/ui/Actions";
import { cn } from "../utils/cn";

const filters = [
  { key: "type", label: "Category", type: "select" as const, options: oppTypes, placeholder: "All Categories" },
  { key: "industry", label: "Industry", type: "select" as const, options: oppIndustries },
  { key: "location", label: "Location", type: "select" as const, options: ["Warangal", "Hanamkonda", "Telangana", "India", "Bengaluru"] },
  { key: "budget", label: "Budget", type: "select" as const, options: oppBudgets.slice(1).map((b) => b.label), placeholder: "Any Budget" },
  { key: "deadline", label: "Deadline", type: "select" as const, options: ["Next 7 days", "Next 30 days", "Next 90 days"], placeholder: "Any Time" },
  { key: "poster", label: "Posted By", type: "checks" as const, options: oppPosters },
  { key: "stage", label: "Startup Stage", type: "checks" as const, options: oppStages },
  { key: "urgency", label: "Urgency", type: "select" as const, options: ["High", "Medium", "Low"], placeholder: "Any" },
  { key: "verified", label: "Verified", type: "toggle" as const, placeholder: "Verified posters only" },
];

function match(o: Opportunity, q: string, f: FilterValues) {
  if (q) {
    const hay = [o.title, o.type, o.industry, o.location, o.summary, o.postedBy.name, ...o.tags].join(" ").toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.group) {
    const g = oppQuick.find((x) => x.label === f.group);
    if (g && !g.types.includes(o.type)) return false;
  }
  if (f.type && o.type !== f.type) return false;
  if (f.industry && o.industry !== f.industry) return false;
  if (f.location && o.location !== f.location && !o.location.includes(f.location as string)) return false;
  if (f.budget) {
    const b = oppBudgets.find((b) => b.label === f.budget);
    if (b && (o.budgetValue < b.min || o.budgetValue > b.max)) return false;
  }
  if (f.deadline) {
    const d = daysLeft(o.deadline);
    const lim = f.deadline === "Next 7 days" ? 7 : f.deadline === "Next 30 days" ? 30 : 90;
    if (d < 0 || d > lim) return false;
  }
  if ((f.poster as string[]).length && !(f.poster as string[]).includes(o.postedBy.type)) return false;
  if ((f.stage as string[]).length && !(f.stage as string[]).some((s) => o.stage.includes(s))) return false;
  if (f.urgency && o.urgency !== f.urgency) return false;
  if (f.verified && !o.verified) return false;
  return true;
}
const sortFn = (a: Opportunity, b: Opportunity, s: string) =>
  s === "deadline" ? a.deadline.localeCompare(b.deadline) : s === "viewed" ? b.views - a.views : s === "budget" ? b.budgetValue - a.budgetValue : s === "applicants" ? b.applicants - a.applicants : b.postedAt.localeCompare(a.postedAt);

export function DeadlineBadge({ iso }: { iso: string }) {
  const d = daysLeft(iso);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", d < 0 ? "text-slate-400" : d <= 7 ? "text-red-600" : "text-slate-500")}>
      <CalendarDays className="h-3 w-3" /> {d < 0 ? "Closed" : `Apply by ${fmtDate(iso)}`}{d >= 0 && d <= 7 && ` · ${d}d left`}
    </span>
  );
}

export function OpportunityCard({ o, view = "list" }: { o: Opportunity; view?: "grid" | "list" }) {
  const closed = daysLeft(o.deadline) < 0 || o.status === "Closed";
  const link = posterLink(o.postedBy);
  return (
    <article className={cn("card group relative flex overflow-hidden", view === "list" ? "flex-col md:flex-row md:items-stretch" : "flex-col")}>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold", typeColor[o.type])}>{o.type}</span>
          {o.status === "Closing Soon" && !closed && <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Closing soon</span>}
          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold", o.urgency === "High" ? "bg-orange-100 text-orange-700" : o.urgency === "Medium" ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-500")}>{o.urgency} priority</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-slate-400"><Eye className="h-3 w-3" /> {o.views.toLocaleString("en-IN")}</span>
        </div>
        <h3 className="mt-2 text-[16px] font-bold leading-snug text-navy-900"><Link to={`/opportunities/${o.slug}`} className="hover:text-navy-600">{o.title}</Link></h3>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-slate-600">
          <Building2 className="h-3.5 w-3.5" />
          {link ? <Link to={link} className="font-medium text-navy-700 hover:underline">{o.postedBy.name}</Link> : <span className="font-medium">{o.postedBy.name}</span>}
          {o.verified && <BadgeCheck className="h-3.5 w-3.5 text-verified" />}
          <span className="text-slate-400">· {o.postedBy.type}</span>
        </p>
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">{o.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> {o.budget}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.location}</span>
          <DeadlineBadge iso={o.deadline} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{o.tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-600">{t}</span>)}</div>

        {/* hover preview */}
        <div className="hidden overflow-hidden text-[11.5px] text-navy-900 transition-all duration-500 lg:block lg:max-h-0 lg:opacity-0 lg:group-hover:mt-3 lg:group-hover:max-h-40 lg:group-hover:opacity-100">
          <div className="rounded-lg bg-navy-50/70 p-3">
            <p className="font-semibold">Key requirements</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">{o.requirements.slice(0, 2).map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="mt-2 flex items-center gap-3 text-slate-600"><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {o.applicants} applicants</span><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {o.views} views</span></p>
          </div>
        </div>
      </div>
      <div className={cn("flex items-center gap-2 border-t border-line bg-slate-50/60 p-4", view === "list" ? "md:w-[200px] md:flex-col md:justify-center md:border-l md:border-t-0" : "")}>
        <Link to={`/opportunities/${o.slug}`} className="btn-navy flex-1 py-2.5 text-[12px] md:w-full">View Details <ArrowRight className="h-3.5 w-3.5" /></Link>
        <ApplyBtn slug={o.slug} title={o.title} closed={closed} size="sm" className="flex-1 md:w-full" similarTo={`/opportunities?type=${encodeURIComponent(o.type)}`} />
        <div className="flex gap-2"><SaveBtn type="opportunity" slug={o.slug} /><ShareBtn title={o.title} path={`/opportunities/${o.slug}`} /></div>
      </div>
    </article>
  );
}

export default function Opportunities() {
  return (
    <DirectoryPage<Opportunity>
      entity="Opportunities"
      singular="Opportunity"
      breadcrumb="Opportunities"
      title={["Explore", "Opportunities"]}
      subtitle="Discover partnerships, collaborations, funding, and business opportunities."
      quote={["Opportunities don't", "happen, people do."]}
      heroImage="/images/hero.jpg"
      searchPlaceholder="Search opportunities by keyword, category or industry..."
      quickFilters={oppQuick.map((g) => ({ label: g.label, params: { group: g.label } }))}
      filters={[{ key: "group", label: "Group", type: "select", options: oppQuick.map((g) => g.label), placeholder: "Any group" }, ...filters]}
      sorts={[
        { value: "latest", label: "Latest" },
        { value: "deadline", label: "Deadline (soonest)" },
        { value: "viewed", label: "Most Viewed" },
        { value: "budget", label: "Highest Budget" },
        { value: "applicants", label: "Most Applied" },
      ]}
      items={[]}
      match={match}
      sort={sortFn}
      keyOf={(o) => o.slug}
      renderCard={(o) => <OpportunityCard o={o} />}
      pageSize={5}
      listOnly
      cta={{ title: "Have an opportunity to share?", text: "Post your funding, partnership, hiring or collaboration opportunity and reach the right people.", button: "Post Opportunity", to: "/dashboard?tab=post", icon: <Inbox className="h-7 w-7" strokeWidth={1.6} /> }}
      banner={{ title: "More Opportunities.", highlight: "A Stronger Warangal.", text: "Every collaboration on WS Hub lives here — from grants to hiring.", image: "/images/cta-bg.jpg" }}
    />
  );
}
