import { Link } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";
import { EmptyDataCard } from "./EmptyDataCard";
import { SectionHeader } from "./SectionHeader";
import { Stars } from "./Stars";
import { Reveal } from "./Reveal";

export function Opportunities() {
  return (
    <div>
      <SectionHeader title="Business Opportunities" to="/requirements" />
      <EmptyDataCard title="Welcome — no opportunities yet" text="Real funding, jobs, partnerships and collaboration posts will appear here." action="Post opportunity" to="/dashboard?tab=post" />
    </div>
  );
}

export function TrendingBusinesses({ items = [] }: { items?: any[] }) {
  return (
    <div>
      <SectionHeader title="Trending Businesses" />
      {items.length === 0 ? <EmptyDataCard title="Welcome — no trending businesses" text="Published businesses will appear here as they join WS Hub." action="Explore businesses" to="/businesses" /> : <div className="space-y-2.5">
        {items.slice(0, 4).map((business) => <Link key={business.id || business.slug} to={`/businesses/${business.slug}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-navy-300">
          {business.logo_url || business.cover_url ? <img src={business.logo_url || business.cover_url} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-50 text-[13px] font-black text-navy-800">{String(business.name || "B").slice(0, 2).toUpperCase()}</span>}
          <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-bold text-navy-900">{business.name}</span><span className="block truncate text-[10.5px] text-slate-500">{business.category?.name || business.category || "Business"}{business.city ? ` · ${business.city}` : ""}</span></span>
          <span className="text-right text-[10.5px] text-slate-500">{Number(business.avg_rating || 0) > 0 ? `★ ${Number(business.avg_rating).toFixed(1)}` : "New"}<span className="block">{business.review_count || 0} reviews</span></span>
        </Link>)}
      </div>}
    </div>
  );
}
