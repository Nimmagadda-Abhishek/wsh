import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CalendarPlus, Clock, Eye, Heart, Lock, MapPin, Ticket, Video } from "lucide-react";
import { dayParts, eventIndustries, eventLocations, eventOrganizers, events, eventTypes, fmtEventDate, fmtTime, isPast, type WsEvent } from "../events";
import { DirectoryPage, type FilterValues } from "../components/DirectoryPage";
import { SaveBtn, ShareBtn } from "../components/ui/Actions";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ProfileShell";
import { registrationFor, useStore } from "../store";
import { planRank } from "../membership";
import { cn } from "../utils/cn";

const filters = [
  { key: "type", label: "Event Type", type: "select" as const, options: eventTypes, placeholder: "All Types" },
  { key: "when", label: "Date", type: "select" as const, options: ["Today", "This Week", "This Month", "Past Events"], placeholder: "Any Date" },
  { key: "location", label: "Location", type: "select" as const, options: eventLocations },
  { key: "price", label: "Price", type: "select" as const, options: ["Free", "Paid"], placeholder: "Both" },
  { key: "industry", label: "Industry", type: "select" as const, options: eventIndustries },
  { key: "organizer", label: "Organized By", type: "checks" as const, options: eventOrganizers.slice(0, 5) },
  { key: "mode", label: "Format", type: "checks" as const, options: ["In-Person", "Online", "Hybrid"] },
  { key: "seats", label: "Seats", type: "toggle" as const, placeholder: "Seats available only" },
  { key: "language", label: "Languages", type: "select" as const, options: ["Telugu", "English", "Hindi"], placeholder: "Any" },
  { key: "members", label: "Members Only", type: "toggle" as const, placeholder: "Show members-only events" },
];

