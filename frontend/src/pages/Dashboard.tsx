import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, Bookmark, Briefcase, Eye, FileText, Handshake, Inbox, MessageCircle, Send, Users } from "lucide-react";
import { businesses } from "../businesses";
import { getFounder } from "../founders";
import { getInvestor } from "../investors";
import { getOpportunity } from "../opportunities";
import { AuthForm } from "../components/ui/AuthForm";
import { BusinessCard } from "../components/BusinessCard";
import { FounderCard } from "./Founders";
import { InvestorCard } from "./Investors";
import { OpportunityCard } from "./Opportunities";
import { StartupCard } from "./Startups";
import { getStartup } from "../startups";
import { logout, markAllRead, markRead, respondReceived, timeAgo, toast, useStore, type AppStatus, type ReqStatus } from "../store";
import { cn } from "../utils/cn";
import { DashboardEvents, DashboardMembership, DashboardStories } from "./DashboardModules";
import { DashboardStartup } from "./DashboardStartup";
import { Rocket } from "lucide-react";
import { BarChart3, Calendar, CalendarCheck, Check, CreditCard, PenSquare, X } from "lucide-react";
import { profileApi } from "../api";

const tabs = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "requests", label: "Requests", icon: Send },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "meetings", label: "Meetings", icon: CalendarCheck },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "startup", label: "My Startup", icon: Rocket },
  { id: "events", label: "My Events", icon: Calendar },
  { id: "stories", label: "Stories", icon: PenSquare },
  { id: "membership", label: "Membership", icon: CreditCard },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "post", label: "Post Opportunity", icon: Inbox },
];

const statusCls: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Accepted: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-700",
  Applied: "bg-slate-100 text-slate-700",
  Shortlisted: "bg-emerald-100 text-emerald-800",
  Meeting: "bg-indigo-100 text-indigo-800",
  Completed: "bg-navy-100 text-navy-800",
  Requested: "bg-amber-100 text-amber-800",
  Confirmed: "bg-emerald-100 text-emerald-800",
  Declined: "bg-red-100 text-red-700",
  Sent: "bg-slate-100 text-slate-700",
  Answered: "bg-emerald-100 text-emerald-800",
};
const appSteps: AppStatus[] = ["Applied", "Shortlisted", "Meeting", "Accepted", "Completed"];
const Status = ({ s }: { s: ReqStatus | AppStatus | string }) => <span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-bold", statusCls[s] ?? "bg-slate-100 text-slate-700")}>{s}</span>;

