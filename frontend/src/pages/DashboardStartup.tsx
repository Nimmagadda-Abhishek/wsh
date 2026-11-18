import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Bell, Briefcase, Calendar, CheckCircle2, Eye, FileText, Landmark, MessageCircle, Rocket, ShieldCheck, Star, Trash2, Users } from "lucide-react";
import { getStartup, startups } from "../startups";
import { toast, useStore } from "../store";
import { Modal, PrimaryBtn, SecondaryBtn, Field, inputCls, ChoiceGroup } from "../components/ui/Modal";
import { cn } from "../utils/cn";

const KEY = "wshub:my-startup";

export function DashboardStartup() {
  const s = useStore((x) => x);
  const [mine, setMine] = useState<string | null>(() => localStorage.getItem(KEY));
  const [claim, setClaim] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [adminState, setAdminState] = useState<Record<string, { status: "Pending" | "Approved" | "Rejected" | "Suspended"; verified: boolean; featured: boolean }>>({});
  const [form, setForm] = useState({ name: "", industry: "AgriTech", stage: "MVP", website: "" });
  const startup = mine ? getStartup(mine) : undefined;

  const interests = s.startupInterests;
  const contacts = s.startupContacts;
  const meetings = s.startupMeetings;
  const followers = s.followsStartups.length;
  const stats = [
    { l: "Visitors (30d)", v: startup ? startup.views : 0, i: Eye }, { l: "Investor interest", v: interests.length + (startup ? Math.round(startup.trending / 12) : 0), i: Landmark }, { l: "Messages", v: contacts.length, i: MessageCircle },
    { l: "Collaboration requests", v: s.intros.length + s.connections.length, i: Users }, { l: "Jobs live", v: startup?.jobs.length ?? 0, i: Briefcase }, { l: "Followers", v: (startup?.followers ?? 0) + followers, i: Bell },
  ];

  if (!startup) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Rocket className="mx-auto h-9 w-9 text-slate-300" />
        <h2 className="mt-3 text-[18px] font-bold text-navy-900">Startup profiles aren’t available yet</h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-600">This dashboard will show startup information once it is connected to a live WS Hub data source.</p>
        <Link to="/startups" className="mt-4 inline-flex rounded-md border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-navy-800 hover:bg-navy-50">Browse startups</Link>
      </div>
    );
  }

  const a = adminState[startup.slug] ?? { status: "Approved" as const, verified: startup.verified, featured: !!startup.featured };
  const setA = (patch: Partial<typeof a>) => setAdminState((st) => ({ ...st, [startup.slug]: { ...a, ...patch } }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-[18px] font-black" style={{ background: startup.logo.bg, color: startup.logo.fg }}>{startup.logo.initials}</span>
        <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wide text-gold-800">My Startup</p><p className="text-[20px] font-black text-navy-900">{startup.name}</p><p className="text-[12.5px] text-slate-600">{startup.industry} · {startup.stage} · {a.verified ? "Verified" : "Verification pending"} · Status: <span className={cn("font-semibold", a.status === "Approved" ? "text-emerald-700" : a.status === "Suspended" || a.status === "Rejected" ? "text-red-600" : "text-amber-700")}>{a.status}</span></p></div>
        <div className="flex flex-wrap gap-2"><Link to={`/startups/${startup.slug}`} className="btn-navy px-4 py-2.5">View public profile</Link><button type="button" onClick={() => toast("Profile editor opens with the Admin milestone — our team can update details for you", "info")} className="rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">Edit</button><button type="button" onClick={() => setAdmin((v) => !v)} className="rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><ShieldCheck className="mr-1 inline h-4 w-4" /> Admin</button></div>
      </div>

      {admin && (
        <div className="rounded-xl border border-gold-300 bg-gold-100/40 p-4"><p className="text-[12.5px] font-bold text-navy-900">Admin controls (demo)</p><div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold">
          <button type="button" onClick={() => { setA({ status: "Approved" }); toast("Startup approved"); }} className="rounded-md bg-emerald-600 px-3 py-1.5 text-white">Approve</button>
          <button type="button" onClick={() => { setA({ status: "Rejected" }); toast("Startup rejected", "info"); }} className="rounded-md bg-red-600 px-3 py-1.5 text-white">Reject</button>
          <button type="button" onClick={() => { setA({ verified: !a.verified }); toast(a.verified ? "Verification removed" : "Startup verified"); }} className="rounded-md bg-navy-800 px-3 py-1.5 text-white">{a.verified ? "Unverify" : "Verify"}</button>
          <button type="button" onClick={() => { setA({ featured: !a.featured }); toast(a.featured ? "Removed from featured" : "Featured on home"); }} className="rounded-md bg-gold-500 px-3 py-1.5 text-navy-900">{a.featured ? "Unfeature" : "Feature"}</button>
          <button type="button" onClick={() => { setA({ status: "Suspended" }); toast("Startup suspended", "info"); }} className="rounded-md border border-slate-400 px-3 py-1.5 text-navy-900">Suspend</button>
          <button type="button" onClick={() => { localStorage.removeItem(KEY); setMine(null); toast("Startup profile removed", "info"); }} className="rounded-md border border-red-300 px-3 py-1.5 text-red-600"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete</button>
        </div></div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{stats.map((st) => <div key={st.l} className="card p-4"><st.i className="h-5 w-5 text-gold-500" /><p className="mt-2 text-[22px] font-black text-navy-900">{st.v}</p><p className="text-[11px] text-slate-500">{st.l}</p></div>)}</div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5"><h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><BarChart3 className="h-4 w-4" /> Visitors — last 12 weeks</h3><div className="mt-3 flex h-28 items-end gap-1">{startup.traction.monthly.map((v, i) => <div key={i} className="flex-1 rounded-t bg-navy-800/80" style={{ height: `${(v / Math.max(...startup.traction.monthly)) * 100}%` }} />)}</div><p className="mt-2 text-[11.5px] text-slate-500">Top sources: Founders directory, Investor Connect, Google. Upgrade to Premium for full analytics.</p></div>
        <div className="card p-5"><h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><CheckCircle2 className="h-4 w-4" /> Profile completeness — 72%</h3><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[72%] rounded-full bg-gold-500" /></div><ul className="mt-3 space-y-1.5 text-[12.5px]">{[["Add pitch deck", "documents"], ["Add 2 more team members", "team"], ["Upload product demo video", "products"], ["Add customer testimonials", "reviews"]].map(([t, tab]) => <li key={t} className="flex items-center justify-between"><span className="text-slate-700">{t}</span><Link to={`/startups/${startup.slug}#${tab}`} className="text-[11.5px] font-semibold text-navy-700 hover:underline">Go</Link></li>)}</ul></div>
      </div>

      <Pipeline />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5"><h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><Briefcase className="h-4 w-4" /> Jobs</h3><ul className="mt-3 space-y-2 text-[12.5px]">{startup.jobs.map((j) => <li key={j.title} className="flex items-center justify-between"><span className="text-slate-700">{j.title}</span><span className="text-[10.5px] text-slate-400">{j.type}</span></li>)}</ul><button type="button" onClick={() => toast("Job posting opens with the Jobs milestone — our team can post for you", "info")} className="mt-3 w-full rounded-md border border-slate-300 py-2 text-[12px] font-semibold text-navy-800 hover:bg-navy-50">Post a job</button></div>
        <div className="card p-5"><h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><Calendar className="h-4 w-4" /> Events</h3><p className="mt-2 text-[12.5px] text-slate-600">Speaking slots and sponsorships boost visibility.</p><Link to="/events" className="mt-3 block w-full rounded-md border border-slate-300 py-2 text-center text-[12px] font-semibold text-navy-800 hover:bg-navy-50">Find events</Link></div>
        <div className="card p-5"><h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><FileText className="h-4 w-4" /> Documents & access requests</h3><ul className="mt-3 space-y-1.5 text-[12.5px]">{s.docAccess.filter((d) => d.startupSlug === startup.slug).map((d) => <li key={d.id} className="flex items-center justify-between"><span className="truncate text-slate-700">{d.doc}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", d.status === "Granted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{d.status}</span></li>)}{s.docAccess.filter((d) => d.startupSlug === startup.slug).length === 0 && <li className="text-slate-500">No access requests yet.</li>}</ul></div>
      </div>

      <div className="card p-5"><h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><Star className="h-4 w-4" /> Saved by users</h3><p className="mt-1 text-[12.5px] text-slate-600">{(startup.followers + followers).toLocaleString("en-IN")} members follow {startup.name}; {Math.round(startup.followers * 0.6)} have saved it. Members who saved you are 3× more likely to respond to a message.</p><SecondaryBtn onClick={() => toast("Members who saved your startup are visible to Premium members", "info", "/membership")} className="mt-3">View saved users</SecondaryBtn></div>
    </div>
  );
}

function Pipeline() {
  const s = useStore((x) => x);
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><Landmark className="h-4 w-4" /> Investor interest & meetings</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {(["Pending", "Founder viewed", "Meeting"] as const).map((col) => <div key={col} className="rounded-xl border border-line bg-slate-50/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{col} ({s.startupInterests.filter((i) => i.status === col).length})</p><ul className="mt-2 space-y-2">{s.startupInterests.filter((i) => i.status === col).map((i) => <li key={i.id} className="rounded-lg border border-line bg-white p-3"><Link to={`/startups/${i.startupSlug}`} className="text-[13px] font-bold text-navy-900 hover:text-navy-600">{i.startupName}</Link><p className="text-[11.5px] text-slate-500">{i.investorName} · {i.organization} · {i.range}</p></li>)}</ul></div>)}
      </div>
      {s.startupMeetings.length > 0 && <ul className="mt-3 space-y-2 text-[12.5px]">{s.startupMeetings.map((m) => <li key={m.id} className="flex items-center justify-between rounded-lg border border-line p-3"><span><span className="font-bold text-navy-900">{m.kind}</span> with {m.startupName} · {m.date} {m.slot} · {m.mode}</span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", m.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{m.status}</span></li>)}</ul>}
      {s.startupInterests.length + s.startupMeetings.length === 0 && <p className="mt-2 text-[12.5px] text-slate-500">No investor interest yet. <Link to="/investors" className="font-semibold text-navy-700">Share your startup with investors →</Link></p>}
    </div>
  );
}
