import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bell, BellRing, Calendar, Download, Eye, FileText, Landmark, Lock, Mail, MonitorPlay, Paperclip, QrCode, Share2 } from "lucide-react";
import { bookStartupMeeting, contactFounder, requestDocAccess, submitStartupInterest, toast, toggleFollowStartup, track, useStore } from "../../store";
import { investorRanges } from "../../investors";
import type { Startup } from "../../startups";
import { Gate, ShareModal, Success } from "./Actions";
import { ChoiceGroup, Field, inputCls, Modal, PrimaryBtn, SecondaryBtn, textareaCls } from "./Modal";
import { QrSvg } from "../../pages/EventDetails";
import { cn } from "../../utils/cn";

const btn = (size: "sm" | "md") => cn("inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all", size === "sm" ? "px-3 py-2 text-[11.5px]" : "px-4 py-2.5 text-[12.5px]");

/* ---------- Contact Founder ---------- */
const purposes = ["Partnership", "Customer enquiry", "Hiring / Join team", "Mentorship", "Press / Media", "Other"] as const;
export function ContactFounderBtn({ s, size = "md", className }: { s: Startup; size?: "sm" | "md"; className?: string }) {
  const user = useStore((x) => x.user);
  const existing = useStore((x) => x.startupContacts.find((c) => c.startupSlug === s.slug));
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: user?.name ?? "", email: user?.email ?? "", company: "", role: "", purpose: "Partnership" as (typeof purposes)[number], message: "" });
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => { e.preventDefault(); contactFounder(s.slug, s.name, f.purpose, f.message); setDone(true); };
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setF((x) => ({ ...x, name: x.name || user?.name || "", email: x.email || user?.email || "" })); setOpen(true); }} className={cn(btn(size), "bg-navy-800 text-white hover:bg-navy-700 hover:shadow-[0_8px_18px_-8px_rgba(15,42,92,0.7)]", className)}>
        <Mail className="h-3.5 w-3.5" /> {existing ? "Message sent" : "Contact Founder"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Contact Founder" subtitle={`${s.name} · founder will reply via WS Hub messages`}>
        <Gate reason={`Sign in to contact ${s.name}'s founder. Contact details stay private.`}>
          {done ? <Success title="Message sent" body="The founder will reply in your WS Hub inbox — usually within 2 days." to="/dashboard?tab=messages" toLabel="Open messages" onClose={() => setOpen(false)} /> : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="cf-name"><input id="cf-name" required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                <Field label="Email" htmlFor="cf-email"><input id="cf-email" type="email" required className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
                <Field label="Company" htmlFor="cf-co"><input id="cf-co" className={inputCls} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
                <Field label="Role" htmlFor="cf-role"><input id="cf-role" required className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Founder, Buyer, Student…" /></Field>
              </div>
              <Field label="Purpose"><ChoiceGroup options={[...purposes]} value={f.purpose} onChange={(v) => setF({ ...f, purpose: v })} name="Purpose" /></Field>
              <Field label="Message" htmlFor="cf-msg"><textarea id="cf-msg" required minLength={20} rows={4} className={textareaCls} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Be specific — what do you need and by when? (min 20 characters)" /></Field>
              <PrimaryBtn>Send message</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Investor Interest ---------- */
const stages = ["Pre-Seed", "Seed", "Series A", "Series B+", "Growth"] as const;
export function InvestorInterestBtn({ s, size = "md", className, variant = "gold" }: { s: Startup; size?: "sm" | "md"; className?: string; variant?: "gold" | "outline" }) {
  const user = useStore((x) => x.user);
  const existing = useStore((x) => x.startupInterests.find((c) => c.startupSlug === s.slug));
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ investorName: user?.name ?? "", organization: "", range: investorRanges[2].label, stage: (s.stage === "Idea" || s.stage === "MVP" ? "Pre-Seed" : s.stage === "Growth" || s.stage === "Scaleup" ? "Growth" : s.stage) as (typeof stages)[number], sector: s.industry, message: "", profile: undefined as string | undefined });
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => { e.preventDefault(); submitStartupInterest({ startupSlug: s.slug, startupName: s.name, ...f }); setDone(true); };
  if (existing) return <Link to="/dashboard?tab=startup" className={cn(btn(size), "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", className)}><Landmark className="h-3.5 w-3.5" /> Interest: {existing.status}</Link>;
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setF((x) => ({ ...x, investorName: x.investorName || user?.name || "" })); setOpen(true); }} className={cn(btn(size), variant === "gold" ? "bg-gold-500 text-navy-900 hover:bg-gold-400 hover:shadow-[0_10px_20px_-10px_rgba(226,176,74,0.9)]" : "border border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50", className)}>
        <Landmark className="h-3.5 w-3.5" /> Investor Interest
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Express investor interest" subtitle={`${s.name}${s.funding.seeking ? ` · seeking ${s.funding.seeking}` : ""}`} size="lg">
        <Gate reason="Sign in as an investor to express interest.">
          {done ? <Success title="Interest submitted" body={`${s.name}'s founder has been notified and can see your profile. You'll be alerted when they respond — book a meeting to move faster.`} to="/dashboard?tab=startup" toLabel="View pipeline" onClose={() => setOpen(false)} /> : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Investor name" htmlFor="ii-name"><input id="ii-name" required className={inputCls} value={f.investorName} onChange={(e) => setF({ ...f, investorName: e.target.value })} /></Field>
                <Field label="Organization" htmlFor="ii-org"><input id="ii-org" required className={inputCls} value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} placeholder="Fund, network or 'Independent'" /></Field>
                <Field label="Investment range" htmlFor="ii-range"><select id="ii-range" className="select" value={f.range} onChange={(e) => setF({ ...f, range: e.target.value })}>{investorRanges.slice(1).map((r) => <option key={r.label}>{r.label}</option>)}</select></Field>
                <Field label="Sector" htmlFor="ii-sector"><input id="ii-sector" className={inputCls} value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} /></Field>
              </div>
              <Field label="Investment stage"><ChoiceGroup options={[...stages]} value={f.stage} onChange={(v) => setF({ ...f, stage: v })} name="Stage" /></Field>
              <Field label="Attach investor profile">
                <label className={cn("flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 text-[12.5px] transition-colors hover:border-navy-700 hover:bg-navy-50", f.profile ? "border-verified bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600")}><Paperclip className="h-4 w-4" /><span className="flex-1 truncate">{f.profile ?? "PDF / one-pager (optional)"}</span><input type="file" accept=".pdf" className="sr-only" onChange={(e) => setF({ ...f, profile: e.target.files?.[0]?.name })} /></label>
              </Field>
              <Field label="Message" htmlFor="ii-msg"><textarea id="ii-msg" required minLength={20} rows={3} className={textareaCls} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Why this startup fits your thesis, and what you'd like to see next." /></Field>
              <PrimaryBtn>Submit interest</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Book Meeting / Schedule Demo ---------- */
