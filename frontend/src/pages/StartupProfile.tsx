import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, Building2, CalendarDays, CheckCircle2, ExternalLink, Eye, Globe, Landmark, Lightbulb, MapPin, Star, Target, TrendingUp } from "lucide-react";
import { fmtFunding, fmtStartupDate, getStartup, relatedStartups } from "../startups";
import { getFounder } from "../founders";
import { getInvestor } from "../investors";
import { getOpportunity, typeColor } from "../opportunities";
import { events, isPast } from "../events";
import { stories } from "../stories";
import { ProfileShell, Avatar, KV, SideCard, Tag, Timeline } from "../components/ProfileShell";
import { IntroBtn, ReportBtn, SaveBtn, useTrackView } from "../components/ui/Actions";
import { BookMeetingBtn, ContactFounderBtn, DocRow, FollowStartupBtn, InvestorInterestBtn, StartupShareBtn } from "../components/ui/StartupActions";
import { StartupCard } from "./Startups";
import { EventCard } from "./Events";
import { StoryCard } from "./Stories";
import { toggleCompareStartup, useStore } from "../store";
import { cn } from "../utils/cn";

function Bars({ data }: { data: number[] }) {
  const max = Math.max(...data, 0.1);
  return (
    <div className="flex h-36 items-end gap-1.5 rounded-lg bg-slate-50 p-3" role="img" aria-label="Monthly revenue trend">
      {data.map((v, i) => <div key={i} className="group relative flex flex-1 flex-col items-center justify-end"><span className="absolute -top-5 hidden rounded bg-navy-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">{v}</span><div className="w-full rounded-t bg-gradient-to-t from-navy-800 to-navy-600 transition-all duration-700 hover:from-gold-500 hover:to-gold-400" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} /></div>)}
    </div>
  );
}
function Donut({ items }: { items: { label: string; pct: number }[] }) {
  const colors = ["#0f2a5c", "#e2b04a", "#14a37f", "#7c3aed", "#94a3b8"];
  let acc = 0;
  const stops = items.map((it, i) => { const s = acc; acc += it.pct; return `${colors[i % colors.length]} ${s}% ${acc}%`; }).join(", ");
  return (
    <div className="flex items-center gap-4"><div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}><div className="absolute inset-3 rounded-full bg-white" /></div><ul className="space-y-1.5 text-[12px]">{items.map((it, i) => <li key={it.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} /><span className="text-slate-600">{it.label}</span><span className="font-bold text-navy-900">{it.pct}%</span></li>)}</ul></div>
  );
}

