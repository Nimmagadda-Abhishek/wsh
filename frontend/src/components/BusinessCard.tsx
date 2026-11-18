import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Bookmark, CalendarDays, MapPin, Phone } from "lucide-react";
import type { BusinessRecord } from "../businesses";
import { Stars } from "./Stars";
import { getState, toggleSaved, useStore } from "../store";
import { cn } from "../utils/cn";
import { businessApi } from "../api";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4ZM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8Zm8.4-18.2A11.8 11.8 0 0 0 12 .2C5.5.2.2 5.5.2 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Z" />
    </svg>
  );
}

export function LogoBadge({ b, size = "md" }: { b: BusinessRecord; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = { sm: "h-10 w-10 text-xs", md: "h-14 w-14 text-sm", lg: "h-20 w-20 text-lg", xl: "h-24 w-24 text-xl sm:h-28 sm:w-28 sm:text-2xl" }[size];
  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black tracking-tight ring-4 ring-white shadow-md", dims)}
      style={{ background: b.logo.bg, color: b.logo.fg }}
      aria-hidden="true"
    >
      <span>{b.logo.initials}</span>
      {b.logoUrl && <img src={b.logoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
    </span>
  );
}

export function SaveButton({ slug, className }: { slug: string; className?: string }) {
  const saved = useStore((s) => s.saved.business).includes(slug);
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save business"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const willSave = !getState().saved.business.includes(slug);
        toggleSaved("business", slug);
        (willSave ? businessApi.addFavorite(slug) : businessApi.removeFavorite(slug)).catch(() => undefined);
        setPop(true);
        setTimeout(() => setPop(false), 450);
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border bg-white/95 text-navy-800 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white hover:shadow-md",
        saved ? "border-gold-500 text-gold-500" : "border-white/60",
        pop && "animate-[bookmark-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)]",
        className,
      )}
    >
      <Bookmark className="h-4 w-4 transition-transform duration-300" fill={saved ? "currentColor" : "none"} strokeWidth={2.2} />
    </button>
  );
}

export function VerifiedPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-navy-800 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm",
        className,
      )}
    >
      <BadgeCheck className="h-3 w-3 text-gold-400" strokeWidth={2.4} />
      Verified
    </span>
  );
}

export function ActionButtons({ b, compact = false }: { b: BusinessRecord; compact?: boolean }) {
  const base = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all duration-300",
    compact ? "px-3 py-2 text-[11.5px]" : "px-3.5 py-2.5 text-xs",
  );
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${b.contact.phone.replace(/\s/g, "")}`} className={cn(base, "flex-1 bg-navy-50 text-navy-800 hover:bg-navy-100")}>
        <Phone className="h-3.5 w-3.5" strokeWidth={2.2} /> Call
      </a>
      <a
        href={`https://wa.me/${b.contact.whatsapp.replace(/\D/g, "")}`}
        target="_blank"
        rel="noreferrer"
        className={cn(base, "flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}
      >
        <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
      </a>
      <Link to={`/businesses/${b.slug}`} className={cn(base, "flex-1 bg-navy-800 text-white hover:bg-navy-700 hover:shadow-[0_8px_18px_-8px_rgba(15,42,92,0.7)]")}>
        View Profile
      </Link>
    </div>
  );
}

interface Props {
  b: BusinessRecord;
  view?: "grid" | "list";
}

export function BusinessCard({ b, view = "grid" }: Props) {
  if (view === "list") {
    return (
      <article className="card group grid overflow-hidden sm:grid-cols-[240px_1fr]">
        <div className="relative">
          <Link to={`/businesses/${b.slug}`} className="block aspect-[16/10] overflow-hidden sm:aspect-auto sm:h-full">
            <img src={b.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </Link>
          <SaveButton slug={b.slug} className="absolute right-2.5 top-2.5" />
        </div>
        <div className="flex flex-col p-4">
          <div className="flex items-start gap-3">
            <LogoBadge b={b} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-bold text-navy-900">
                  <Link to={`/businesses/${b.slug}`} className="hover:text-navy-600">{b.name}</Link>
                </h3>
                {b.verified && <VerifiedPill />}
              </div>
              <p className="mt-0.5 text-[11.5px] text-slate-500">{b.category} · {b.industry}</p>
            </div>
            <div className="hidden sm:block"><Stars rating={b.rating} reviews={b.reviews} /></div>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-slate-600">{b.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.location}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Est. {b.established}</span>
            <span className="sm:hidden"><Stars rating={b.rating} reviews={b.reviews} /></span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {b.tags.map((t) => (
              <span key={t} className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600">{t}</span>
            ))}
          </div>
          <div className="mt-auto pt-4"><ActionButtons b={b} compact /></div>
        </div>
      </article>
    );
  }

  return (
    <article className="card group flex flex-col overflow-hidden">
      <div className="relative">
        <Link to={`/businesses/${b.slug}`} className="block aspect-[16/8] overflow-hidden">
          <img src={b.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/30 to-transparent" />
        </Link>
        <SaveButton slug={b.slug} className="absolute right-2.5 top-2.5" />
      </div>
      <div className="relative px-3 pb-3">
        <div className="-mt-7 flex items-end gap-2.5">
          <LogoBadge b={b} />
          <div className="mb-0.5 flex min-w-0 flex-1 items-center justify-between gap-2">
            {b.verified ? <VerifiedPill /> : <span />}
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">Est. {b.established}</span>
          </div>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14.5px] font-bold text-navy-900">
              <Link to={`/businesses/${b.slug}`} className="transition-colors hover:text-navy-600">{b.name}</Link>
            </h3>
            <p className="text-[11px] text-slate-500">{b.industry}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3" strokeWidth={2} /> {b.location}</p>
          </div>
          <div className="shrink-0 pt-0.5"><Stars rating={b.rating} reviews={b.reviews} /></div>
        </div>
        <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-slate-600">{b.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {b.tags.map((t) => (
            <span key={t} className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600 transition-colors group-hover:bg-navy-50 group-hover:text-navy-800">{t}</span>
          ))}
        </div>
        <div className="mt-3.5"><ActionButtons b={b} compact /></div>
      </div>
    </article>
  );
}
