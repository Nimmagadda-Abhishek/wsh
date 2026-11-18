import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Award, BarChart3, Calendar, Download, PenSquare, Star, Ticket } from "lucide-react";
import { events, fmtEventDate, fmtTime, getEvent, isPast } from "../events";
import { getStory } from "../stories";
import { comparison, fmtINR, getPlan, planRank, plans } from "../membership";
import { EventCard } from "./Events";
import { QrSvg } from "./EventDetails";
import { StoryCard, SubmitStoryModal } from "./Stories";
import { Comparison } from "./Membership";
import { ChoiceGroup, Field, Modal, PrimaryBtn, SecondaryBtn, textareaCls } from "../components/ui/Modal";
import { cancelMembership, pauseMembership, renewMembership, resumeMembership, toast, useStore } from "../store";
import { cn } from "../utils/cn";

function Empty({ title, text, to, cta }: { title: string; text: string; to: string; cta: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="text-[15px] font-bold text-navy-900">{title}</h3><p className="mx-auto mt-1 max-w-sm text-[12.5px] text-slate-500">{text}</p><Link to={to} className="btn-navy mt-4 px-5 py-2.5 text-xs">{cta}</Link></div>;
}
const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="mb-3 text-[15px] font-bold text-navy-900">{title}</h2>{children}</section>;

/* ---------- My Events ---------- */
export function DashboardEvents() {
  const s = useStore((x) => x);
  const [sub, setSub] = useState<"Upcoming" | "Past" | "Saved" | "Certificates" | "Organizer">("Upcoming");
  const regs = s.registrations.filter((r) => r.status !== "Cancelled").map((r) => ({ r, e: getEvent(r.eventSlug)! })).filter((x) => x.e);
  const upcoming = regs.filter((x) => !isPast(x.e)); const past = regs.filter((x) => isPast(x.e));
  const saved = s.saved.event.map(getEvent).filter(Boolean);
  const download = (name: string, body: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/plain" })); a.download = name; a.click(); };
  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-[12px] font-semibold hide-scrollbar">{(["Upcoming", "Past", "Saved", "Certificates", "Organizer"] as const).map((k) => <button key={k} type="button" onClick={() => setSub(k)} className={cn("shrink-0 rounded-md px-3.5 py-1.5", sub === k ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}>{k}{k === "Upcoming" && upcoming.length > 0 && ` (${upcoming.length})`}{k === "Certificates" && s.certificates.length > 0 && ` (${s.certificates.length})`}</button>)}</div>
      {sub === "Upcoming" && (upcoming.length === 0 ? <Empty title="No upcoming events" text="Register for a meetup, workshop or investor connect to get your QR pass here." to="/events" cta="Explore events" /> : <div className="grid gap-3">{upcoming.map(({ r, e }) => <div key={r.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><QrSvg value={r.code} size={96} /><div className="min-w-0 flex-1"><p className="text-[10.5px] font-bold uppercase tracking-wide text-gold-800">{e.type} · {r.code}</p><Link to={`/events/${e.slug}`} className="block text-[15px] font-bold text-navy-900 hover:text-navy-600">{e.title}</Link><p className="text-[12px] text-slate-500">{fmtEventDate(e.start)} · {fmtTime(e.start)} · {e.venue}</p><p className="mt-1 text-[11.5px] text-slate-500">{r.name} · {r.role} · {r.food}</p></div><div className="flex gap-2"><Link to={`/events/${e.slug}`} className="btn-navy px-3 py-2"><Ticket className="h-3.5 w-3.5" /> View pass</Link><button type="button" onClick={() => download(`ticket-${r.code}.txt`, `WS HUB PASS\n${e.title}\n${r.code}\n${r.name}`)} className="rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50"><Download className="h-3.5 w-3.5" /></button></div></div>)}</div>)}
      {sub === "Past" && (past.length === 0 ? <Empty title="No past events yet" text="Events you've attended will appear here with feedback and certificate options." to="/events?when=Past+Events" cta="Browse past events" /> : <div className="grid gap-3">{past.map(({ r, e }) => { const fb = s.feedback.find((f) => f.eventSlug === e.slug); const cert = s.certificates.find((c) => c.eventSlug === e.slug); return <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><img src={e.cover} alt="" className="h-16 w-24 rounded-lg object-cover" /><div className="min-w-0 flex-1"><Link to={`/events/${e.slug}`} className="block text-[14.5px] font-bold text-navy-900 hover:text-navy-600">{e.title}</Link><p className="text-[12px] text-slate-500">{fmtEventDate(e.start)} · {r.status}</p>{fb && <p className="mt-1 flex items-center gap-1 text-[11.5px] text-gold-800">{Array.from({ length: fb.rating }).map((_, i) => <Star key={i} className="h-3 w-3" fill="currentColor" strokeWidth={0} />)} Your rating</p>}</div><div className="flex gap-2">{!fb && <Link to={`/events/${e.slug}`} className="btn-navy px-3 py-2">Rate event</Link>}{cert ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-2 text-[11.5px] font-semibold text-emerald-700"><Award className="h-3.5 w-3.5" /> Certificate</span> : <Link to={`/events/${e.slug}`} className="rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800">Get certificate</Link>}</div></div>; })}</div>)}
      {sub === "Saved" && (saved.length === 0 ? <Empty title="No saved events" text="Tap the bookmark on any event to keep it here." to="/events" cta="Explore events" /> : <div className="grid gap-4 md:grid-cols-2">{saved.map((e) => e && <EventCard key={e.slug} e={e} view="grid" />)}</div>)}
      {sub === "Certificates" && (s.certificates.length === 0 ? <Empty title="No certificates yet" text="Attend an event, rate it and request your certificate of participation." to="/events?when=Past+Events" cta="Past events" /> : <div className="grid gap-3 sm:grid-cols-2">{s.certificates.map((c) => <div key={c.id} className="card overflow-hidden"><div className="bg-navy-900 p-5 text-center text-white"><Award className="mx-auto h-8 w-8 text-gold-400" /><p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/70">Certificate of Participation</p><p className="mt-1 text-[15px] font-bold">{c.eventTitle}</p><p className="text-[11.5px] text-white/70">Awarded to {s.user?.name} · {new Date(c.issuedAt).toLocaleDateString("en-IN")}</p><p className="mt-1 text-[10px] text-gold-400">{c.id}</p></div><div className="flex gap-2 p-3"><button type="button" onClick={() => download(`${c.id}.txt`, `WS HUB CERTIFICATE\n${c.eventTitle}\nAwarded to ${s.user?.name}\n${c.id}`)} className="btn-navy flex-1 py-2"><Download className="h-3.5 w-3.5" /> Download</button><button type="button" onClick={() => toast("Shared to LinkedIn (demo)")} className="flex-1 rounded-md border border-slate-300 py-2 text-[11.5px] font-semibold text-navy-800">Share on LinkedIn</button></div></div>)}</div>)}
      {sub === "Organizer" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Events hosted", events.filter((e) => e.organizer.name === "WS Hub").length], ["Registrations", s.registrations.length + 128], ["Attendance", "82%"], ["Revenue", fmtINR(s.registrations.reduce((a, r) => a + r.amount, 0) + 24500)]].map(([k, v]) => <div key={k as string} className="card p-4"><p className="text-[22px] font-black text-navy-900">{v}</p><p className="text-[11.5px] text-slate-500">{k}</p></div>)}</div>
          <div className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[15px] font-bold text-navy-900">Organizer tools</p><p className="text-[12.5px] text-slate-600">Create events, manage registrations, check-in with QR, issue certificates and export CSV.</p></div><div className="flex gap-2"><button type="button" onClick={() => toast("Event builder opens with the Organizer Dashboard milestone — our team can publish for you today", "info")} className="btn-navy px-4 py-2.5"><Calendar className="h-4 w-4" /> Create event</button><button type="button" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([["name,email,event,code,status", ...s.registrations.map((r) => `${r.name},${r.email},${r.eventTitle},${r.code},${r.status}`)].join("\n")], { type: "text/csv" })); a.download = "registrations.csv"; a.click(); }} className="rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">Export CSV</button></div></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-[12.5px]"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Attendee</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-line">{s.registrations.slice(0, 6).map((r) => <tr key={r.id}><td className="px-3 py-2 font-semibold text-navy-900">{r.name}</td><td className="px-3 py-2 text-slate-600">{r.eventTitle}</td><td className="px-3 py-2 font-mono text-slate-600">{r.code}</td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold">{r.status}</span></td></tr>)}{s.registrations.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">Registrations you receive will appear here.</td></tr>}</tbody></table></div></div>
        </div>
      )}
    </div>
  );
}

/* ---------- Stories ---------- */
export function DashboardStories() {
  const s = useStore((x) => x);
  const [open, setOpen] = useState(false);
  const saved = s.saved.story.map(getStory).filter(Boolean);
  const liked = s.storyLikes.map(getStory).filter(Boolean);
  const totals = { views: s.userStories.reduce((a, x) => a + x.views, 0), reads: Math.round(s.userStories.reduce((a, x) => a + x.views, 0) * 0.62), shares: s.userStories.filter((x) => x.status === "Published").length * 7, comments: Object.values(s.comments).reduce((a, c) => a + c.length, 0) };
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Views", totals.views], ["Reads", totals.reads], ["Shares", totals.shares], ["Comments", totals.comments]].map(([k, v]) => <div key={k as string} className="card px-4 py-3"><p className="text-[20px] font-black text-navy-900">{v}</p><p className="text-[11px] text-slate-500">{k}</p></div>)}</div><button type="button" onClick={() => setOpen(true)} className="btn-navy px-4 py-2.5"><PenSquare className="h-4 w-4" /> Write a story</button></div>
      <Sec title={`Your stories (${s.userStories.length})`}>{s.userStories.length === 0 ? <Empty title="No stories yet" text="Share your founder journey, funding news or lessons learned — reviewed within 2 days." to="/stories" cta="See examples" /> : <div className="overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full text-left text-[12.5px]"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Views</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-line">{s.userStories.map((x) => <tr key={x.id}><td className="px-4 py-3 font-semibold text-navy-900">{x.title}</td><td className="px-4 py-3 text-slate-600">{x.category}</td><td className="px-4 py-3 text-slate-600">{x.views}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-bold", x.status === "Published" ? "bg-emerald-100 text-emerald-800" : x.status === "Pending Review" ? "bg-amber-100 text-amber-800" : x.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>{x.status}</span></td></tr>)}</tbody></table></div>}</Sec>
      {saved.length > 0 && <Sec title={`Bookmarked (${saved.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{saved.map((x) => x && <StoryCard key={x.slug} s={x} />)}</div></Sec>}
      {liked.length > 0 && <Sec title={`Liked (${liked.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{liked.map((x) => x && <StoryCard key={x.slug} s={x} />)}</div></Sec>}
      {s.follows.length > 0 && <p className="text-[12.5px] text-slate-600">Following {s.follows.length} author{s.follows.length > 1 && "s"} — you'll be alerted when they publish.</p>}
      <SubmitStoryModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ---------- Membership ---------- */
const reasons = ["Too expensive", "Not using enough", "Missing features", "Switching plan", "Other"];
export function DashboardMembership() {
  const s = useStore((x) => x);
  const m = s.membership; const plan = getPlan(m.plan)!;
  const [upgrade, setUpgrade] = useState(false); const [cancel, setCancel] = useState(false); const [reason, setReason] = useState(reasons[0]); const [fbText, setFbText] = useState("");
  const daysLeft = m.renewsAt ? Math.ceil((new Date(m.renewsAt).getTime() - Date.now()) / 864e5) : null;
  const reminder = daysLeft !== null && daysLeft <= 30 ? (daysLeft <= 7 ? "7-day" : daysLeft <= 15 ? "15-day" : "30-day") : null;
  const next = plans.find((p) => planRank[p.id] === planRank[m.plan] + 1);
  const used = { events: s.registrations.filter((r) => r.status !== "Cancelled").length, messages: s.connections.filter((c) => c.status === "Accepted").length, stories: s.userStories.length, saves: Object.values(s.saved).reduce((a, v) => a + v.length, 0) };
  const download = (inv: (typeof s.invoices)[number]) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`WS HUB TAX INVOICE ${inv.id}\nPlan: ${inv.plan} (${inv.period})\nAmount: ₹${inv.amount} (incl. GST)\nDate: ${new Date(inv.at).toLocaleDateString("en-IN")}${inv.note ? `\n${inv.note}` : ""}`], { type: "text/plain" })); a.download = `${inv.id}.txt`; a.click(); };
  return (
    <div className="space-y-6">
      {reminder && m.status === "active" && m.plan !== "free" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-300 bg-gold-100/50 p-4 text-[13px] text-navy-900"><span><span className="font-bold">{reminder} reminder:</span> your {plan.name} membership renews in {daysLeft} day{daysLeft !== 1 && "s"} ({new Date(m.renewsAt).toLocaleDateString("en-IN")}).</span><button type="button" onClick={() => renewMembership(m.billing === "yearly" ? plan.yearly : plan.monthly)} className="rounded-md bg-navy-800 px-4 py-2 text-[12px] font-semibold text-white">Renew now (one click)</button></div>}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className={cn("rounded-xl p-5 text-white", m.plan === "free" ? "bg-navy-800" : "bg-navy-900")}>
          <div className="flex items-start justify-between"><div><p className="text-[11px] uppercase tracking-wide text-white/70">Current plan</p><p className="text-[28px] font-black">{plan.name}{m.plan !== "free" && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 align-middle text-[11px] font-semibold capitalize">{m.status}</span>}</p><p className="text-[12.5px] text-white/75">{m.plan === "free" ? "Basic access · upgrade to unlock investor access and unlimited events" : `${fmtINR(m.billing === "yearly" ? plan.yearly : plan.monthly)} / ${m.billing === "yearly" ? "year" : "month"} · ${m.status === "cancelled" ? "access until" : "renews"} ${new Date(m.renewsAt).toLocaleDateString("en-IN")}`}</p></div><Star className="h-8 w-8 text-gold-400" fill="currentColor" /></div>
          <div className="mt-5 flex flex-wrap gap-2">
            {next && <button type="button" onClick={() => setUpgrade(true)} className="rounded-md bg-gold-500 px-4 py-2 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400">Upgrade to {next.name}</button>}
            {m.plan !== "free" && m.status === "active" && <><button type="button" onClick={pauseMembership} className="rounded-md border border-white/40 px-4 py-2 text-[12.5px] font-semibold hover:bg-white/10">Pause</button><button type="button" onClick={() => setCancel(true)} className="rounded-md border border-white/40 px-4 py-2 text-[12.5px] font-semibold hover:bg-white/10">Cancel</button></>}
            {m.status === "paused" && <button type="button" onClick={resumeMembership} className="rounded-md bg-white px-4 py-2 text-[12.5px] font-bold text-navy-900">Resume membership</button>}
            {m.status === "cancelled" && <button type="button" onClick={resumeMembership} className="rounded-md bg-white px-4 py-2 text-[12.5px] font-bold text-navy-900">Reactivate</button>}
            <Link to="/membership" className="rounded-md border border-white/40 px-4 py-2 text-[12.5px] font-semibold hover:bg-white/10">Compare plans</Link>
          </div>
        </div>
        <div className="card p-5"><p className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><BarChart3 className="h-4 w-4" /> Usage this period</p><ul className="mt-3 space-y-2.5 text-[12.5px]">{[["Events joined", used.events, m.plan === "free" ? 1 : "∞"], ["Messages / connections", used.messages, m.plan === "free" ? 5 : m.plan === "business" ? 50 : "∞"], ["Stories published", used.stories, m.plan === "free" ? 0 : "∞"], ["Saved items", used.saves, "∞"]].map(([k, v, max]) => <li key={k as string}><div className="flex justify-between"><span className="text-slate-600">{k}</span><span className="font-semibold text-navy-900">{v} / {max}</span></div>{typeof max === "number" && max > 0 && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, (Number(v) / max) * 100)}%` }} /></div>}</li>)}</ul></div>
      </div>
      <Sec title="Benefits in your plan"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{comparison.map((r) => { const v = r.values[m.plan]; return <div key={r.feature} className={cn("flex items-center justify-between rounded-lg border p-3 text-[12.5px]", v === false ? "border-dashed border-slate-200 text-slate-400" : "border-line bg-white text-navy-900")}><span>{r.feature}</span><span className="font-semibold">{v === true ? "✓" : v === false ? "—" : v}</span></div>; })}</div></Sec>
      <Sec title="Billing & invoices">{s.invoices.length === 0 ? <p className="text-[12.5px] text-slate-500">No invoices yet.</p> : <div className="overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full text-left text-[12.5px]"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-2.5">Invoice</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5"></th></tr></thead><tbody className="divide-y divide-line">{s.invoices.map((i) => <tr key={i.id}><td className="px-4 py-3 font-mono text-navy-900">{i.id}</td><td className="px-4 py-3 capitalize text-slate-700">{i.plan} · {i.period}{i.note && <span className="block text-[10.5px] text-slate-400">{i.note}</span>}</td><td className="px-4 py-3 font-semibold">{fmtINR(i.amount)}</td><td className="px-4 py-3 text-slate-600">{new Date(i.at).toLocaleDateString("en-IN")}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => download(i)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 hover:underline"><Download className="h-3.5 w-3.5" /> PDF</button></td></tr>)}</tbody></table></div>}</Sec>

      {/* Upgrade popup */}
      <Modal open={upgrade} onClose={() => setUpgrade(false)} title={`Upgrade to ${next?.name}`} subtitle="Pay only the difference — applies immediately" size="lg">
        {next && <><Comparison highlight={next.id} /><div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-4 text-[13px]"><span>Difference ({m.billing}): <span className="font-black text-navy-900">{fmtINR(Math.max(0, (m.billing === "yearly" ? next.yearly - plan.yearly : next.monthly - plan.monthly)))}</span> + GST</span><Link to={`/membership/checkout?plan=${next.id}&billing=${m.billing}`} className="rounded-md bg-gold-500 px-5 py-2.5 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400">Upgrade</Link></div></>}
      </Modal>
      {/* Cancel popup */}
      <Modal open={cancel} onClose={() => setCancel(false)} title="Cancel membership?" subtitle="You keep all benefits until the end of the billing period">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); cancelMembership(reason + (fbText ? ` — ${fbText}` : "")); setCancel(false); }} className="space-y-4">
          <Field label="Reason"><ChoiceGroup options={reasons} value={reason} onChange={setReason} name="Reason" /></Field>
          <Field label="Feedback (optional)" htmlFor="cf"><textarea id="cf" rows={3} className={textareaCls} value={fbText} onChange={(e) => setFbText(e.target.value)} /></Field>
          <div className="rounded-lg bg-navy-50 p-3 text-[12.5px] text-navy-900">Not ready to leave? <button type="button" onClick={() => { pauseMembership(); setCancel(false); }} className="font-bold underline">Pause for up to 3 months</button> instead — no billing while paused.</div>
          <div className="flex gap-2"><SecondaryBtn onClick={() => setCancel(false)} className="flex-1">Keep membership</SecondaryBtn><PrimaryBtn className="flex-1 bg-red-600 text-white hover:bg-red-500 hover:shadow-none">Cancel membership</PrimaryBtn></div>
        </form>
      </Modal>
    </div>
  );
}
