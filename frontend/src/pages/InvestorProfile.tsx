import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, Globe, Landmark, MapPin, PieChart, TrendingUp, Wallet } from "lucide-react";
import { getInvestor, relatedInvestors, ticketLabel } from "../investors";
import { getFounder } from "../founders";
import { opportunities, typeColor } from "../opportunities";
import { ProfileShell, Avatar, KV, SideCard, Tag } from "../components/ProfileShell";
import { InterestedBtn, IntroBtn, MeetingBtn, ReportBtn, SaveBtn, ShareBtn, useTrackView } from "../components/ui/Actions";
import { events, isPast } from "../events";
import { stories } from "../stories";
import { startups } from "../startups";
import { EventCard } from "./Events";
import { InvestorCard } from "./Investors";
import { cn } from "../utils/cn";

export default function InvestorProfile() {
  const { slug = "" } = useParams();
  const i = getInvestor(slug);
  useTrackView(`investor:${slug}`);
  useEffect(() => {
    if (i) document.title = `${i.name} — Investors — WS Hub`;
  }, [i]);
  if (!i) return <Navigate to="/investors" replace />;

  const postedOpps = opportunities.filter((o) => o.postedBy.slug === i.slug);
  const invEvents = events.filter((e) => !isPast(e) && (e.speakers.some((sp) => sp.investorSlug === i.slug) || e.sponsors.some((sp) => sp.to === `/investors/${i.slug}`) || e.organizer.to === `/investors/${i.slug}`));

  return (
    <ProfileShell
      cover={i.cover}
      crumbs={[{ label: "Home", to: "/" }, { label: "Investors", to: "/investors" }, { label: i.name }]}
      avatar={<Avatar initials={i.initials} color={i.color} />}
      title={i.name}
      verified={i.verified}
      subtitle={<>{i.type}{i.firm !== "Independent" && ` · ${i.firm}`} — {i.bio}</>}
      meta={
        <>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {i.location}</span>
          <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> {ticketLabel(i)}</span>
          <span className="inline-flex items-center gap-1"><PieChart className="h-3.5 w-3.5" /> {i.portfolioSize} investments</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {i.views.toLocaleString("en-IN")} views</span>
        </>
      }
      badges={
        <>
          {i.stages.map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">{s}</span>)}
          <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", i.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}>{i.active ? "Actively investing" : "Not currently active"}</span>
        </>
      }
      actions={
        <>
          <InterestedBtn investorSlug={i.slug} investorName={i.name} />
          <a href={`https://${i.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><Globe className="h-4 w-4" /> Website</a>
          <a href={`https://${i.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">LinkedIn</a>
          <MeetingBtn investorSlug={i.slug} investorName={i.name} />
          <IntroBtn targetType="investor" targetSlug={i.slug} targetName={i.name} variant="gold" />
        </>
      }
      topRight={<><ShareBtn title={`${i.name} — ${i.type}`} path={`/investors/${i.slug}`} /><SaveBtn type="investor" slug={i.slug} /></>}
      tabs={[
        { id: "overview", label: "Overview", content: <p className="text-[14px] leading-relaxed text-slate-700">{i.about}</p> },
        {
          id: "thesis",
          label: "Investment Thesis",
          content: (
            <div className="space-y-4">
              <blockquote className="rounded-lg border-l-4 border-gold-500 bg-gold-100/40 p-4 text-[14px] italic leading-relaxed text-navy-900">“{i.thesis.what}”</blockquote>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Average ticket", i.thesis.avgTicket], ["Cheque size", i.thesis.checkSize], ["Geography", i.thesis.geography], ["Preferred revenue", i.thesis.preferredRevenue], ["Preferred team size", i.thesis.preferredTeamSize], ["Formats", i.format.join(", ")]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">{k}</dt><dd className="mt-0.5 text-[12.5px] font-semibold text-navy-900">{v}</dd></div>
                ))}
              </dl>
              <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Preferred industries</p><div className="flex flex-wrap gap-1.5">{i.thesis.industries.map((s) => <Tag key={s} to={`/investors?sector=${encodeURIComponent(s)}`}>{s}</Tag>)}</div></div>
            </div>
          ),
        },
        {
          id: "portfolio",
          label: "Portfolio",
          subtitle: `${i.portfolioSize} investments · ${i.portfolio.length} listed on WS Hub`,
          content: (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {i.portfolio.map((p) => {
                const f = p.founderSlug ? getFounder(p.founderSlug) : undefined;
                const st = startups.find((x) => x.name === p.name);
                const inner = (
                  <div className="card flex h-full items-center gap-3 p-3.5">
                    {f ? <Avatar initials={f.initials} color={f.color} size="md" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-sm font-black text-slate-600">{p.name.slice(0, 2).toUpperCase()}</span>}
                    <div className="min-w-0"><p className="truncate text-[13.5px] font-bold text-navy-900">{p.name}</p><p className="text-[11px] text-slate-500">{p.sector} · {p.stage} · {p.year}</p>{f && <p className="mt-0.5 text-[11px] text-navy-700">Founder: {f.name}{f.businessSlug && <> · <Link to={`/businesses/${f.businessSlug}`} onClick={(e) => e.stopPropagation()} className="underline">Startup profile</Link></>}</p>}</div>
                  </div>
                );
                return st ? <Link key={p.name} to={`/startups/${st.slug}`} className="block">{inner}</Link> : f ? <Link key={p.name} to={`/founders/${f.slug}`} className="block">{inner}</Link> : <div key={p.name}>{inner}</div>;
              })}
            </div>
          ),
        },
        { id: "focus", label: "Focus Areas", content: <div className="flex flex-wrap gap-2">{i.focus.map((s) => <span key={s} className="rounded-lg bg-navy-50 px-3.5 py-2 text-[12.5px] font-semibold text-navy-800">{s}</span>)}</div> },
        {
          id: "team",
          label: "Team",
          content: (
            <ul className="grid gap-3 sm:grid-cols-2">
              {i.team.map((t) => (
                <li key={t.name} className="flex items-center gap-3 rounded-lg border border-line p-3"><Avatar initials={t.initials} color={i.color} size="sm" /><div><p className="text-[13px] font-bold text-navy-900">{t.name}</p><p className="text-[11.5px] text-slate-500">{t.role}</p></div></li>
              ))}
            </ul>
          ),
        },
        {
          id: "past",
          label: "Past Investments",
          subtitle: "Exits and earlier cheques",
          content: (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {i.pastInvestments.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 p-3.5"><div><p className="text-[13px] font-bold text-navy-900">{p.name}</p><p className="text-[11.5px] text-slate-500">{p.sector} · {p.year}</p></div><span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><TrendingUp className="h-3.5 w-3.5" /> {p.outcome}</span></li>
              ))}
            </ul>
          ),
        },
        {
          id: "events",
          label: "Events",
          subtitle: "Demo days, pitch events and workshops",
          content: invEvents.length ? <div className="grid gap-4 md:grid-cols-2">{invEvents.slice(0, 4).map((e) => <EventCard key={e.slug} e={e} view="grid" />)}</div> : i.events.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["Upcoming", "Past"] as const).map((k) => (
                <div key={k}>
                  <p className="mb-2 text-[12.5px] font-bold text-navy-900">{k}</p>
                  <ul className="space-y-2">
                    {i.events.filter((e) => (k === "Past") === e.past).map((e) => (
                      <li key={e.title}><Link to="/events" className="flex items-center justify-between gap-2 rounded-lg border border-line p-3 text-[12.5px] hover:border-navy-700"><span className="font-semibold text-navy-900">{e.title}</span><span className="shrink-0 text-slate-500">{e.date}</span></Link></li>
                    ))}
                    {i.events.filter((e) => (k === "Past") === e.past).length === 0 && <li className="text-[12px] text-slate-500">None</li>}
                  </ul>
                </div>
              ))}
            </div>
          ) : <p className="text-[12.5px] text-slate-500">No events listed.</p>,
        },
        {
          id: "requirements",
          label: "Requirements",
          subtitle: "What this investor looks for",
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Sectors", i.thesis.industries.join(", ")], ["Revenue stage", i.thesis.preferredRevenue], ["Traction", i.stages.join(" / ")], ["Geography", i.thesis.geography]].map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{k}</p><p className="text-[12.5px] font-semibold text-navy-900">{v}</p></div>)}</div>
              <ul className="space-y-2">{i.requirements.map((r) => <li key={r} className="flex items-start gap-2 text-[13px] text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" /> {r}</li>)}</ul>
              {postedOpps.length > 0 && (
                <div>
                  <p className="mb-2 text-[12.5px] font-bold text-navy-900">Open programmes</p>
                  {postedOpps.map((o) => (
                    <Link key={o.slug} to={`/opportunities/${o.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50">
                      <div><span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", typeColor[o.type])}>{o.type}</span><p className="mt-1 text-[13px] font-semibold text-navy-900">{o.title}</p></div><ArrowRight className="h-4 w-4 text-navy-600" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ),
        },
      ]}
      sidebar={
        <>
          <SideCard title="At a glance"><KV rows={[["Type", i.type], ["Stages", i.stages.join(", ")], ["Ticket size", ticketLabel(i)], ["Portfolio", i.portfolioSize], ["Location", i.location], ["Website", <a key="w" href={`https://${i.website}`} target="_blank" rel="noreferrer" className="text-navy-700 hover:underline">{i.website}</a>]]} /><div className="mt-3"><ReportBtn targetType="investor" targetSlug={i.slug} /></div></SideCard>
          {(() => {
            const pfSlugs = i.portfolio.map((p) => p.founderSlug).filter(Boolean) as string[];
            const pfStories = stories.filter((st) => (st.links.investor === i.slug || (st.links.founder && pfSlugs.includes(st.links.founder)))).slice(0, 3);
            if (!pfStories.length) return null;
            return (
              <SideCard title="Portfolio stories">
                <ul className="space-y-2">{pfStories.map((st) => <li key={st.slug}><Link to={`/stories/${st.slug}`} className="group flex gap-3"><img src={st.cover} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" /><span className="min-w-0"><span className="line-clamp-2 text-[12.5px] font-bold leading-snug text-navy-900 group-hover:text-navy-600">{st.title}</span><span className="text-[10.5px] text-slate-500">{st.category}</span></span></Link></li>)}</ul>
              </SideCard>
            );
          })()}
          <SideCard className="bg-navy-900 text-white">
            <Landmark className="h-7 w-7 text-gold-400" />
            <h3 className="mt-3 text-[15px] font-bold">Raising for your startup?</h3>
            <p className="mt-1 text-[12px] text-white/75">Share your deck with {i.name} or request a warm intro via WS Hub.</p>
            <div className="mt-4 grid gap-2"><InterestedBtn investorSlug={i.slug} investorName={i.name} className="w-full !bg-gold-500 !text-navy-900 hover:!bg-gold-400" /><IntroBtn targetType="investor" targetSlug={i.slug} targetName={i.name} className="w-full !border-white/40 !bg-transparent !text-white hover:!bg-white/10" /></div>
          </SideCard>
        </>
      }
      stickyActions={<><InterestedBtn investorSlug={i.slug} investorName={i.name} /><MeetingBtn investorSlug={i.slug} investorName={i.name} /></>}
      related={{ title: "Related Investors", subtitle: `Similar stage and sector focus`, to: `/investors?type=${encodeURIComponent(i.type)}`, children: <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar snap-x">{relatedInvestors(i).map((r) => <div key={r.slug} className="w-[300px] shrink-0 snap-start"><InvestorCard i={r} /></div>)}</div> }}
    />
  );
}
