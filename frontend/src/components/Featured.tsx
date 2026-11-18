import { Link } from "react-router-dom";
import { BadgeCheck, MapPin } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Stars } from "./Stars";
import { Reveal } from "./Reveal";
import { BusinessMark } from "./BrandMarks";
import { EmptyDataCard } from "./EmptyDataCard";

function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm bg-verified px-1.5 py-[3px] text-[9px] font-semibold text-white shadow-sm ${className}`}
    >
      <BadgeCheck className="h-3 w-3" strokeWidth={2.4} />
      Verified
    </span>
  );
}

function Location({ name }: { name: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-500">
      <MapPin className="h-3 w-3" strokeWidth={2} />
      {name}
    </p>
  );
}

export function FeaturedBusinesses({ items }: { items?: any[] }) {
  const list = items?.length ? items.map((b) => ({
    slug: b.slug,
    name: b.name,
    category: b.category?.name || b.category || "Business",
    location: b.city || "Warangal",
    rating: b.avg_rating ?? b.rating ?? 0,
    reviews: b.review_count ?? b.reviews ?? 0,
    verified: Boolean(b.is_verified),
    image: b.logo_url || b.cover_url,
  })) : [];
  return (
    <div>
      <SectionHeader title="Featured Businesses" />
      {list.length === 0 && <EmptyDataCard title="Welcome — no featured businesses yet" text="Real published businesses will appear here once they are added." action="Add a business" to="/dashboard" />}
      {list.length > 0 && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-2.5 xl:gap-3">
        {list.map((b, i) => (
          <Reveal key={b.name} delay={i * 80} as="article" className="card group flex flex-col overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              {b.image ? (
                <img
                  src={b.image}
                  alt={b.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <BusinessMark />
              )}
              {b.verified && <VerifiedBadge className="absolute bottom-1.5 right-1.5" />}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <h3 className="text-[12.5px] font-bold leading-tight text-navy-900">{b.name}</h3>
              <p className="mt-1 text-[10.5px] text-slate-500">{b.category}</p>
              <Location name={b.location} />
              <div className="mt-2">
                <Stars rating={b.rating} reviews={b.reviews} />
              </div>
              <Link to={`/businesses/${b.slug}`} className="btn-navy mt-3 w-full text-[11px]">
                View Profile
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
      )}
    </div>
  );
}

export function FeaturedStartups() {
  return (
    <div>
      <SectionHeader title="Featured Startups" to="/startups" />
      <EmptyDataCard title="Welcome — no featured startups yet" text="Published startup profiles will appear here once available." action="Register startup" to="/dashboard?tab=startup" />
    </div>
  );
}
