import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Award, BadgeCheck, CalendarPlus, Car, CheckCircle2, Clock, Download, ExternalLink, Heart, Hotel, Lock, MapPin, MessageSquare, Navigation, Star, ThumbsUp, Ticket, Train, Upload, Users, Video } from "lucide-react";
import { events, fmtEventDate, fmtTime, getEvent, isPast, relatedEvents, type WsEvent } from "../events";
import { getStory } from "../stories";
import { getOpportunity } from "../opportunities";
import { ProfileShell, Avatar, KV, LockedNote, SideCard, Timeline } from "../components/ProfileShell";
import { Gate, ReportBtn, SaveBtn, ShareBtn, ShareModal } from "../components/ui/Actions";
import { ChoiceGroup, Field, inputCls, Modal, PrimaryBtn, SecondaryBtn, textareaCls } from "../components/ui/Modal";
import { EventCard } from "./Events";
import { planRank } from "../membership";
import { cancelRegistration, registerEvent, registrationFor, requestCertificate, submitFeedback, toast, useStore, type Registration } from "../store";
import { cn } from "../utils/cn";
import { useTrackView } from "../components/ui/Actions";

/* ---------- helpers ---------- */
function useCountdown(iso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(iso).getTime() - now);
  return { d: Math.floor(diff / 864e5), h: Math.floor((diff / 36e5) % 24), m: Math.floor((diff / 6e4) % 60), s: Math.floor((diff / 1e3) % 60), over: diff === 0 };
}
export function QrSvg({ value, size = 160 }: { value: string; size?: number }) {
  const n = 25;
  let h = 2166136261;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= value.charCodeAt(i % value.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    cells.push((h & 0x9) === 0x9 || (h >>> 7) % 3 === 0);
  }
  const finder = (x: number, y: number) => x < 7 && y < 7 || x >= n - 7 && y < 7 || x < 7 && y >= n - 7;
  const finderOn = (x: number, y: number) => { const fx = x < 7 ? x : x - (n - 7), fy = y < 7 ? y : y - (n - 7); return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4); };
  const c = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`QR pass ${value}`} className="rounded-lg bg-white p-2 shadow-inner">
      {cells.map((on, i) => { const x = i % n, y = Math.floor(i / n); const fill = finder(x, y) ? finderOn(x, y) : on; return fill ? <rect key={i} x={x * c} y={y * c} width={c} height={c} fill="#0a1c3f" /> : null; })}
    </svg>
  );
}
function icsFor(e: WsEvent) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WS Hub//Events//EN", "BEGIN:VEVENT", `UID:${e.slug}@wshub.in`, `DTSTART:${fmt(e.start)}`, `DTEND:${fmt(e.end)}`, `SUMMARY:${e.title}`, `LOCATION:${e.venue}, ${e.address}`, `DESCRIPTION:${e.tagline}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
const addToCalendar = (e: WsEvent) => { download(`${e.slug}.ics`, icsFor(e), "text/calendar"); toast("Calendar file downloaded"); };
const downloadTicket = (e: WsEvent, r: Registration) => download(`ticket-${r.code}.txt`, `WS HUB EVENT PASS\n\n${e.title}\n${fmtEventDate(e.start)} · ${fmtTime(e.start)}\n${e.venue}, ${e.address}\n\nName: ${r.name}\nCode: ${r.code}\nShow this code (or the QR in your dashboard) at check-in.`);