const dayMs = 864e5;
function whenMatch(e: WsEvent, w: string) {
  if (!w) return !isPast(e);
  const start = new Date(e.start).getTime(), now = Date.now();
  const sod = new Date(); sod.setHours(0, 0, 0, 0);
  if (w === "Past Events") return isPast(e);
  if (isPast(e)) return false;
  if (w === "Today") return start >= sod.getTime() && start < sod.getTime() + dayMs;
  if (w === "This Week") return start < now + 7 * dayMs;
  return start < now + 31 * dayMs;
}
function match(e: WsEvent, q: string, f: FilterValues) {
  if (q) {
    const hay = [e.title, e.type, e.organizer.name, e.location, e.venue, e.tagline, e.industry, ...e.speakers.map((s) => s.name)].join(" ").toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (!whenMatch(e, f.when as string)) return false;
  if (f.type && e.type !== f.type) return false;
  if (f.location && e.location !== f.location) return false;
  if (f.price === "Free" && e.price > 0) return false;
  if (f.price === "Paid" && e.price === 0) return false;
  if (f.industry && e.industry !== f.industry) return false;
  if ((f.organizer as string[]).length && !(f.organizer as string[]).includes(e.organizer.name)) return false;
  if ((f.mode as string[]).length && !(f.mode as string[]).includes(e.mode)) return false;
  if (f.seats && e.seatsLeft === 0) return false;
  if (f.language && !e.languages.includes(f.language as string)) return false;
  if (f.members && !e.memberOnly) return false;
  return true;
}
const sortFn = (a: WsEvent, b: WsEvent, s: string) =>
  s === "popular" ? b.interested - a.interested : s === "price" ? a.price - b.price : s === "seats" ? a.seatsLeft - b.seatsLeft : a.start.localeCompare(b.start);

export function EventCard({ e, view = "list" }: { e: WsEvent; view?: "grid" | "list" }) {
  const [quick, setQuick] = useState(false);
  const reg = useStore((s) => registrationFor(s, e.slug));
  const plan = useStore((s) => s.membership.plan);
  const locked = e.memberOnly && planRank[plan] < planRank.premium;
  const past = isPast(e);
  const { mon, day } = dayParts(e.start);
  const list = view === "list";
  return (
    <article className={cn("card group relative flex overflow-hidden", list ? "flex-col sm:flex-row" : "flex-col")}>
      <Link to={`/events/${e.slug}`} className={cn("relative block shrink-0 overflow-hidden", list ? "aspect-[16/9] sm:aspect-auto sm:w-[240px]" : "aspect-[16/9]")}>
        <img src={e.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
        <span className="absolute left-3 bottom-3 flex flex-col items-center rounded-md bg-white px-2.5 py-1.5 leading-none shadow"><span className="text-[9px] font-bold text-navy-800">{mon}</span><span className="mt-0.5 text-[20px] font-black text-navy-900">{day}</span></span>
        {past && <span className="absolute right-3 top-3 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-white">Ended</span>}
        {e.memberOnly && !past && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-navy-900"><Lock className="h-3 w-3" /> Members</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-navy-600">{e.type}</span>
            <h3 className="mt-0.5 text-[16px] font-bold leading-snug text-navy-900"><Link to={`/events/${e.slug}`} className="hover:text-navy-600">{e.title}</Link></h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-slate-500">
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">{e.organizer.name}{e.organizer.verified && <BadgeCheck className="h-3.5 w-3.5 text-verified" />}</span>
              <span className="inline-flex items-center gap-1">{e.mode === "Online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />} {e.venue}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(e.start)} – {fmtTime(e.end)}</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5"><SaveBtn type="event" slug={e.slug} /><ShareBtn title={e.title} path={`/events/${e.slug}`} /></div>
        </div>
        <p className="mt-2 line-clamp-2 text-[12.5px] text-slate-600">{e.tagline}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={cn("rounded-md px-2 py-0.5 font-bold", e.price === 0 ? "bg-emerald-100 text-emerald-800" : "bg-gold-100 text-gold-800")}>{e.price === 0 ? "Free" : `₹${e.price}`}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{e.mode}</span>
          {!past && <span className={cn("inline-flex items-center gap-1 font-medium", e.seatsLeft <= 15 ? "text-red-600" : "text-slate-500")}><Ticket className="h-3 w-3" /> {e.seatsLeft === 0 ? "Sold out" : `${e.seatsLeft} seats left`}</span>}
          <span className="inline-flex items-center gap-1 text-slate-500"><Heart className="h-3 w-3" /> {e.interested} interested</span>
        </div>
        {/* hover: agenda + speakers + sponsors */}
        <div className="hidden overflow-hidden transition-all duration-500 lg:block lg:max-h-0 lg:opacity-0 lg:group-hover:mt-3 lg:group-hover:max-h-40 lg:group-hover:opacity-100">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-navy-50/70 p-3 text-[11px] text-navy-900">
            <div><p className="font-bold">Agenda</p>{e.agenda.slice(0, 3).map((a) => <p key={a.time} className="truncate text-slate-700"><span className="font-semibold">{a.time}</span> {a.title}</p>)}</div>
            <div><p className="font-bold">Speakers</p><div className="mt-1 flex -space-x-2">{e.speakers.slice(0, 4).map((s) => <span key={s.name} className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black text-white ring-2 ring-white" style={{ background: s.color }}>{s.initials}</span>)}</div><p className="mt-1 truncate text-slate-600">Sponsors: {e.sponsors.map((s) => s.name).join(", ") || "—"}</p></div>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-3.5">
          {past ? <Link to={`/events/${e.slug}`} className="btn-navy flex-1 py-2 text-[11.5px]">View recap & feedback</Link>
            : reg ? <Link to={`/events/${e.slug}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-50 py-2 text-[11.5px] font-semibold text-emerald-700"><Ticket className="h-3.5 w-3.5" /> Registered · View pass</Link>
            : locked ? <Link to="/membership" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gold-500 py-2 text-[11.5px] font-bold text-navy-900 hover:bg-gold-400"><Lock className="h-3.5 w-3.5" /> Upgrade to register</Link>
            : <Link to={`/events/${e.slug}?register=1`} className="btn-navy flex-1 py-2 text-[11.5px]">Register</Link>}
          <button type="button" onClick={() => setQuick(true)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50"><Eye className="h-3.5 w-3.5" /> Quick View</button>
        </div>
      </div>
      <Modal open={quick} onClose={() => setQuick(false)} title={e.title} subtitle={`${fmtEventDate(e.start)} · ${fmtTime(e.start)} · ${e.venue}`} size="lg">
        <img src={e.cover} alt="" className="aspect-[16/7] w-full rounded-lg object-cover" />
        <p className="mt-3 text-[13px] text-slate-700">{e.description}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><p className="text-[12.5px] font-bold text-navy-900">Agenda</p><ul className="mt-1.5 space-y-1 text-[12px] text-slate-700">{e.agenda.map((a) => <li key={a.time}><span className="font-semibold text-navy-800">{a.time}</span> — {a.title}</li>)}</ul></div>
          <div><p className="text-[12.5px] font-bold text-navy-900">Speakers</p><ul className="mt-1.5 space-y-1.5">{e.speakers.map((s) => <li key={s.name} className="flex items-center gap-2 text-[12px]"><Avatar initials={s.initials} color={s.color} size="sm" /><span><span className="font-semibold text-navy-900">{s.name}</span> <span className="text-slate-500">· {s.company}</span></span></li>)}</ul></div>
        </div>
        <div className="mt-5 flex gap-2"><Link to={`/events/${e.slug}`} className="btn-navy flex-1 py-2.5">Full details</Link>{!past && !locked && <Link to={`/events/${e.slug}?register=1`} className="inline-flex flex-1 items-center justify-center rounded-md bg-gold-500 py-2.5 text-xs font-bold text-navy-900 hover:bg-gold-400">Register</Link>}</div>
      </Modal>
    </article>
  );
}

export default function Events() {
  return (
    <DirectoryPage<WsEvent>
      entity="Events" singular="Event" breadcrumb="Events"
      title={["Explore", "Events"]} subtitle="Meet. Learn. Network. Grow. Join events, workshops, meetups and conferences in Warangal."
      quote={["Real connections", "Real opportunities"]} heroImage="https://images.pexels.com/photos/9275222/pexels-photo-9275222.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1400"
      searchPlaceholder="Search events by title, keyword or organizer..."
      quickFilters={[{ label: "Today", params: { when: "Today" } }, { label: "This Week", params: { when: "This Week" } }, { label: "This Month", params: { when: "This Month" } }, { label: "Free", params: { price: "Free" } }, { label: "Paid", params: { price: "Paid" } }, { label: "Networking", params: { type: "Networking" } }, { label: "Meetups", params: { type: "Meetup" } }, { label: "Pitch", params: { type: "Pitch" } }, { label: "Workshops", params: { type: "Workshop" } }, { label: "Hackathons", params: { type: "Hackathon" } }, { label: "Investor Meet", params: { type: "Investor Meet" } }, { label: "Conferences", params: { type: "Conference" } }, { label: "Past", params: { when: "Past Events" } }]}
      filters={filters}
      sorts={[{ value: "soon", label: "Upcoming Soon" }, { value: "popular", label: "Most Popular" }, { value: "price", label: "Price: Low to High" }, { value: "seats", label: "Few Seats Left" }]}
      items={[]} match={match} sort={sortFn} keyOf={(e) => e.slug} renderCard={(e, v) => <EventCard e={e} view={v} />} pageSize={5}
      cta={{ title: "Hosting an event?", text: "Publish your meetup, workshop or conference to 3,200+ members and manage registrations, QR check-in and certificates.", button: "Host an Event", to: "/dashboard?tab=events", icon: <CalendarPlus className="h-7 w-7" strokeWidth={1.6} /> }}
      banner={{ title: "Learn. Network.", highlight: "Build.", text: "Warangal's calendar of founder meetups, investor connects and workshops.", image: "/images/cta-bg.jpg" }}
      emptyHint="No events match. Try 'This Month' or clear the date filter to see everything upcoming."
    />
  );
}