function Empty({ icon: Icon, title, text, to, cta }: { icon: typeof Bell; title: string; text: string; to: string; cta: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" />
      <h3 className="mt-3 text-[15px] font-bold text-navy-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-slate-500">{text}</p>
      <Link to={to} className="btn-navy mt-4 px-5 py-2.5 text-xs">{cta}</Link>
    </div>
  );
}

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const s = useStore((x) => x);
  const [apiProfile, setApiProfile] = useState<any>(null);
  useEffect(() => {
    document.title = "Dashboard — WS Hub";
  }, []);
  useEffect(() => {
    if (!s.user) return;
    profileApi.get().then(setApiProfile).catch(() => setApiProfile(null));
    profileApi.notifications(1, 12, true).catch(() => undefined);
  }, [Boolean(s.user)]);

  if (!s.user) {
    return (
      <div className="page-in mx-auto max-w-md px-4 py-12">
        <h1 className="text-[26px] font-black text-navy-900">Your dashboard</h1>
        <p className="mt-1 text-[13px] text-slate-600">Sign in to see saved profiles, requests, applications and notifications.</p>
        <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-[var(--shadow-card)]"><AuthForm /></div>
      </div>
    );
  }

  const savedB = businesses.filter((b) => s.saved.business.includes(b.slug));
  const savedF = s.saved.founder.map(getFounder).filter(Boolean);
  const savedI = s.saved.investor.map(getInvestor).filter(Boolean);
  const savedO = s.saved.opportunity.map(getOpportunity).filter(Boolean);
  const savedS = s.saved.startup.map(getStartup).filter(Boolean);
  const savedCount = savedB.length + savedF.length + savedI.length + savedO.length + savedS.length;
  const requestsCount = s.connections.length + s.intros.length + s.interests.length;
  const pendingReceived = s.received.filter((r) => r.status === "Pending").length;
  const unread = s.notifications.filter((n) => !n.read).length;
  const connections = s.connections.filter((c) => c.status === "Accepted");

  const stats = [
    { label: "Profile views", value: s.profileViews, icon: Eye, to: "?tab=overview" },
    { label: "Saved", value: savedCount, icon: Bookmark, to: "?tab=saved" },
    { label: "Requests sent", value: requestsCount, icon: Send, to: "?tab=requests" },
    { label: "Connections", value: connections.length, icon: Users, to: "?tab=messages" },
    { label: "Applications", value: s.applications.length, icon: FileText, to: "?tab=applications" },
    { label: "Unread alerts", value: unread, icon: Bell, to: "?tab=notifications" },
  ];

  return (
    <div className="page-in mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-gold-800">Member Dashboard</p>
          <h1 className="mt-1 text-[28px] font-black text-navy-900">Hi, {(apiProfile?.full_name || s.user.name).split(" ")[0]} 👋</h1>
          <p className="text-[13px] text-slate-600">{s.user.role} · {s.user.email} {s.user.verified && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Verified member</span>}</p>
        </div>
        <button type="button" onClick={logout} className="self-start rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">Sign out</button>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line hide-scrollbar">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setParams({ tab: t.id })} className={cn("relative inline-flex shrink-0 items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-colors", tab === t.id ? "text-navy-900" : "text-slate-500 hover:text-navy-800")}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.id === "notifications" && unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
            {t.id === "requests" && pendingReceived > 0 && <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-navy-900">{pendingReceived}</span>}
            <span className={cn("absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-gold-500 transition-transform", tab === t.id ? "scale-x-100" : "scale-x-0")} />
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((st) => (
                <Link key={st.label} to={st.to} className="card p-4"><st.icon className="h-5 w-5 text-gold-500" /><p className="mt-2 text-[24px] font-black text-navy-900">{st.value}</p><p className="text-[11.5px] text-slate-500">{st.label}</p></Link>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-white p-5">
                <h2 className="text-[15px] font-bold text-navy-900">Recent activity</h2>
                <ul className="mt-3 space-y-2 text-[12.5px]">
                  {[...s.connections.map((c) => ({ at: c.at, text: `Connection request to ${c.founderName}`, status: c.status })), ...s.intros.map((i) => ({ at: i.at, text: `Intro to ${i.targetName} via ${i.via}`, status: i.status })), ...s.applications.map((a) => ({ at: a.at, text: `Applied: ${a.opportunityTitle}`, status: a.status }))]
                    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
                    .map((r, i) => <li key={i} className="flex items-center justify-between gap-3 border-b border-dashed border-line pb-2 last:border-0"><span className="text-slate-700">{r.text}</span><Status s={r.status} /></li>)}
                  {requestsCount + s.applications.length === 0 && <li className="text-slate-500">Nothing yet — explore <Link to="/founders" className="font-semibold text-navy-700">founders</Link>, <Link to="/investors" className="font-semibold text-navy-700">investors</Link> or <Link to="/opportunities" className="font-semibold text-navy-700">opportunities</Link>.</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-line bg-navy-900 p-5 text-white">
                <h2 className="text-[15px] font-bold">Complete your profile</h2>
                <p className="mt-1 text-[12.5px] text-white/75">Profiles with a photo, bio and requirements get 4× more connection requests.</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[45%] rounded-full bg-gold-500" /></div>
                <p className="mt-1 text-[11px] text-white/60">45% complete</p>
                <div className="mt-4 flex flex-wrap gap-2"><Link to="/profile/edit" className="rounded-md bg-gold-500 px-4 py-2 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400">Edit profile</Link><Link to="/businesses/manage" className="rounded-md border border-white/40 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-white/10">Manage businesses</Link></div>
              </div>
            </div>
          </div>
        )}

        {tab === "saved" && (savedCount === 0 ? <Empty icon={Bookmark} title="Nothing saved yet" text="Tap the bookmark on any business, founder, investor or opportunity to keep it here." to="/founders" cta="Browse founders" /> : (
          <div className="space-y-8">
            {savedS.length > 0 && <Section title={`Saved Startups (${savedS.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{savedS.map((x) => x && <StartupCard key={x.slug} s={x} />)}</div></Section>}
            {savedF.length > 0 && <Section title={`Saved Founders (${savedF.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{savedF.map((f) => f && <FounderCard key={f.slug} f={f} />)}</div></Section>}
            {savedI.length > 0 && <Section title={`Saved Investors (${savedI.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{savedI.map((i) => i && <InvestorCard key={i.slug} i={i} />)}</div></Section>}
            {savedO.length > 0 && <Section title={`Saved Opportunities (${savedO.length})`}><div className="grid gap-4">{savedO.map((o) => o && <OpportunityCard key={o.slug} o={o} />)}</div></Section>}
            {savedB.length > 0 && <Section title={`Saved Businesses (${savedB.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{savedB.map((b) => <BusinessCard key={b.slug} b={b} />)}</div></Section>}
          </div>
        ))}

        {tab === "requests" && (
          <div className="space-y-6">
            <Section title={`Requests received${pendingReceived ? ` (${pendingReceived} pending)` : ""}`}>
              {s.received.length === 0 ? <p className="text-[12.5px] text-slate-500">Requests from other members will appear here once your profile is published.</p> : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {s.received.map((r) => (
                    <li key={r.id} className="card flex flex-col gap-3 p-4">
                      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[12px] font-bold text-white">{r.fromInitials}</span><div className="min-w-0 flex-1"><p className="text-[13.5px] font-bold text-navy-900">{r.fromTo ? <Link to={r.fromTo} className="hover:text-navy-600">{r.fromName}</Link> : r.fromName} <span className="font-normal text-slate-500">· {r.fromRole}</span></p><p className="mt-0.5 text-[12.5px] text-slate-600">{r.message}</p><p className="mt-1 text-[11px] text-slate-400">{timeAgo(r.at)}</p></div><Status s={r.status} /></div>
                      {r.status === "Pending" && <div className="flex gap-2"><button type="button" onClick={() => respondReceived(r.id, "Accepted")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-navy-800 py-2 text-[12px] font-semibold text-white hover:bg-navy-700"><Check className="h-3.5 w-3.5" /> Accept</button><button type="button" onClick={() => respondReceived(r.id, "Rejected")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-300 py-2 text-[12px] font-semibold text-navy-800 hover:bg-slate-50"><X className="h-3.5 w-3.5" /> Decline</button></div>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            {requestsCount === 0 && <Empty icon={Send} title="No requests sent yet" text="Connect with founders, request intros, or share your startup with investors." to="/investors" cta="Find investors" />}
            {s.connections.length > 0 && <Section title="Connection requests"><Table rows={s.connections.map((c) => [<Link key="a" to={`/founders/${c.founderSlug}`} className="font-semibold text-navy-900 hover:underline">{c.founderName}</Link>, `As ${c.relationship}`, timeAgo(c.at), <Status key="s" s={c.status} />])} head={["Founder", "Relationship", "Sent", "Status"]} /></Section>}
            {s.intros.length > 0 && <Section title="Introduction requests"><Table rows={s.intros.map((i) => [<Link key="a" to={`/${i.targetType}s/${i.targetSlug}`} className="font-semibold text-navy-900 hover:underline">{i.targetName}</Link>, `Via ${i.via}`, timeAgo(i.at), <Status key="s" s={i.status} />])} head={["To", "Via", "Sent", "Status"]} /></Section>}
            {s.interests.length > 0 && (
              <Section title="Investor pipeline">
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["Pending", "Accepted", "Rejected"] as const).map((col) => (
                    <div key={col} className="rounded-xl border border-line bg-slate-50/60 p-3"><p className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{col === "Pending" ? "Shared / reviewing" : col === "Accepted" ? "Interested" : "Passed"} ({s.interests.filter((i) => i.status === col).length})</p>
                      <ul className="mt-2 space-y-2">{s.interests.filter((i) => i.status === col).map((i) => { const inv = getInvestor(i.investorSlug); return <li key={i.id} className="rounded-lg border border-line bg-white p-3"><Link to={`/investors/${i.investorSlug}`} className="text-[13px] font-bold text-navy-900 hover:text-navy-600">{i.investorName}</Link><p className="text-[11.5px] text-slate-500">{i.startup} · {inv?.type}</p><p className="mt-1 text-[10.5px] text-slate-400">{timeAgo(i.at)}{i.pitch && " · deck attached"}{i.companyProfile && " · profile attached"}</p></li>; })}</ul>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === "applications" && (s.applications.length === 0 ? <Empty icon={FileText} title="No applications yet" text="Apply to funding, grants, hiring and partnership opportunities." to="/opportunities" cta="Explore opportunities" /> : (
          <Section title={`Applications (${s.applications.length})`}>
            <ul className="grid gap-3">
              {s.applications.map((a) => { const idx = appSteps.indexOf(a.status); return (
                <li key={a.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><Link to={`/opportunities/${a.opportunitySlug}`} className="text-[14px] font-bold text-navy-900 hover:text-navy-600">{a.opportunityTitle}</Link><p className="text-[12px] text-slate-500">{a.role}, {a.company} · {timeAgo(a.at)}{a.attachments.length > 0 && ` · ${a.attachments.map((x) => x.split(":")[0]).join(", ")}`}</p></div><Status s={a.status} /></div>
                  <ol className="mt-3 flex items-center gap-1">{appSteps.map((st, i) => { const done = a.status === "Rejected" ? i === 0 : i <= idx; return <li key={st} className="flex flex-1 items-center gap-1"><span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", done ? "bg-verified text-white" : "bg-slate-200 text-slate-500")}>{i + 1}</span><span className={cn("hidden text-[10.5px] sm:block", done ? "font-semibold text-emerald-800" : "text-slate-500")}>{st}</span>{i < appSteps.length - 1 && <span className={cn("h-0.5 flex-1", i < idx ? "bg-verified" : "bg-slate-200")} />}</li>; })}</ol>
                  {a.status === "Shortlisted" && <p className="mt-3 rounded-md bg-emerald-50 p-2.5 text-[12px] text-emerald-800"><span className="font-bold">Response:</span> Congratulations — you've been shortlisted. The poster will propose an interview/meeting slot shortly.</p>}
                </li>
              ); })}
            </ul>
          </Section>
        ))}
        {tab === "applications" && s.infoRequests.length > 0 && (
          <div className="mt-8"><Section title="Information requests & responses"><ul className="grid gap-3 md:grid-cols-2">{s.infoRequests.map((r) => <li key={r.id} className="card p-4"><div className="flex items-start justify-between gap-2"><Link to={`/opportunities/${r.opportunitySlug}`} className="text-[13px] font-bold text-navy-900 hover:text-navy-600">{r.opportunityTitle}</Link><Status s={r.status} /></div><p className="mt-1.5 text-[12.5px] text-slate-700">Q: {r.question}</p>{r.answer && <p className="mt-2 rounded-md bg-emerald-50 p-2.5 text-[12px] text-emerald-800">A: {r.answer}</p>}</li>)}</ul></Section></div>
        )}
        {tab === "meetings" && (s.meetings.length === 0 && s.startupMeetings.length === 0 && s.connections.filter((c) => c.status === "Accepted").length === 0 ? <Empty icon={CalendarCheck} title="No meetings yet" text="Request a meeting from any investor profile, or connect with founders to schedule calls." to="/investors" cta="Find investors" /> : (
          <div className="space-y-6">
            <Section title="Investor meetings"><ul className="grid gap-3 md:grid-cols-2">{s.meetings.map((m) => <li key={m.id} className="card p-4"><div className="flex items-start justify-between gap-2"><div><Link to={`/investors/${m.investorSlug}`} className="text-[14px] font-bold text-navy-900 hover:text-navy-600">{m.investorName}</Link><p className="text-[12px] text-slate-500">{m.startup} · {m.slot} IST</p></div><Status s={m.status} /></div><p className="mt-2 text-[12.5px] text-slate-700">{m.agenda}</p>{m.status === "Confirmed" && <div className="mt-3 flex gap-2"><button type="button" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Meeting with ${m.investorName} (WS Hub)\nDESCRIPTION:${m.agenda}\nEND:VEVENT\nEND:VCALENDAR`], { type: "text/calendar" })); a.download = "meeting.ics"; a.click(); }} className="btn-navy px-3 py-2">Add to calendar</button><button type="button" onClick={() => toast("Video link will be shared 15 minutes before the meeting", "info")} className="rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800">Join link</button></div>}</li>)}{s.meetings.length === 0 && <li className="text-[12.5px] text-slate-500">No investor meetings requested yet.</li>}</ul></Section>
            {s.startupMeetings.length > 0 && <Section title="Startup meetings & demos"><ul className="grid gap-3 md:grid-cols-2">{s.startupMeetings.map((m) => <li key={m.id} className="card p-4"><div className="flex items-start justify-between gap-2"><div><Link to={`/startups/${m.startupSlug}`} className="text-[14px] font-bold text-navy-900 hover:text-navy-600">{m.startupName}</Link><p className="text-[12px] text-slate-500">{m.kind} · {m.date} · {m.slot} · {m.mode}</p></div><Status s={m.status} /></div>{m.status === "Confirmed" && <button type="button" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${m.kind} with ${m.startupName} (WS Hub)\nEND:VEVENT\nEND:VCALENDAR`], { type: "text/calendar" })); a.download = "meeting.ics"; a.click(); }} className="btn-navy mt-3 px-3 py-2">Add to calendar</button>}</li>)}</ul></Section>}
            {s.connections.filter((c) => c.status === "Accepted").length > 0 && <Section title="Suggested next step"><p className="text-[12.5px] text-slate-600">You're connected with {s.connections.filter((c) => c.status === "Accepted").map((c) => c.founderName).join(", ")}. Propose a call from <Link to="/dashboard?tab=messages" className="font-semibold text-navy-700">Messages</Link>, or meet in person at the <Link to="/events/warangal-startup-meetup" className="font-semibold text-navy-700">Warangal Startup Meetup</Link>.</p></Section>}
          </div>
        ))}
        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{([["views", "Profile views"], ["clicks", "Card clicks"], ["saves", "Saves"], ["requests", "Requests"], ["shares", "Shares"], ["applications", "Applications"]] as const).map(([k, l]) => <div key={k} className="card p-4"><p className="text-[24px] font-black text-navy-900">{s.analytics[k]}</p><p className="text-[11.5px] text-slate-500">{l}</p></div>)}</div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card p-5"><h3 className="text-[14px] font-bold text-navy-900">Engagement funnel (this session)</h3><ul className="mt-3 space-y-2">{([["views", "Viewed"], ["clicks", "Clicked"], ["saves", "Saved"], ["requests", "Requested"], ["applications", "Applied"]] as const).map(([k, l]) => { const max = Math.max(1, s.analytics.views); return <li key={k}><div className="flex justify-between text-[12px]"><span className="text-slate-600">{l}</span><span className="font-semibold text-navy-900">{s.analytics[k]}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${Math.min(100, (s.analytics[k] / max) * 100)}%` }} /></div></li>; })}</ul></div>
              <div className="card p-5"><h3 className="text-[14px] font-bold text-navy-900">Your profile</h3><ul className="mt-3 space-y-2 text-[12.5px]"><li className="flex justify-between border-b border-dashed border-line pb-2"><span className="text-slate-600">Profile views (30d)</span><span className="font-semibold text-navy-900">{s.profileViews}</span></li><li className="flex justify-between border-b border-dashed border-line pb-2"><span className="text-slate-600">Investor views</span><span className="font-semibold text-navy-900">{s.notifications.filter((n) => n.title.includes("Investor viewed")).length + 3}</span></li><li className="flex justify-between border-b border-dashed border-line pb-2"><span className="text-slate-600">Connections</span><span className="font-semibold text-navy-900">{s.connections.filter((c) => c.status === "Accepted").length + s.received.filter((r) => r.status === "Accepted").length}</span></li><li className="flex justify-between"><span className="text-slate-600">Search appearances</span><span className="font-semibold text-navy-900">{s.profileViews * 3}</span></li></ul><p className="mt-3 text-[11.5px] text-slate-500">Upgrade to <Link to="/membership/premium" className="font-semibold text-navy-700">Premium</Link> for advanced analytics and exports.</p></div>
            </div>
          </div>
        )}

        {tab === "startup" && <DashboardStartup />}
        {tab === "events" && <DashboardEvents />}
        {tab === "stories" && <DashboardStories />}
        {tab === "membership" && <DashboardMembership />}
        {tab === "messages" && s.startupContacts.length > 0 && <div className="mb-6"><Section title="Founder conversations"><ul className="grid gap-3">{s.startupContacts.map((c) => <li key={c.id} className="card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-[12px] font-black text-navy-900">{c.startupName.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><Link to={`/startups/${c.startupSlug}`} className="text-[13.5px] font-bold text-navy-900 hover:text-navy-600">{c.startupName}</Link><p className="truncate text-[12px] text-slate-500">{c.purpose}: {c.message}</p>{c.status === "Replied" && <p className="mt-1 rounded-md bg-emerald-50 px-2 py-1 text-[11.5px] text-emerald-800">Founder: Thanks for reaching out — happy to talk. Book a slot from our profile.</p>}</div><Status s={c.status} /></li>)}</ul></Section></div>}
        {tab === "messages" && (connections.length === 0 && s.startupContacts.length === 0 ? <Empty icon={MessageCircle} title="No conversations yet" text="Messaging unlocks once a founder accepts your connection request." to="/founders" cta="Connect with founders" /> : (
          <div className="grid gap-3">
            {connections.map((c) => (
              <div key={c.id} className="card flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-[12px] font-bold text-white">{c.founderName.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                <div className="min-w-0 flex-1"><p className="text-[13.5px] font-bold text-navy-900">{c.founderName}</p><p className="truncate text-[12px] text-slate-500">You: {c.message}</p></div>
                <button type="button" onClick={() => toast("Real-time messaging arrives with the Collaboration milestone", "info")} className="btn-navy px-3 py-2">Open</button>
              </div>
            ))}
          </div>
        ))}

        {tab === "notifications" && (
          <div>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-bold text-navy-900">Notifications</h2>{unread > 0 && <button type="button" onClick={markAllRead} className="text-[12px] font-semibold text-navy-700 hover:underline">Mark all as read</button>}</div>
            {s.notifications.length === 0 ? <Empty icon={Bell} title="You're all caught up" text="We'll alert you when a founder accepts, an investor views your pitch, or an application moves forward." to="/opportunities" cta="Explore opportunities" /> : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                {s.notifications.map((n) => (
                  <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-navy-50/50")}>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold-500")} />
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-navy-900">{n.title}</p><p className="text-[12.5px] text-slate-600">{n.body}</p><p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.at)}</p></div>
                    {n.to && <Link to={n.to} onClick={() => markRead(n.id)} className="text-[12px] font-semibold text-navy-700 hover:underline">View</Link>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "post" && (
          <div className="mx-auto max-w-xl rounded-xl border border-line bg-white p-6 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-gold-500" />
            <h2 className="mt-3 text-[18px] font-bold text-navy-900">Post an opportunity</h2>
            <p className="mt-1 text-[13px] text-slate-600">Funding, partnership, hiring, tender or collaboration — posting opens with the Collaboration milestone. Meanwhile our team can post on your behalf.</p>
            <button type="button" onClick={() => toast("Request sent — WS Hub team will contact you within 1 business day", "success")} className="mt-4 rounded-md bg-gold-500 px-5 py-2.5 text-[13px] font-bold text-navy-900 hover:bg-gold-400"><Handshake className="mr-1.5 inline h-4 w-4" /> Ask WS Hub team to post</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-[15px] font-bold text-navy-900">{title}</h2>{children}</section>;
}
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-left text-[12.5px]">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-4 py-3 text-slate-700">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