/* ---------- Pass ---------- */
function Pass({ e, r, onInvite }: { e: WsEvent; r: Registration; onInvite: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <QrSvg value={r.code} size={140} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gold-800">Your QR pass</p>
          <p className="text-[16px] font-black text-navy-900">{r.code}</p>
          <p className="text-[12px] text-slate-600">{r.name} · {r.role}{r.company && `, ${r.company}`}</p>
          <p className="mt-1 text-[11.5px] text-slate-500">{fmtEventDate(e.start)} · {fmtTime(e.start)} · {e.venue}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button type="button" onClick={() => downloadTicket(e, r)} className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-2 text-[11.5px] font-semibold text-white hover:bg-navy-700"><Download className="h-3.5 w-3.5" /> Download Ticket</button>
            <button type="button" onClick={() => addToCalendar(e)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50"><CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar</button>
            <button type="button" onClick={onInvite} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50"><Users className="h-3.5 w-3.5" /> Invite Friends</button>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => cancelRegistration(r.id)} className="mt-3 text-[11px] text-slate-500 hover:text-red-600">Cancel registration</button>
    </div>
  );
}

const foods = ["Vegetarian", "Non-vegetarian", "Vegan", "No meal"] as const;
const payMethods = ["UPI", "Card", "Net Banking"] as const;

export default function EventDetails() {
  const { slug = "" } = useParams();
  useTrackView("event:" + slug);
  const [params, setParams] = useSearchParams();
  const e = getEvent(slug);
  const user = useStore((s) => s.user);
  const plan = useStore((s) => s.membership.plan);
  const reg = useStore((s) => registrationFor(s, slug));
  const fb = useStore((s) => s.feedback.find((f) => f.eventSlug === slug));
  const cert = useStore((s) => s.certificates.find((c) => c.eventSlug === slug));
  const regCount = useStore((s) => s.registrations.filter((r) => r.eventSlug === slug && r.status !== "Cancelled").length);
  const [regOpen, setRegOpen] = useState(false);
  const [done, setDone] = useState<Registration | null>(null);
  const [invite, setInvite] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
  const [interested, setInterested] = useState(false);
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<{ id: string; name: string; initials: string; text: string; at: string; likes: number; liked?: boolean; replies: { name: string; text: string }[] }[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const cd = useCountdown(e?.start ?? new Date().toISOString());

  // form
  const [f, setF] = useState({ name: "", email: "", phone: "", company: "", role: "Founder", food: "Vegetarian" as (typeof foods)[number], pay: "UPI" as (typeof payMethods)[number] });
  useEffect(() => { if (user) setF((x) => ({ ...x, name: x.name || user.name, email: x.email || user.email, role: user.role })); }, [user]);
  useEffect(() => { if (e) { document.title = `${e.title} — Events — WS Hub`; setPosts(e.discussion); } }, [e]);
  useEffect(() => { if (params.get("register") === "1") { setRegOpen(true); const n = new URLSearchParams(params); n.delete("register"); setParams(n, { replace: true }); } }, [params, setParams]);
  // post-event feedback prompt
  useEffect(() => { if (e && isPast(e) && reg && !fb) { const t = setTimeout(() => setFbOpen(true), 1200); return () => clearTimeout(t); } }, [e, reg, fb]);

  const related = useMemo(() => (e ? relatedEvents(e) : []), [e]);
  if (!e) return <Navigate to="/events" replace />;

  const past = isPast(e);
  const locked = !!e.memberOnly && planRank[plan] < planRank.premium;
  const soldOut = e.seatsLeft === 0;
  const story = e.relatedStory ? getStory(e.relatedStory) : undefined;
  const opp = e.relatedOpportunity ? getOpportunity(e.relatedOpportunity) : undefined;

  const submitReg = (ev: FormEvent) => {
    ev.preventDefault();
    const r = registerEvent({ eventSlug: e.slug, eventTitle: e.title, name: f.name, email: f.email, phone: f.phone, company: f.company, role: f.role, food: f.food, amount: e.price }, `${e.title} is tomorrow at ${fmtTime(e.start)}. Weather: 29°C, clear. Parking: ${e.venueInfo.parking}. Directions in the event page.`);
    setDone(r);
  };
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const submitFb = (ev: FormEvent) => { ev.preventDefault(); submitFeedback(e.slug, rating, review, photos); setFbOpen(false); };

  const postQ = (ev: FormEvent) => {
    ev.preventDefault();
    if (!user) return toast("Sign in to join the discussion", "info", "/login");
    setPosts((p) => [{ id: Math.random().toString(36).slice(2), name: user.name, initials: user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(), text: q, at: "just now", likes: 0, replies: [] }, ...p]);
    setQ(""); toast("Question posted — the organizer will be notified");
  };

  const registerBtn = past ? null : reg ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-4 py-2.5 text-[12.5px] font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Registered</span>
  ) : locked ? (
    <Link to="/membership?plan=premium" className="inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-5 py-2.5 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400"><Lock className="h-4 w-4" /> Upgrade to Register</Link>
  ) : soldOut ? (
    <button type="button" onClick={() => toast("You're on the waitlist — we'll notify you if a seat opens", "success")} className="rounded-md bg-slate-200 px-5 py-2.5 text-[12.5px] font-bold text-slate-700">Join Waitlist</button>
  ) : (
    <button type="button" onClick={() => { setDone(null); setRegOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-5 py-2.5 text-[12.5px] font-bold text-navy-900 transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-[0_12px_24px_-10px_rgba(226,176,74,0.9)]"><Ticket className="h-4 w-4" /> {e.price ? `Register · ₹${e.price}` : "Register Free"}</button>
  );

  return (
    <>
      <ProfileShell
        cover={e.cover}
        crumbs={[{ label: "Home", to: "/" }, { label: "Events", to: "/events" }, { label: e.title }]}
        avatar={<span className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-navy-900 text-white ring-4 ring-white shadow-md sm:h-28 sm:w-28"><span className="text-[11px] font-bold uppercase tracking-wide text-gold-400">{new Date(e.start).toLocaleString("en-IN", { month: "short" })}</span><span className="text-[36px] font-black leading-none">{new Date(e.start).getDate()}</span><span className="text-[10px] text-white/70">{new Date(e.start).toLocaleString("en-IN", { weekday: "short" })}</span></span>}
        title={e.title}
        verified={e.organizer.verified}
        subtitle={<>{e.tagline}</>}
        meta={<>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtEventDate(e.start)} · {fmtTime(e.start)} – {fmtTime(e.end)}</span>
          <span className="inline-flex items-center gap-1">{e.mode === "Online" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />} {e.venue}, {e.location}</span>
          <span className="inline-flex items-center gap-1">By {e.organizer.to ? <Link to={e.organizer.to} className="font-medium text-navy-700 hover:underline">{e.organizer.name}</Link> : <span className="font-medium">{e.organizer.name}</span>}</span>
        </>}
        badges={<>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">{e.type}</span>
          <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-bold", e.price === 0 ? "bg-emerald-100 text-emerald-800" : "bg-gold-100 text-gold-800")}>{e.price === 0 ? "Free" : `₹${e.price}`}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">{e.mode}</span>
          {e.memberOnly && <span className="inline-flex items-center gap-1 rounded-md bg-gold-500 px-2 py-0.5 text-[10.5px] font-bold text-navy-900"><Lock className="h-3 w-3" /> Members only</span>}
          {past ? <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10.5px] font-bold text-white">Event ended</span> : <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", e.seatsLeft <= 15 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>{soldOut ? "Sold out" : `${e.seatsLeft} seats left`}</span>}
        </>}
        actions={<>
          {registerBtn}
          <button type="button" onClick={() => { setInterested((v) => !v); toast(interested ? "Removed from interested" : "Marked as interested", interested ? "info" : "success"); }} className={cn("inline-flex items-center gap-1.5 rounded-md border px-4 py-2.5 text-[12.5px] font-semibold", interested ? "border-red-200 bg-red-50 text-red-600" : "border-slate-300 text-navy-800 hover:bg-navy-50")}><Heart className="h-4 w-4" fill={interested ? "currentColor" : "none"} /> {e.interested + (interested ? 1 : 0)}</button>
          <button type="button" onClick={() => addToCalendar(e)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><CalendarPlus className="h-4 w-4" /> Calendar</button>
          <SaveBtn type="event" slug={e.slug} label className="h-auto rounded-md py-2.5" />
        </>}
        topRight={<><ShareBtn title={e.title} path={`/events/${e.slug}`} /><SaveBtn type="event" slug={e.slug} /></>}
        tabs={[
          { id: "overview", label: "Overview", content: (
            <div className="space-y-5">
              {!past && !cd.over && (
                <div className="grid grid-cols-4 gap-2 rounded-xl bg-navy-900 p-4 text-center text-white">
                  {[["Days", cd.d], ["Hours", cd.h], ["Minutes", cd.m], ["Seconds", cd.s]].map(([k, v]) => <div key={k as string}><p className="text-[26px] font-black tabular-nums text-gold-400">{String(v).padStart(2, "0")}</p><p className="text-[10.5px] uppercase tracking-wide text-white/70">{k}</p></div>)}
                </div>
              )}
              {reg && !past && <Pass e={e} r={reg} onInvite={() => setInvite(true)} />}
              {past && (
                <div className="rounded-xl border border-gold-300 bg-gold-100/50 p-4">
                  <p className="text-[13.5px] font-bold text-navy-900">This event has ended</p>
                  {reg ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fb ? <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Rated {fb.rating}/5</span> : <button type="button" onClick={() => setFbOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-2 text-[12px] font-semibold text-white"><Star className="h-4 w-4" /> Rate this event</button>}
                      {cert ? <Link to="/dashboard?tab=events" className="inline-flex items-center gap-1.5 rounded-md bg-gold-500 px-3 py-2 text-[12px] font-bold text-navy-900"><Award className="h-4 w-4" /> Certificate issued</Link> : <button type="button" onClick={() => (fb ? requestCertificate(e.slug, e.title) : setFbOpen(true))} className="inline-flex items-center gap-1.5 rounded-md border border-navy-800 px-3 py-2 text-[12px] font-semibold text-navy-800"><Award className="h-4 w-4" /> Request certificate</button>}
                      <button type="button" onClick={() => setFbOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-[12px] font-semibold text-navy-800"><Upload className="h-4 w-4" /> Share photos</button>
                    </div>
                  ) : <p className="mt-1 text-[12.5px] text-slate-600">Browse the gallery below and check out related upcoming events.</p>}
                </div>
              )}
              <p className="text-[14px] leading-relaxed text-slate-700">{e.description}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[["Learning outcomes", e.outcomes], ["Who should attend", e.audience], ["Requirements", e.requirements.length ? e.requirements : ["None"]]].map(([t, items]) => (
                  <div key={t as string} className="rounded-lg border border-line bg-slate-50/60 p-4"><p className="text-[12px] font-bold text-navy-900">{t as string}</p><ul className="mt-2 space-y-1.5">{(items as string[]).map((i) => <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verified" /> {i}</li>)}</ul></div>
                ))}
              </div>
              {(story || opp) && (
                <div className="flex flex-wrap gap-2">
                  {story && <Link to={`/stories/${story.slug}`} className="inline-flex items-center gap-1.5 rounded-md bg-navy-50 px-3 py-2 text-[12px] font-semibold text-navy-800 hover:bg-navy-100">Read the story: {story.title} <ArrowRight className="h-3.5 w-3.5" /></Link>}
                  {opp && <Link to={`/opportunities/${opp.slug}`} className="inline-flex items-center gap-1.5 rounded-md bg-gold-100 px-3 py-2 text-[12px] font-semibold text-gold-800 hover:bg-gold-300/60">Related opportunity: {opp.title} <ArrowRight className="h-3.5 w-3.5" /></Link>}
                </div>
              )}
            </div>
          ) },
          { id: "agenda", label: "Agenda", content: <Timeline items={e.agenda.map((a) => ({ year: a.time, title: a.title, type: e.type, description: a.desc }))} /> },
          { id: "speakers", label: "Speakers", content: (
            <div className="grid gap-3 sm:grid-cols-2">
              {e.speakers.map((s) => {
                const to = s.founderSlug ? `/founders/${s.founderSlug}` : s.investorSlug ? `/investors/${s.investorSlug}` : undefined;
                return (
                  <div key={s.name} className="card flex gap-3 p-4">
                    <Avatar initials={s.initials} color={s.color} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-navy-900">{to ? <Link to={to} className="hover:text-navy-600">{s.name}</Link> : s.name}</p>
                      <p className="text-[11.5px] text-slate-500">{s.company} · <span className="text-gold-800">{s.session}</span></p>
                      <p className="mt-1.5 text-[12px] text-slate-600">{s.bio}</p>
                      <div className="mt-2 flex gap-3 text-[11.5px] font-semibold">{to && <Link to={to} className="text-navy-700 hover:underline">View profile</Link>}<a href={`https://${s.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-500 hover:text-navy-800">LinkedIn <ExternalLink className="h-3 w-3" /></a></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) },
          { id: "sponsors", label: "Sponsors", content: e.sponsors.length ? (
            <div className="flex flex-wrap gap-3">{e.sponsors.map((s) => { const inner = <div className="rounded-lg border border-line px-4 py-3 text-center transition-colors hover:border-navy-700"><p className="text-[10px] font-bold uppercase tracking-wide text-gold-800">{s.tier}</p><p className="text-[13.5px] font-bold text-navy-900">{s.name}</p></div>; return s.to ? <Link key={s.name} to={s.to}>{inner}</Link> : <div key={s.name}>{inner}</div>; })}<Link to="/membership?plan=enterprise" className="flex items-center rounded-lg border border-dashed border-slate-300 px-4 py-3 text-[12px] font-semibold text-navy-700 hover:bg-navy-50">Become a sponsor →</Link></div>
          ) : <p className="text-[12.5px] text-slate-500">No sponsors yet. <Link to="/membership?plan=enterprise" className="font-semibold text-navy-700">Sponsor this event</Link>.</p> },
          { id: "venue", label: "Venue", content: (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3 text-[13px] text-slate-700">
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" /><span><span className="font-bold text-navy-900">{e.venue}</span><br />{e.address}</span></p>
                <p className="flex items-start gap-2"><Car className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" /><span><span className="font-semibold">Parking:</span> {e.venueInfo.parking}</span></p>
                <p className="flex items-start gap-2"><Train className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" /><span><span className="font-semibold">Getting there:</span> {e.venueInfo.transit}</span></p>
                <div className="flex items-start gap-2"><Hotel className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" /><span><span className="font-semibold">Hotels nearby:</span> {e.venueInfo.hotels.map((h, i) => <span key={h.name}>{i > 0 && ", "}{h.to ? <Link to={h.to} className="text-navy-700 hover:underline">{h.name}</Link> : h.name}</span>)}</span></div>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(`${e.venue} ${e.address}`)}`} target="_blank" rel="noreferrer" className="btn-navy inline-flex px-4 py-2.5"><Navigation className="h-4 w-4" /> Get Directions</a>
              </div>
              {e.mode !== "Online" ? <iframe title="Venue map" src={`https://maps.google.com/maps?q=${encodeURIComponent(`${e.venue} ${e.address}`)}&z=14&output=embed`} className="h-[260px] w-full rounded-lg border border-line" loading="lazy" /> : <div className="flex h-[200px] items-center justify-center rounded-lg bg-navy-50 text-[13px] text-navy-800"><Video className="mr-2 h-5 w-5" /> Online event — join link sent to registrants</div>}
            </div>
          ) },
          { id: "attendees", label: "Attendees", subtitle: `${e.seats - e.seatsLeft + regCount} going · ${e.interested} interested`, content: user ? (
            <div>
              <div className="flex -space-x-2">{[...e.speakers, ...e.speakers].slice(0, 8).map((s, i) => <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-black text-white ring-2 ring-white" style={{ background: s.color }}>{s.initials}</span>)}<span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 ring-2 ring-white">+{e.seats - e.seatsLeft}</span></div>
              <p className="mt-3 text-[12.5px] text-slate-600">Founders, investors and professionals from Warangal. Full attendee list with roles unlocks 24 hours before the event for registered members.</p>
              {!reg && !past && <p className="mt-2 text-[12.5px] font-semibold text-navy-800">Register to see who's going and message attendees.</p>}
            </div>
          ) : <LockedNote text="Attendee list is visible to members." /> },
          { id: "gallery", label: "Gallery", subtitle: "From previous editions", content: <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{e.gallery.map((g, i) => <img key={i} src={g} alt="" loading="lazy" className={cn("aspect-[4/3] w-full rounded-lg object-cover", i === 0 && "col-span-2 row-span-2")} />)}<div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-navy-900 text-white"><Video className="mr-2 h-5 w-5 text-gold-400" /> <span className="text-[12px] font-semibold">Highlights video</span></div></div> },
          { id: "discussion", label: "Discussion", subtitle: "Ask the organizer or other attendees", content: (
            <div className="space-y-4">
              <form onSubmit={postQ} className="flex gap-2"><input value={q} onChange={(x) => setQ(x.target.value)} required placeholder={user ? "Ask a question…" : "Sign in to ask a question"} className={inputCls} /><button type="submit" className="btn-navy shrink-0 px-4"><MessageSquare className="h-4 w-4" /> Post</button></form>
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li key={p.id} className="rounded-lg border border-line p-3.5">
                    <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">{p.initials}</span><div className="min-w-0 flex-1"><p className="text-[12.5px]"><span className="font-bold text-navy-900">{p.name}</span> <span className="text-slate-400">· {p.at}</span></p><p className="mt-0.5 text-[13px] text-slate-700">{p.text}</p>
                      <div className="mt-2 flex items-center gap-4 text-[11.5px]"><button type="button" onClick={() => setPosts((all) => all.map((x) => (x.id === p.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x)))} className={cn("inline-flex items-center gap-1 font-medium", p.liked ? "text-navy-800" : "text-slate-500 hover:text-navy-800")}><ThumbsUp className="h-3.5 w-3.5" fill={p.liked ? "currentColor" : "none"} /> {p.likes}</button><button type="button" onClick={() => setReplyTo(replyTo === p.id ? null : p.id)} className="font-medium text-slate-500 hover:text-navy-800">Reply</button><ReportBtn targetType="discussion" targetSlug={`${e.slug}:${p.id}`} /></div>
                      {p.replies.map((r, i) => <div key={i} className="mt-2 rounded-md bg-slate-50 p-2.5 text-[12px]"><span className="font-bold text-navy-900">{r.name}:</span> <span className="text-slate-700">{r.text}</span></div>)}
                      {replyTo === p.id && <form onSubmit={(ev) => { ev.preventDefault(); if (!user) return toast("Sign in to reply", "info", "/login"); setPosts((all) => all.map((x) => (x.id === p.id ? { ...x, replies: [...x.replies, { name: user.name, text: replyText }] } : x))); setReplyText(""); setReplyTo(null); }} className="mt-2 flex gap-2"><input value={replyText} onChange={(x) => setReplyText(x.target.value)} required placeholder="Write a reply…" className={cn(inputCls, "h-9")} /><button type="submit" className="btn-navy px-3">Reply</button></form>}
                    </div></div>
                  </li>
                ))}
                {posts.length === 0 && <li className="text-[12.5px] text-slate-500">No questions yet — be the first.</li>}
              </ul>
            </div>
          ) },
          { id: "faq", label: "FAQ", content: e.faq.length ? <ul className="divide-y divide-line rounded-lg border border-line">{e.faq.map((f) => <li key={f.q} className="p-4"><p className="text-[13px] font-bold text-navy-900">{f.q}</p><p className="mt-1 text-[12.5px] text-slate-600">{f.a}</p></li>)}</ul> : <p className="text-[12.5px] text-slate-500">No FAQs yet. Ask in the discussion above.</p> },
        ]}
        sidebar={<>
          <SideCard>
            <div className="flex items-end justify-between"><div><p className="text-[11px] uppercase tracking-wide text-slate-500">Ticket</p><p className="text-[26px] font-black text-navy-900">{e.price === 0 ? "Free" : `₹${e.price}`}</p></div>{!past && <p className={cn("text-[12px] font-semibold", e.seatsLeft <= 15 ? "text-red-600" : "text-slate-500")}>{soldOut ? "Sold out" : `${e.seatsLeft} of ${e.seats} left`}</p>}</div>
            {!past && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gold-500" style={{ width: `${((e.seats - e.seatsLeft) / e.seats) * 100}%` }} /></div>}
            <div className="mt-4 [&>*]:w-full [&>*]:justify-center">{registerBtn ?? <Link to="/events" className="btn-navy py-2.5">Browse upcoming events</Link>}</div>
            {locked && <p className="mt-2 text-[11.5px] text-slate-600">This is a Premium members-only event. <Link to="/membership" className="font-semibold text-navy-700">Compare plans →</Link></p>}
            <KV rows={[["Date", fmtEventDate(e.start)], ["Time", `${fmtTime(e.start)} – ${fmtTime(e.end)}`], ["Format", e.mode], ["Languages", e.languages.join(", ")]]} />
          </SideCard>
          <SideCard title="Organizer">
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-800 text-[12px] font-black text-white">{e.organizer.name.split(/[\s×]+/).map((w) => w[0]).slice(0, 2).join("")}</span><div><p className="flex items-center gap-1 text-[13.5px] font-bold text-navy-900">{e.organizer.name}{e.organizer.verified && <BadgeCheck className="h-4 w-4 text-verified" />}</p><p className="text-[11.5px] text-slate-500">{events.filter((x) => x.organizer.name === e.organizer.name).length} events on WS Hub</p></div></div>
            <div className="mt-3 flex gap-2">{e.organizer.to && <Link to={e.organizer.to} className="flex-1 rounded-md border border-slate-300 py-2 text-center text-[12px] font-semibold text-navy-800 hover:bg-navy-50">View profile</Link>}<Link to={`/events?organizer=${encodeURIComponent(e.organizer.name)}`} className="flex-1 rounded-md border border-slate-300 py-2 text-center text-[12px] font-semibold text-navy-800 hover:bg-navy-50">More events</Link></div>
            <div className="mt-3"><ReportBtn targetType="event" targetSlug={e.slug} /></div>
          </SideCard>
          {!e.memberOnly && <SideCard className="bg-navy-900 text-white"><Lock className="h-6 w-6 text-gold-400" /><h3 className="mt-2 text-[15px] font-bold">Want VIP networking?</h3><p className="mt-1 text-[12px] text-white/75">Premium members get Investor Connect access, VIP sessions and unlimited events.</p><Link to="/membership" className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-gold-500 py-2.5 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400">See membership</Link></SideCard>}
        </>}
        related={{ title: "Related Events", subtitle: "You might also like", to: `/events?type=${encodeURIComponent(e.type)}`, children: <div className="grid gap-4 md:grid-cols-2">{related.map((r) => <EventCard key={r.slug} e={r} view="grid" />)}</div> }}
      />

      {/* Registration modal */}
      <Modal open={regOpen} onClose={() => setRegOpen(false)} title={done ? undefined : "Register for Event"} subtitle={done ? undefined : `${e.title} · ${fmtEventDate(e.start)} · ${fmtTime(e.start)}`} size="lg">
        <Gate reason={`Sign in to register for ${e.title}.`}>
          {done ? (
            <div>
              <div className="page-in text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 className="h-9 w-9 text-verified" /></span><h3 className="mt-3 text-[18px] font-bold text-navy-900">You're in! 🎉</h3><p className="text-[12.5px] text-slate-600">Confirmation sent to {done.email}. We'll remind you a day before with weather, directions and parking.</p></div>
              <div className="mt-5"><Pass e={e} r={done} onInvite={() => setInvite(true)} /></div>
              <div className="mt-4 flex gap-2"><SecondaryBtn onClick={() => setRegOpen(false)} className="flex-1">Done</SecondaryBtn><Link to="/dashboard?tab=events" className="inline-flex flex-1 items-center justify-center rounded-md bg-navy-800 py-3 text-[13px] font-semibold text-white hover:bg-navy-700">My Events</Link></div>
            </div>
          ) : (
            <form onSubmit={submitReg} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="r-name"><input id="r-name" required className={inputCls} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
                <Field label="Email" htmlFor="r-email"><input id="r-email" type="email" required className={inputCls} value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} /></Field>
                <Field label="Phone" htmlFor="r-phone"><input id="r-phone" type="tel" required className={inputCls} value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} placeholder="+91" /></Field>
                <Field label="Company / College" htmlFor="r-co"><input id="r-co" className={inputCls} value={f.company} onChange={(x) => setF({ ...f, company: x.target.value })} /></Field>
              </div>
              <Field label="Role"><ChoiceGroup options={["Founder", "Investor", "Business", "Mentor", "Student", "Professional"]} value={f.role} onChange={(v) => setF({ ...f, role: v })} name="Role" /></Field>
              {e.mode !== "Online" && <Field label="Food preference"><ChoiceGroup options={[...foods]} value={f.food} onChange={(v) => setF({ ...f, food: v })} name="Food" cols={2} /></Field>}
              {e.price > 0 && (
                <div className="rounded-lg border border-line bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-[13px]"><span className="font-semibold text-navy-900">Payment</span><span className="font-black text-navy-900">₹{e.price}</span></div>
                  <div className="mt-2"><ChoiceGroup options={[...payMethods]} value={f.pay} onChange={(v) => setF({ ...f, pay: v })} name="Payment" /></div>
                  <p className="mt-2 text-[11px] text-slate-500">Demo checkout — no real payment is taken. Refund policy in FAQ.</p>
                </div>
              )}
              <PrimaryBtn>{e.price ? `Pay ₹${e.price} & Confirm` : "Confirm Registration"}</PrimaryBtn>
              <p className="text-center text-[11px] text-slate-500">A confirmation with your QR pass will be sent to your email.</p>
            </form>
          )}
        </Gate>
      </Modal>

      {/* Feedback modal */}
      <Modal open={fbOpen} onClose={() => setFbOpen(false)} title="How was the event?" subtitle={e.title}>
        <form onSubmit={submitFb} className="space-y-4">
          <div className="flex justify-center gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`} className="p-1 transition-transform hover:scale-110"><Star className={cn("h-8 w-8", n <= rating ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} /></button>)}</div>
          <Field label="Review" htmlFor="fb-review"><textarea id="fb-review" rows={3} className={textareaCls} value={review} onChange={(x) => setReview(x.target.value)} placeholder="What did you like? What could be better?" /></Field>
          <Field label="Upload photos"><label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 px-3 py-3 text-[12.5px] text-slate-600 hover:border-navy-700 hover:bg-navy-50"><Upload className="h-4 w-4 text-navy-700" /><span className="flex-1 truncate">{photos.length ? `${photos.length} photo(s) selected` : "Choose images to share with attendees"}</span><input type="file" multiple accept="image/*" className="sr-only" onChange={(x) => setPhotos(Array.from(x.target.files ?? []).map((f) => f.name))} /></label></Field>
          <div className="flex gap-2"><PrimaryBtn disabled={!rating} className="flex-1">Submit feedback</PrimaryBtn><SecondaryBtn onClick={() => { if (!rating) return toast("Please rate the event first", "info"); submitFeedback(e.slug, rating, review, photos); requestCertificate(e.slug, e.title); setFbOpen(false); }} className="flex-1"><Award className="h-4 w-4" /> Submit & get certificate</SecondaryBtn></div>
        </form>
      </Modal>

      <ShareModal open={invite} onClose={() => setInvite(false)} title={`Join me at ${e.title}`} path={`/events/${e.slug}`} />
    </>
  );
}
