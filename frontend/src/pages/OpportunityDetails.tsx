import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, CalendarDays, CheckCircle2, ChevronDown, Clock, Download, Eye, FileText, Mail, MapPin, Target, Users, Wallet } from "lucide-react";
import { daysLeft, fmtDate, getOpportunity, posterLink, relatedOpportunities, typeColor } from "../opportunities";
import { founders, getFounder } from "../founders";
import { ProfileShell, Avatar, KV, LockedNote, SideCard } from "../components/ProfileShell";
import { ApplyBtn, ReportBtn, RequestInfoBtn, SaveBtn, ShareBtn, useTrackView } from "../components/ui/Actions";
import { getBusiness } from "../businesses";
import { getInvestor } from "../investors";
import { opportunities } from "../opportunities";
import { OpportunityCard } from "./Opportunities";
import { applicationFor, toast, useStore } from "../store";
import { cn } from "../utils/cn";

const statusSteps = ["Applied", "Shortlisted", "Meeting", "Accepted", "Completed"];

export default function OpportunityDetails() {
  const { slug = "" } = useParams();
  const o = getOpportunity(slug);
  const user = useStore((s) => s.user);
  const app = useStore((s) => applicationFor(s, slug));
  const infoReqs = useStore((s) => s.infoRequests.filter((r) => r.opportunitySlug === slug));
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  useTrackView(`opportunity:${slug}`);
  useEffect(() => {
    if (o) document.title = `${o.title} — Opportunities — WS Hub`;
  }, [o]);
  if (!o) return <Navigate to="/opportunities" replace />;

  const d = daysLeft(o.deadline);
  const closed = d < 0 || o.status === "Closed";
  const link = posterLink(o.postedBy);
  const founder = o.postedBy.founderSlug ? getFounder(o.postedBy.founderSlug) : undefined;
  const company = o.postedBy.slug ? getBusiness(o.postedBy.slug) : undefined;
  const investorPoster = o.postedBy.slug ? getInvestor(o.postedBy.slug) : undefined;
  const morePosted = opportunities.filter((x) => x.slug !== o.slug && x.postedBy.name === o.postedBy.name);
  const contact = () => {
    if (!user) return toast("Sign in to contact the poster", "info", "/login");
    window.location.href = `mailto:${o.contact.email}?subject=${encodeURIComponent(`WS Hub: ${o.title}`)}`;
  };

  return (
    <ProfileShell
      cover="/images/cta-bg.jpg"
      crumbs={[{ label: "Home", to: "/" }, { label: "Opportunities", to: "/opportunities" }, { label: o.title }]}
      avatar={<span className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-center text-[13px] font-black leading-tight ring-4 ring-white shadow-md sm:h-28 sm:w-28", typeColor[o.type])}>{o.type}</span>}
      title={o.title}
      verified={o.verified}
      subtitle={<>Posted by {link ? <Link to={link} className="text-navy-700 hover:underline">{o.postedBy.name}</Link> : o.postedBy.name} <span className="text-slate-400">· {o.postedBy.type}</span></>}
      meta={
        <>
          <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> {o.budget}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {o.location}</span>
          <span className={cn("inline-flex items-center gap-1", d >= 0 && d <= 7 && "font-semibold text-red-600")}><CalendarDays className="h-3.5 w-3.5" /> {closed ? "Closed" : `Deadline ${fmtDate(o.deadline)} (${d} days left)`}</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {o.views.toLocaleString("en-IN")} views</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {o.applicants} applicants</span>
        </>
      }
      badges={
        <>
          <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", closed ? "bg-slate-200 text-slate-600" : o.status === "Closing Soon" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800")}>{closed ? "Closed" : o.status}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">{o.industry}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">Urgency: {o.urgency}</span>
        </>
      }
      actions={
        <>
          <ApplyBtn slug={o.slug} title={o.title} closed={closed} similarTo={`/opportunities?type=${encodeURIComponent(o.type)}`} />
          <RequestInfoBtn slug={o.slug} title={o.title} />
          <button type="button" onClick={contact} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><Mail className="h-4 w-4" /> Contact</button>
          <SaveBtn type="opportunity" slug={o.slug} label className="h-auto rounded-md py-2.5" />
        </>
      }
      topRight={<><ShareBtn title={o.title} path={`/opportunities/${o.slug}`} /><SaveBtn type="opportunity" slug={o.slug} /></>}
      tabs={[
        {
          id: "overview",
          label: "Overview",
          content: (
            <div className="space-y-4">
              <p className="text-[14px] leading-relaxed text-slate-700">{o.description}</p>
              {(o.goals || o.deliverables) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {o.goals && <div className="rounded-lg border border-line bg-navy-50/60 p-4"><p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-navy-700"><Target className="h-4 w-4" /> Goals</p><ul className="mt-2 space-y-1.5">{o.goals.map((g) => <li key={g} className="flex items-start gap-2 text-[13px] text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-600" /> {g}</li>)}</ul></div>}
                  {o.deliverables && <div className="rounded-lg border border-line bg-gold-100/40 p-4"><p className="text-[12px] font-bold uppercase tracking-wide text-gold-800">Deliverables</p><ul className="mt-2 space-y-1.5">{o.deliverables.map((g) => <li key={g} className="flex items-start gap-2 text-[13px] text-slate-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-800" /> {g}</li>)}</ul></div>}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Budget", o.budget], ["Timeline", `${fmtDate(o.timeline[0].date)} → ${fmtDate(o.timeline[o.timeline.length - 1].date)}`], ["Location", o.location], ["Status", closed ? "Closed" : o.status]].map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">{k}</dt><dd className="text-[12.5px] font-semibold text-navy-900">{v}</dd></div>)}</dl>
              <div className="flex flex-wrap gap-1.5">{o.tags.map((t) => <Link key={t} to={`/opportunities?q=${encodeURIComponent(t)}`} className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-navy-800 hover:text-white">{t}</Link>)}</div>
              <div className="rounded-lg border border-line p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Posted by</p>
                <div className="mt-2 flex items-center gap-3">
                  {founder ? <Avatar initials={founder.initials} color={founder.color} size="md" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Building2 className="h-6 w-6" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[14px] font-bold text-navy-900">{o.postedBy.name} {o.verified && <BadgeCheck className="h-4 w-4 text-verified" />}</p>
                    <p className="text-[12px] text-slate-500">{o.postedBy.type}{founder && ` · ${founder.name}, ${founder.role}`}</p>
                  </div>
                  {link && <Link to={link} className="view-all">View profile <ArrowRight className="h-3.5 w-3.5" /></Link>}
                </div>
              </div>
            </div>
          ),
        },
        { id: "requirements", label: "Requirements", content: <ul className="space-y-2">{o.requirements.map((r) => <li key={r} className="flex items-start gap-2 text-[13px] text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" /> {r}</li>)}</ul> },
        { id: "eligibility", label: "Eligibility", content: <ul className="space-y-2">{o.eligibility.map((r) => <li key={r} className="flex items-start gap-2 text-[13px] text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" /> {r}</li>)}</ul> },
        {
          id: "timeline",
          label: "Timeline",
          content: (
            <ol className="relative ml-3 border-l-2 border-navy-100 pl-6">
              {o.timeline.map((t) => {
                const past = new Date(t.date).getTime() < Date.now();
                return (
                  <li key={t.label} className="relative pb-5 last:pb-0">
                    <span className={cn("absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full ring-4 ring-white", past ? "bg-verified" : "bg-gold-500")} />
                    <p className="text-[12px] font-bold text-gold-800">{fmtDate(t.date)}</p>
                    <p className="text-[13.5px] font-semibold text-navy-900">{t.label}</p>
                  </li>
                );
              })}
            </ol>
          ),
        },
        {
          id: "documents",
          label: "Documents",
          content: (
            <ul className="grid gap-2 sm:grid-cols-2">
              {o.documents.map((doc) => (
                <li key={doc.name}>
                  <button type="button" onClick={() => toast(`Downloading ${doc.name}`, "info")} className="flex w-full items-center gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:border-navy-700 hover:bg-navy-50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-50 text-navy-700"><FileText className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-navy-900">{doc.name}</span><span className="text-[11px] text-slate-500">{doc.size}</span></span>
                    <Download className="h-4 w-4 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "applicants",
          label: "Applicants",
          subtitle: `${o.applicants} applications so far`,
          content: user ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[["Applied", o.applicants], ["Shortlisted", Math.round(o.applicants * 0.2)], ["In meetings", Math.round(o.applicants * 0.05)]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-[22px] font-black text-navy-900">{v}</p><p className="text-[11px] text-slate-500">{k}</p></div>
                ))}
              </div>
              {app ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[13px] font-bold text-emerald-800">Your application · {app.status}</p>
                  <ol className="mt-3 flex items-center gap-1">
                    {statusSteps.map((s, i) => {
                      const idx = statusSteps.indexOf(app.status);
                      const done = i <= idx;
                      return (
                        <li key={s} className="flex flex-1 items-center gap-1">
                          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", done ? "bg-verified text-white" : "bg-slate-200 text-slate-500")}>{i + 1}</span>
                          <span className={cn("hidden text-[10.5px] sm:block", done ? "font-semibold text-emerald-800" : "text-slate-500")}>{s}</span>
                          {i < statusSteps.length - 1 && <span className={cn("h-0.5 flex-1", i < idx ? "bg-verified" : "bg-slate-200")} />}
                        </li>
                      );
                    })}
                  </ol>
                  <Link to="/dashboard?tab=applications" className="view-all mt-3">Track in dashboard <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : <p className="text-[12.5px] text-slate-500">You haven't applied yet. Applicant identities are visible only to the poster.</p>}
            </div>
          ) : <LockedNote text="Applicant stats and your application status are visible to members." />,
        },
        {
          id: "faq",
          label: "FAQ",
          content: o.faq.length ? (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {o.faq.map((f, i) => (
                <li key={f.q}>
                  <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] font-semibold text-navy-900">{f.q}<ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", faqOpen === i && "rotate-180")} /></button>
                  <div className={cn("grid transition-all duration-300", faqOpen === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}><p className="overflow-hidden px-4 text-[12.5px] text-slate-600"><span className="block pb-3">{f.a}</span></p></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12.5px] text-slate-500">No FAQs yet. Use Request Information to ask the poster a question.</p>,
        },
        {
          id: "questions",
          label: "Your Questions",
          subtitle: "Information requests you've sent",
          content: infoReqs.length ? (
            <ul className="space-y-3">{infoReqs.map((r) => <li key={r.id} className="rounded-lg border border-line p-4"><p className="text-[13px] font-semibold text-navy-900">Q: {r.question}</p>{r.answer ? <p className="mt-2 rounded-md bg-emerald-50 p-3 text-[12.5px] text-emerald-800"><span className="font-bold">A:</span> {r.answer}</p> : <p className="mt-1 text-[12px] text-slate-500">Awaiting reply · typically within 2 business days</p>}</li>)}</ul>
          ) : <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 p-4"><p className="text-[12.5px] text-slate-600">Have a question about eligibility, budget or timelines?</p><RequestInfoBtn slug={o.slug} title={o.title} /></div>,
        },
        {
          id: "company",
          label: "Company",
          subtitle: `About ${o.postedBy.name}`,
          content: (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-lg border border-line p-4 sm:flex-row sm:items-center">
                {company ? <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[15px] font-black ring-4 ring-white shadow" style={{ background: company.logo.bg, color: company.logo.fg }}>{company.logo.initials}</span> : founder ? <Avatar initials={founder.initials} color={founder.color} size="lg" /> : investorPoster ? <Avatar initials={investorPoster.initials} color={investorPoster.color} size="lg" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Building2 className="h-7 w-7" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[16px] font-bold text-navy-900">{o.postedBy.name} {o.verified && <BadgeCheck className="h-4 w-4 text-verified" />}</p>
                  <p className="text-[12.5px] text-slate-600">{company ? `${company.industry} · ${company.location} · Est. ${company.established} · ${company.employees} employees` : founder ? `${founder.role} · ${founder.industry} · ${founder.stage}` : investorPoster ? `${investorPoster.type} · ${investorPoster.location}` : o.postedBy.type}</p>
                  <p className="mt-1.5 text-[13px] text-slate-700">{company?.description ?? founder?.about ?? investorPoster?.about ?? "Verified ecosystem partner posting on WS Hub."}</p>
                </div>
                {link && <Link to={link} className="btn-navy shrink-0 px-4 py-2.5">View full profile <ArrowRight className="h-3.5 w-3.5" /></Link>}
              </div>
              {founder && company === undefined && founder.businessSlug && <Link to={`/businesses/${founder.businessSlug}`} className="view-all">Startup profile: {founder.company} <ArrowRight className="h-3.5 w-3.5" /></Link>}
              {company && (() => { const cf = founders.find((f) => f.businessSlug === company.slug); return cf ? <Link to={`/founders/${cf.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50"><Avatar initials={cf.initials} color={cf.color} size="sm" /><span><span className="block text-[11px] text-slate-500">Founder</span><span className="text-[13px] font-bold text-navy-900">{cf.name}</span></span><ArrowRight className="h-4 w-4 text-navy-600" /></Link> : null; })()}
              {morePosted.length > 0 && <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">More from {o.postedBy.name}</p><ul className="space-y-2">{morePosted.map((m) => <li key={m.slug}><Link to={`/opportunities/${m.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50"><span><span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", typeColor[m.type])}>{m.type}</span><span className="mt-1 block text-[13px] font-semibold text-navy-900">{m.title}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-navy-600" /></Link></li>)}</ul></div>}
            </div>
          ),
        },
      ]}
      sidebar={
        <>
          <SideCard title="Summary">
            <KV rows={[["Type", o.type], ["Budget", o.budget], ["Location", o.location], ["Deadline", fmtDate(o.deadline)], ["Posted", fmtDate(o.postedAt)], ["Stage", o.stage.join(", ")]]} />
            <div className="mt-3 flex items-center justify-between"><ReportBtn targetType="opportunity" targetSlug={o.slug} /><span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" /> Updated 2d ago</span></div>
          </SideCard>
          <SideCard title="Contact">
            {user ? <p className="text-[12.5px] text-slate-700">{o.contact.name}<br /><a href={`mailto:${o.contact.email}`} className="text-navy-700 hover:underline">{o.contact.email}</a></p> : <LockedNote text="Contact details are visible to members." />}
          </SideCard>
          {!closed && (
            <SideCard className="bg-navy-900 text-white">
              <h3 className="text-[15px] font-bold">Ready to apply?</h3>
              <p className="mt-1 text-[12px] text-white/75">Takes about 3 minutes. Attach a deck or proposal to stand out.</p>
              <div className="mt-4"><ApplyBtn slug={o.slug} title={o.title} className="w-full" /></div>
            </SideCard>
          )}
        </>
      }
      stickyActions={<><ApplyBtn slug={o.slug} title={o.title} closed={closed} similarTo={`/opportunities?type=${encodeURIComponent(o.type)}`} /><RequestInfoBtn slug={o.slug} title={o.title} /></>}
      related={{ title: "Similar Opportunities", subtitle: `More in ${o.type} and ${o.industry}`, to: `/opportunities?type=${encodeURIComponent(o.type)}`, children: <div className="grid gap-4">{relatedOpportunities(o).map((r) => <OpportunityCard key={r.slug} o={r} />)}</div> }}
    />
  );
}