const slots = ["10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM", "5:00 PM"] as const;
export function BookMeetingBtn({ s, kind = "Meeting", size = "md", className }: { s: Startup; kind?: "Meeting" | "Demo"; size?: "sm" | "md"; className?: string }) {
  const existing = useStore((x) => x.startupMeetings.find((m) => m.startupSlug === s.slug && m.kind === kind));
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(""); const [slot, setSlot] = useState<(typeof slots)[number]>("11:30 AM"); const [mode, setMode] = useState<"Virtual" | "Offline">("Virtual"); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  const days = Array.from({ length: 10 }).map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; }).filter((d) => d.getDay() !== 0);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!date) return setErr("Pick a date from the calendar."); setErr(null); bookStartupMeeting(s.slug, s.name, kind, date, slot, mode); setDone(true); };
  const Icon = kind === "Demo" ? MonitorPlay : Calendar;
  if (existing) return <Link to="/dashboard?tab=meetings" className={cn(btn(size), "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", className)}><Icon className="h-3.5 w-3.5" /> {kind} {existing.status.toLowerCase()}</Link>;
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={cn(btn(size), "border border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50", className)}>
        <Icon className="h-3.5 w-3.5" /> {kind === "Demo" ? "Schedule Demo" : "Book Meeting"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={kind === "Demo" ? "Schedule a product demo" : "Book a meeting"} subtitle={`with ${s.name}`}>
        <Gate reason={`Sign in to ${kind === "Demo" ? "schedule a demo" : "book a meeting"}.`}>
          {done ? <Success title={`${kind} requested`} body={`${s.name} will confirm ${date} · ${slot} (${mode}). A calendar invite follows confirmation.`} to="/dashboard?tab=meetings" toLabel="View meetings" onClose={() => setOpen(false)} /> : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Pick a date (next 10 days)">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Date">
                  {days.map((d) => { const v = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); return <button key={v} type="button" role="radio" aria-checked={date === v} onClick={() => setDate(v)} className={cn("rounded-md border px-2 py-2 text-center text-[11.5px] transition-all", date === v ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 hover:border-navy-700 hover:bg-navy-50")}><span className="block text-[10px] uppercase opacity-70">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span><span className="block text-[14px] font-bold">{d.getDate()}</span><span className="block text-[10px] opacity-70">{d.toLocaleDateString("en-IN", { month: "short" })}</span></button>; })}
                </div>
                {err && <p className="mt-1 text-[11.5px] text-red-600">{err}</p>}
              </Field>
              <Field label="Time slot (IST)"><ChoiceGroup options={[...slots]} value={slot} onChange={setSlot} name="Slot" /></Field>
              <Field label="Mode"><ChoiceGroup options={["Virtual", "Offline"]} value={mode} onChange={(v) => setMode(v as "Virtual" | "Offline")} name="Mode" cols={2} /></Field>
              {mode === "Offline" && <p className="rounded-md bg-navy-50 p-3 text-[12px] text-navy-900">Offline meetings happen at the startup's office or WS Hub, T-Hub Warangal. Address shared on confirmation.</p>}
              <PrimaryBtn>Confirm {kind.toLowerCase()} request</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Follow ---------- */
export function FollowStartupBtn({ s, size = "md", className }: { s: Startup; size?: "sm" | "md"; className?: string }) {
  const user = useStore((x) => x.user);
  const following = useStore((x) => x.followsStartups.includes(s.slug));
  return (
    <button type="button" onClick={() => (user ? toggleFollowStartup(s.slug, s.name) : toast("Sign in to follow startups", "info", "/login"))} className={cn(btn(size), following ? "bg-emerald-50 text-emerald-700" : "border border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50", className)} aria-pressed={following}>
      {following ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />} {following ? "Following" : "Follow"} <span className="text-[10.5px] opacity-70">{s.followers + (following ? 1 : 0)}</span>
    </button>
  );
}

/* ---------- Share with QR ---------- */
export function StartupShareBtn({ s, className, label }: { s: Startup; className?: string; label?: boolean }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState(false);
  const path = `/startups/${s.slug}`;
  return (
    <>
      <button type="button" aria-label="Share" onClick={() => setOpen(true)} className={cn(label ? btn("md") + " border border-slate-300 bg-white text-navy-800 hover:bg-navy-50" : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-navy-800 shadow-sm hover:shadow-md", className)}>
        <Share2 className="h-4 w-4" />{label && " Share"}
      </button>
      <ShareModal open={open && !qr} onClose={() => setOpen(false)} title={`${s.name} — ${s.tagline}`} path={path} />
      {open && !qr && (
        <button type="button" onClick={() => setQr(true)} className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-navy-900 px-4 py-2 text-[12px] font-semibold text-white shadow-lg sm:bottom-10"><QrCode className="mr-1.5 inline h-4 w-4" /> Show QR code</button>
      )}
      <Modal open={qr} onClose={() => { setQr(false); setOpen(false); }} title="Scan to open" subtitle={s.name} size="sm">
        <div className="flex flex-col items-center gap-3"><QrSvg value={`wshub:${s.slug}`} size={200} /><p className="text-center text-[12px] text-slate-500">Point a phone camera at the code to open {s.name}'s profile.</p><SecondaryBtn onClick={() => { track("shares", path); toast("QR downloaded"); }} className="w-full"><Download className="h-4 w-4" /> Download QR</SecondaryBtn></div>
      </Modal>
    </>
  );
}

/* ---------- Document row ---------- */
export function DocRow({ s, d }: { s: Startup; d: Startup["documents"][number] }) {
  const user = useStore((x) => x.user);
  const access = useStore((x) => x.docAccess.find((a) => a.startupSlug === s.slug && a.doc === d.name));
  const canDownload = d.access === "public" || access?.status === "Granted";
  const [preview, setPreview] = useState(false);
  const dl = () => { if (!user) return toast("Sign in to download documents", "info", "/login"); track("clicks", `doc:${s.slug}`); toast(`Downloading ${d.name}`, "info"); };
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700"><FileText className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-navy-900">{d.name}</p><p className="text-[11px] text-slate-500">{d.type} · {d.size}{d.access === "request" && !canDownload && " · restricted"}</p></div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={() => setPreview(true)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50"><Eye className="h-3.5 w-3.5" /> Preview</button>
        {canDownload ? <button type="button" onClick={dl} className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-navy-700"><Download className="h-3.5 w-3.5" /> Download</button>
          : <button type="button" onClick={() => (user ? requestDocAccess(s.slug, d.name) : toast("Sign in to request access", "info", "/login"))} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold", access ? "bg-amber-50 text-amber-800" : "bg-gold-500 text-navy-900 hover:bg-gold-400")}><Lock className="h-3.5 w-3.5" /> {access ? "Requested" : "Request Access"}</button>}
      </div>
      <Modal open={preview} onClose={() => setPreview(false)} title={d.name} subtitle={`${s.name} · ${d.type}`} size="lg">
        <div className="rounded-lg border border-line bg-slate-50 p-6">
          <div className="mx-auto max-w-md rounded-md bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-800">{s.name}</p><h3 className="mt-2 text-[20px] font-black text-navy-900">{d.name}</h3><p className="mt-3 text-[13px] text-slate-700">{s.overview.mission}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center">{[["Revenue", s.traction.revenue], ["Customers", s.traction.customers], ["Raised", s.fundingRaised ? `₹${s.fundingRaised} L` : "—"]].map(([k, v]) => <div key={k} className="rounded bg-slate-50 p-2"><p className="text-[12px] font-bold text-navy-900">{v}</p><p className="text-[10px] text-slate-500">{k}</p></div>)}</div>{!canDownload && <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-[12px] text-amber-800"><Lock className="h-4 w-4" /> Full document requires access from the founder.</div>}<p className="mt-4 text-[10px] text-slate-400">Page 1 of {d.type === "PDF" ? 12 : 3} · Document viewer preview</p></div>
        </div>
      </Modal>
    </li>
  );
}