export default function StartupProfile() {
  const { slug = "" } = useParams();
  const s = getStartup(slug);
  const user = useStore((x) => x.user);
  const inCompare = useStore((x) => x.compareStartups.includes(slug));
  useTrackView(`startup:${slug}`);
  useEffect(() => { if (s) document.title = `${s.name} — Startups — WS Hub`; }, [s]);
  if (!s) return <Navigate to="/startups" replace />;

  const founder = getFounder(s.founderSlug);
  const investors = s.funding.investorSlugs.map(getInvestor).filter(Boolean);
  const upcoming = events.filter((e) => !isPast(e) && e.speakers.some((sp) => sp.founderSlug === s.founderSlug));
  const past = events.filter((e) => isPast(e) && e.speakers.some((sp) => sp.founderSlug === s.founderSlug));
  const sStories = stories.filter((st) => st.links.founder === s.founderSlug || st.links.business === s.businessSlug || st.author.founderSlug === s.founderSlug);
  const rating = s.reviews.length ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length : 0;

  return (
    <ProfileShell
      cover={s.cover}
      crumbs={[{ label: "Home", to: "/" }, { label: "Startups", to: "/startups" }, { label: s.name }]}
      avatar={<span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-[22px] font-black ring-4 ring-white shadow-md sm:h-28 sm:w-28 sm:text-[26px]" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span>}
      title={s.name}
      verified={s.verified}
      subtitle={<>{s.tagline} — {s.description}</>}
      meta={<>
        <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {s.industry}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.location} · Est. {s.founded}</span>
        <a href={`https://${s.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-navy-700 hover:underline"><Globe className="h-3.5 w-3.5" /> {s.website}</a>
        <a href={`https://${s.social.linkedin}`} target="_blank" rel="noreferrer" className="hover:text-navy-800">LinkedIn</a><span>{s.social.twitter}</span><span>{s.social.instagram}</span>
        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {s.views.toLocaleString("en-IN")} views</span>
      </>}
      badges={<>
        <span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10.5px] font-semibold text-gold-800">{s.stage}</span>
        {s.businessModel.map((m) => <span key={m} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">{m}</span>)}
        {s.womenFounded && <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[10.5px] font-semibold text-pink-800">Women-founded</span>}
        <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", s.funding.status === "Raising" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}>{s.funding.status === "Raising" ? `Raising ${s.funding.seeking}` : s.funding.status}</span>
      </>}
      actions={<>
        <ContactFounderBtn s={s} />
        <InvestorInterestBtn s={s} />
        <IntroBtn targetType="founder" targetSlug={s.founderSlug} targetName={founder?.name ?? s.name} />
        <BookMeetingBtn s={s} />
        <FollowStartupBtn s={s} />
        <button type="button" onClick={() => toggleCompareStartup(s.slug)} className={cn("inline-flex items-center gap-1.5 rounded-md border px-4 py-2.5 text-[12.5px] font-semibold", inCompare ? "border-gold-500 bg-gold-100 text-gold-800" : "border-slate-300 text-navy-800 hover:bg-navy-50")}>{inCompare ? "In compare" : "Compare"}</button>
      </>}
      topRight={<><StartupShareBtn s={s} /><SaveBtn type="startup" slug={s.slug} /></>}
      stickyActions={<><ContactFounderBtn s={s} /><InvestorInterestBtn s={s} /></>}
      tabs={[
        { id: "overview", label: "Overview", content: (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-navy-50/60 p-4"><p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-navy-700"><Target className="h-4 w-4" /> Mission</p><p className="mt-2 text-[13px] text-slate-700">{s.overview.mission}</p></div>
              <div className="rounded-lg border border-line bg-gold-100/50 p-4"><p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-gold-800"><Eye className="h-4 w-4" /> Vision</p><p className="mt-2 text-[13px] text-slate-700">{s.overview.vision}</p></div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">{[["Problem", s.overview.problem], ["Solution", s.overview.solution], ["Target audience", s.overview.audience], ["USP", s.overview.usp], ["Business model", s.overview.model], ["Market size", s.overview.market]].map(([k, v]) => <div key={k} className="rounded-lg border border-line p-4"><dt className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-500"><Lightbulb className="h-3.5 w-3.5" /> {k}</dt><dd className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{v}</dd></div>)}</dl>
            <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Technologies</p><div className="flex flex-wrap gap-1.5">{s.technologies.map((t) => <Tag key={t} to={`/startups?tech=${encodeURIComponent(t)}`}>{t}</Tag>)}</div></div>
          </div>
        ) },
        { id: "products", label: "Products", content: (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{s.products.map((p) => <article key={p.name} className="card group flex flex-col overflow-hidden"><div className="aspect-[4/3] overflow-hidden"><img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div><div className="flex flex-1 flex-col p-3.5"><div className="flex items-start justify-between gap-2"><h3 className="text-[13.5px] font-bold text-navy-900">{p.name}</h3><span className="shrink-0 rounded-md bg-gold-100 px-2 py-0.5 text-[10.5px] font-bold text-gold-800">{p.price}</span></div><p className="mt-1.5 flex-1 text-[12px] text-slate-600">{p.description}</p><div className="mt-3 grid grid-cols-2 gap-2">{p.demo ? <BookMeetingBtn s={s} kind="Demo" size="sm" /> : <ContactFounderBtn s={s} size="sm" className="!bg-white !text-navy-800 border border-slate-300" />}<a href={`https://${s.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-md bg-navy-800 px-3 py-2 text-[11.5px] font-semibold text-white hover:bg-navy-700">Demo <ExternalLink className="h-3 w-3" /></a></div></div></article>)}</div>
        ) },
        { id: "team", label: "Team", subtitle: `${s.teamSize} people`, content: (
          <div className="space-y-4">
            {founder && <Link to={`/founders/${founder.slug}`} className="flex items-center gap-4 rounded-xl border border-gold-300 bg-gold-100/40 p-4 transition-colors hover:bg-gold-100"><Avatar initials={founder.initials} color={founder.color} size="lg" /><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wide text-gold-800">Founder</p><p className="text-[16px] font-bold text-navy-900">{founder.name}</p><p className="text-[12px] text-slate-600">{founder.role} · {founder.experience} yrs experience · {founder.education[0]?.school}</p><p className="mt-1 text-[12.5px] text-slate-700">{founder.bio}</p></div><ArrowRight className="h-5 w-5 shrink-0 text-navy-600" /></Link>}
            {s.coFounders.length > 0 && <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Co-founders</p><ul className="grid gap-3 sm:grid-cols-2">{s.coFounders.map((c) => <li key={c.name} className="flex items-center gap-3 rounded-lg border border-line p-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-800 text-[12px] font-black text-white">{c.initials}</span><div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-navy-900">{c.name}</p><p className="text-[11.5px] text-slate-500">{c.role} · {c.experience}</p></div><a href={`https://${c.linkedin}`} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold text-navy-700 hover:underline">LinkedIn</a></li>)}</ul></div>}
            <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Core team</p><ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{s.core.map((c) => <li key={c.name} className={cn("flex items-center gap-3 rounded-lg border p-3", c.initials === "?" ? "border-dashed border-gold-400 bg-gold-100/40" : "border-line")}><span className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: c.initials === "?" ? "#e2b04a" : "#163a78" }}>{c.initials}</span><div><p className="text-[13px] font-bold text-navy-900">{c.name}</p><p className="text-[11.5px] text-slate-500">{c.role}</p></div></li>)}</ul></div>
          </div>
        ) },
        { id: "traction", label: "Traction", content: (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Users", s.traction.users], ["Customers", s.traction.customers], ["Revenue", s.traction.revenue], ["Growth", s.traction.growth]].map(([k, v]) => <div key={k} className="rounded-xl bg-navy-900 p-4 text-white"><p className="text-[11px] text-white/70">{k}</p><p className="mt-1 text-[16px] font-black text-gold-400">{v}</p></div>)}</div>
            <div><p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-navy-900"><TrendingUp className="h-4 w-4" /> Monthly metrics (last {s.traction.monthly.length} months)</p><Bars data={s.traction.monthly} /></div>
            <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Milestones</p><Timeline items={s.traction.milestones.map((m) => ({ year: fmtStartupDate(m.date + "-01"), title: m.title, type: "Milestone", description: "" }))} /></div>
          </div>
        ) },
        { id: "funding", label: "Funding", content: (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-4"><p className="text-[11px] text-slate-500">Funding status</p><p className="text-[15px] font-black text-navy-900">{s.funding.status}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-[11px] text-slate-500">Amount raised</p><p className="text-[15px] font-black text-navy-900">{fmtFunding(s.fundingRaised)}</p></div><div className={cn("rounded-lg p-4", s.funding.seeking ? "bg-emerald-50" : "bg-slate-50")}><p className="text-[11px] text-slate-500">Seeking investment</p><p className="text-[15px] font-black text-navy-900">{s.funding.seeking ?? "Not currently"}</p></div></div>
            {s.funding.seeking && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-300 bg-gold-100/40 p-4"><div><p className="text-[13.5px] font-bold text-navy-900">Interested in investing?</p><p className="text-[12px] text-slate-600">Express interest and the founder sees your profile; book a meeting to move to diligence.</p></div><div className="flex gap-2"><InvestorInterestBtn s={s} /><BookMeetingBtn s={s} /></div></div>}
            <div className="grid gap-5 md:grid-cols-2"><div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Use of funds</p><Donut items={s.funding.useOfFunds} /></div><div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Cap table summary</p><Donut items={s.funding.capTable} /></div></div>
            {investors.length > 0 && <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Investors</p><div className="flex flex-wrap gap-2">{investors.map((i) => i && <Link key={i.slug} to={`/investors/${i.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-navy-900 hover:border-navy-700 hover:bg-navy-50"><Avatar initials={i.initials} color={i.color} size="sm" /> {i.name} <span className="text-[10.5px] font-normal text-slate-500">· {i.type}</span></Link>)}</div></div>}
            <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Funding timeline</p>{s.funding.timeline.length ? <Timeline items={s.funding.timeline.map((t) => ({ year: fmtStartupDate(t.date + "-01"), title: `${t.round} · ${t.amount}`, type: t.round, description: `Led by ${t.lead}` }))} /> : <p className="text-[12.5px] text-slate-500">No rounds yet — bootstrapped.</p>}</div>
          </div>
        ) },
        { id: "gallery", label: "Gallery", content: <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{s.gallery.map((g, i) => <img key={i} src={g} alt="" loading="lazy" className={cn("aspect-[4/3] w-full rounded-lg object-cover", i === 0 && "col-span-2 row-span-2")} />)}</div> },
        { id: "documents", label: "Documents", subtitle: "Preview any document; restricted files need founder approval", content: <ul className="space-y-2">{s.documents.map((d) => <DocRow key={d.name} s={s} d={d} />)}</ul> },
        { id: "achievements", label: "Achievements", subtitle: "Awards, expansion, media, patents, partnerships", content: <Timeline items={s.achievements} /> },
        { id: "jobs", label: "Jobs", subtitle: `${s.jobs.length} open roles`, content: (
          <ul className="space-y-2">{s.jobs.map((j) => { const o = j.opportunitySlug ? getOpportunity(j.opportunitySlug) : undefined; return <li key={j.title} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3.5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-50 text-navy-700"><Briefcase className="h-4 w-4" /></span><div><p className="text-[13.5px] font-bold text-navy-900">{j.title}</p><p className="text-[11.5px] text-slate-500">{j.type} · {j.location}{o && <> · <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", typeColor[o.type])}>{o.type}</span></>}</p></div></div>{o ? <Link to={`/opportunities/${o.slug}`} className="btn-navy px-4 py-2">View & Apply <ArrowRight className="h-3.5 w-3.5" /></Link> : <ContactFounderBtn s={s} size="sm" />}</li>; })}{s.jobs.length === 0 && <li className="text-[12.5px] text-slate-500">No open roles. Follow the startup to be notified.</li>}</ul>
        ) },
        { id: "reviews", label: "Reviews", content: s.reviews.length ? (
          <div className="grid gap-4 md:grid-cols-[160px_1fr]"><div className="rounded-lg bg-navy-50/70 p-4 text-center"><p className="text-[40px] font-black text-navy-900">{rating.toFixed(1)}</p><div className="flex justify-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < Math.round(rating) ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}</div><p className="mt-1 text-[11px] text-slate-500">{s.reviews.length} reviews</p><button type="button" onClick={() => document.getElementById("contact-cta")?.scrollIntoView({ behavior: "smooth" })} className="btn-navy mt-3 w-full py-2">Recommend</button></div><ul className="space-y-3">{s.reviews.map((r) => <li key={r.name} className="rounded-lg border border-line p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-bold text-navy-900">{r.name}</p><p className="text-[11px] text-slate-500">{r.role}</p></div><span className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}</span></div><p className="mt-2 text-[13px] text-slate-700">{r.text}</p></li>)}</ul></div>
        ) : <p className="text-[12.5px] text-slate-500">No reviews yet. Worked with {s.name}? Contact the founder to be added as a reference.</p> },
        { id: "events", label: "Events", content: (
          <div className="space-y-5">{upcoming.length > 0 && <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Upcoming</p><div className="grid gap-4 md:grid-cols-2">{upcoming.map((e) => <EventCard key={e.slug} e={e} view="grid" />)}</div></div>}{past.length > 0 && <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Past</p><ul className="space-y-2">{past.map((e) => <li key={e.slug}><Link to={`/events/${e.slug}`} className="flex items-center justify-between rounded-lg border border-line p-3 text-[12.5px] hover:border-navy-700"><span className="font-semibold text-navy-900">{e.title}</span><span className="inline-flex items-center gap-1 text-slate-500"><CalendarDays className="h-3 w-3" /> {new Date(e.start).toLocaleDateString("en-IN")}</span></Link></li>)}</ul></div>}{upcoming.length + past.length === 0 && <p className="text-[12.5px] text-slate-500">No events yet. <Link to="/events" className="font-semibold text-navy-700">Browse events →</Link></p>}</div>
        ) },
        { id: "stories", label: "Stories", subtitle: "Published articles, founder stories & media", content: sStories.length ? <div className="grid gap-4 sm:grid-cols-2">{sStories.map((st) => <StoryCard key={st.slug} s={st} />)}</div> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 p-4"><p className="text-[12.5px] text-slate-600">No stories yet about {s.name}.</p><Link to="/stories?submit=1" className="btn-navy px-4 py-2">Nominate for a story</Link></div> },
      ]}
      sidebar={<>
        <SideCard title="At a glance"><KV rows={[["Stage", s.stage], ["Founded", s.founded], ["Team size", s.teamSize], ["Funding raised", fmtFunding(s.fundingRaised)], ["Revenue", s.traction.revenue], ["Followers", s.followers], ["Updated", new Date(s.updatedAt).toLocaleDateString("en-IN")]]} /><div className="mt-3 flex items-center justify-between"><ReportBtn targetType="startup" targetSlug={s.slug} />{s.businessSlug && <Link to={`/businesses/${s.businessSlug}`} className="text-[11.5px] font-semibold text-navy-700 hover:underline">Company profile →</Link>}</div></SideCard>
        <SideCard title="Looking for"><div className="flex flex-wrap gap-1.5">{s.lookingFor.map((l) => <Link key={l} to={`/startups?looking=${encodeURIComponent(l)}`} className="inline-flex items-center gap-1 rounded-md bg-navy-50 px-2.5 py-1.5 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-800 hover:text-white"><Target className="h-3 w-3" /> {l}</Link>)}</div></SideCard>
        <SideCard title="Location"><iframe title={`Map of ${s.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&z=13&output=embed`} className="h-40 w-full rounded-lg border border-line" loading="lazy" /><p className="mt-2 text-[11.5px] text-slate-500">{s.mapQuery}</p></SideCard>
        <div id="contact-cta" className="rounded-xl bg-navy-900 p-5 text-white shadow-[var(--shadow-card)]"><Landmark className="h-6 w-6 text-gold-400" /><h3 className="mt-2 text-[15px] font-bold">{s.funding.seeking ? `Raising ${s.funding.seeking}` : "Open to partnerships"}</h3><p className="mt-1 text-[12px] text-white/75">{user ? "Reach the founder directly or ask WS Hub for a warm intro." : "Sign in to contact the founder — details stay private."}</p><div className="mt-3 grid gap-2"><InvestorInterestBtn s={s} className="w-full" /><IntroBtn targetType="founder" targetSlug={s.founderSlug} targetName={founder?.name ?? s.name} className="w-full !border-white/40 !bg-transparent !text-white hover:!bg-white/10" /></div></div>
        {s.verified && <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11.5px] font-medium text-emerald-700"><BadgeCheck className="h-4 w-4" /> Verified by WS Hub · <CheckCircle2 className="h-3.5 w-3.5" /> Documents checked</p>}
      </>}
      related={{ title: "Related Startups", subtitle: `Similar industry, stage or technology`, to: `/startups?industry=${encodeURIComponent(s.industry)}`, children: <div className="flex snap-x gap-4 overflow-x-auto pb-2 hide-scrollbar">{relatedStartups(s).map((r) => <div key={r.slug} className="w-[320px] shrink-0 snap-start"><StartupCard s={r} /></div>)}</div> }}
      footer={<section className="relative mt-4 overflow-hidden bg-navy-950 py-12 text-white"><img src="/images/cta-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /><div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/50" /><div className="relative mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8"><div><h2 className="text-[24px] font-bold">Building a startup in <span className="text-gold-500">Warangal</span>?</h2><p className="mt-1 text-[13px] text-white/80">List it on WS Hub and get discovered by investors, partners and customers.</p></div><Link to="/dashboard?tab=startup" className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-[13px] font-bold text-navy-900 hover:bg-gold-400">Register your startup <ArrowRight className="h-4 w-4" /></Link></div></section>}
    />
  );
}

