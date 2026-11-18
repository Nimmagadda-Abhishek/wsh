import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, CalendarDays, ExternalLink, Eye, Globe, GraduationCap, Languages, MapPin, MessageCircle, Star, Target, Users } from "lucide-react";
import { getFounder, relatedFounders } from "../founders";
import { getOpportunity, typeColor } from "../opportunities";
import { investors } from "../investors";
import { eventsForFounder } from "../events";
import { startupByFounder } from "../startups";
import { stories } from "../stories";
import { ProfileShell, Avatar, KV, LockedNote, SideCard, Tag, Timeline } from "../components/ProfileShell";
import { ConnectBtn, IntroBtn, ReportBtn, SaveBtn, ShareBtn, useTrackView } from "../components/ui/Actions";
import { StoryCard } from "./Stories";
import { EventCard } from "./Events";
import { FounderCard } from "./Founders";
import { connectionWith, toast, useStore } from "../store";
import { cn } from "../utils/cn";

export default function FounderProfile() {
  const { slug = "" } = useParams();
  const f = getFounder(slug);
  const user = useStore((s) => s.user);
  const conn = useStore((s) => connectionWith(s, slug));
  useTrackView(`founder:${slug}`);
  useEffect(() => {
    if (f) document.title = `${f.name} — Founders — WS Hub`;
  }, [f]);
  if (!f) return <Navigate to="/founders" replace />;

  const backers = investors.filter((i) => i.portfolio.some((p) => p.founderSlug === f.slug));
  const openOpps = f.openRequirements.map(getOpportunity).filter(Boolean);
  const speaking = eventsForFounder(f.slug);
  const startup = startupByFounder(f.slug);
  const fStories = stories.filter((st) => st.links.founder === f.slug || st.author.founderSlug === f.slug);
  const canMessage = conn?.status === "Accepted";

  const message = () => {
    if (!user) return toast("Sign in to message founders", "info", "/login");
    if (!canMessage) return toast("Connect first — messaging unlocks once your request is accepted", "info");
    toast(`Conversation with ${f.name} opened`, "success", "/dashboard?tab=messages");
  };

  return (
    <ProfileShell
      cover={f.cover}
      crumbs={[{ label: "Home", to: "/" }, { label: "Founders", to: "/founders" }, { label: f.name }]}
      avatar={<Avatar initials={f.initials} color={f.color} />}
      title={f.name}
      verified={f.verified}
      subtitle={<>{f.role}, {f.businessSlug ? <Link to={`/businesses/${f.businessSlug}`} className="text-navy-700 hover:underline">{f.company}</Link> : f.company} · {f.bio}</>}
      meta={
        <>
          <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {f.industry}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {f.location}</span>
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {f.experience} yrs experience</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {f.views.toLocaleString("en-IN")} views</span>
        </>
      }
      badges={
        <>
          <span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10.5px] font-semibold text-gold-800">{f.stage}</span>
          {f.tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">{t}</span>)}
          {f.women && <span className="rounded-md bg-pink-100 px-2 py-0.5 text-[10.5px] font-semibold text-pink-800">Women Founder</span>}
          {f.student && <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10.5px] font-semibold text-indigo-800">Student Founder</span>}
          <span className={cn("rounded-md px-2 py-0.5 text-[10.5px] font-semibold", f.availability === "Open to connect" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}>{f.availability}</span>
        </>
      }
      actions={
        <>
          <ConnectBtn founderSlug={f.slug} founderName={f.name} />
          <button type="button" onClick={message} className={cn("inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[12.5px] font-semibold transition-colors", canMessage ? "bg-gold-500 text-navy-900 hover:bg-gold-400" : "border border-slate-300 text-navy-800 hover:bg-navy-50")}>
            <MessageCircle className="h-4 w-4" /> Message
          </button>
          <a href={`https://${f.social.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><Globe className="h-4 w-4" /> Website</a>
          <a href={`https://${f.social.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">LinkedIn</a>
          <IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} />
        </>
      }
      topRight={<><ShareBtn title={`${f.name} — ${f.company}`} path={`/founders/${f.slug}`} /><SaveBtn type="founder" slug={f.slug} /></>}
      tabs={[
        {
          id: "overview",
          label: "Overview",
          content: (
            <div className="space-y-5">
              <p className="text-[14px] leading-relaxed text-slate-700">{f.about}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-navy-50/60 p-4"><p className="text-[12px] font-bold uppercase tracking-wide text-navy-700">Mission</p><p className="mt-2 text-[13px] text-slate-700">{f.mission}</p></div>
                <div className="rounded-lg border border-line bg-gold-100/50 p-4"><p className="text-[12px] font-bold uppercase tracking-wide text-gold-800">Vision</p><p className="mt-2 text-[13px] text-slate-700">{f.vision}</p></div>
              </div>
              <div>
                <p className="mb-2 text-[12.5px] font-bold text-navy-900">Skills</p>
                <div className="flex flex-wrap gap-1.5">{f.skills.map((s) => <Tag key={s} to={`/founders?skills=${encodeURIComponent(s)}`}>{s}</Tag>)}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-navy-900"><GraduationCap className="h-4 w-4" /> Education</p>
                  {f.education.map((e) => <p key={e.degree} className="text-[13px] text-slate-700">{e.degree} · <span className="text-slate-500">{e.school}, {e.year}</span></p>)}
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-navy-900"><Languages className="h-4 w-4" /> Languages</p>
                  <div className="flex flex-wrap gap-1.5">{f.languages.map((l) => <Tag key={l} to={`/founders?language=${encodeURIComponent(l)}`}>{l}</Tag>)}</div>
                </div>
              </div>
              <div className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between"><p className="text-[12.5px] font-bold text-navy-900">Startup summary</p><button type="button" onClick={() => document.getElementById("startup")?.scrollIntoView({ behavior: "smooth" })} className="text-[11.5px] font-semibold text-navy-700 hover:underline">Full details ↓</button></div>
                <p className="mt-1 text-[13px] text-slate-700"><span className="font-semibold">{f.company}</span> — {f.startup.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500"><span>Revenue: <span className="font-semibold text-navy-900">{f.revenueRange}</span></span><span>Funding: <span className="font-semibold text-navy-900">{f.fundingRaised ? `₹${f.fundingRaised} L` : "Bootstrapped"}</span></span><span>Team: <span className="font-semibold text-navy-900">{f.team.length}</span></span></div>
              </div>
            </div>
          ),
        },
        {
          id: "startup",
          label: "Startup",
          content: (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[16px] font-bold text-navy-900">{f.company}</h3>
                <span className="flex gap-3">{startup && <Link to={`/startups/${startup.slug}`} className="view-all">Startup profile <ArrowRight className="h-3.5 w-3.5" /></Link>}{f.businessSlug && <Link to={`/businesses/${f.businessSlug}`} className="view-all">Company profile <ArrowRight className="h-3.5 w-3.5" /></Link>}</span>
              </div>
              <p className="mt-2 text-[13.5px] text-slate-700">{f.startup.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Revenue", f.startup.revenue], ["Customers", f.startup.customers], ["Funding", f.startup.funding], ["Website", f.startup.website]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">{k}</dt><dd className="mt-0.5 text-[12.5px] font-semibold text-navy-900">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Products</p><div className="flex flex-wrap gap-1.5">{f.startup.products.map((p) => <Tag key={p}>{p}</Tag>)}</div></div>
                <div><p className="mb-2 text-[12.5px] font-bold text-navy-900">Services</p><div className="flex flex-wrap gap-1.5">{f.lookingFor.includes("Customers") ? <Tag>Enterprise onboarding</Tag> : null}<Tag>Consulting</Tag><Tag>Implementation</Tag><Tag>Support</Tag></div></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Revenue range</p><p className="text-[12.5px] font-semibold text-navy-900">{f.revenueRange}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Funding status</p><p className="text-[12.5px] font-semibold text-navy-900">{f.fundingRaised ? `Raised ₹${f.fundingRaised} L` : "Bootstrapped"}{f.lookingFor.includes("Investment") && " · Raising"}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Team</p><p className="text-[12.5px] font-semibold text-navy-900">{f.team.length} members</p></div></div>
              {backers.length > 0 && (
                <>
                  <p className="mt-4 mb-2 text-[12.5px] font-bold text-navy-900">Backed by</p>
                  <div className="flex flex-wrap gap-2">
                    {backers.map((b) => (
                      <Link key={b.slug} to={`/investors/${b.slug}`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-navy-900 hover:border-navy-700">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black text-white" style={{ background: b.color }}>{b.initials}</span>{b.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          ),
        },
        {
          id: "experience",
          label: "Experience",
          content: (
            <ul className="space-y-3">
              {f.experienceList.map((e) => (
                <li key={e.role + e.org} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700"><Briefcase className="h-4 w-4" /></span>
                  <div><p className="text-[13.5px] font-bold text-navy-900">{e.role}</p><p className="text-[12px] text-slate-500">{e.org} · {e.period}</p></div>
                </li>
              ))}
            </ul>
          ),
        },
        { id: "achievements", label: "Achievements", subtitle: "Awards, funding, expansion, media, patents and recognition", content: <Timeline items={f.achievements} /> },
        {
          id: "team",
          label: "Team",
          content: (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {f.team.map((t) => (
                <li key={t.name} className={cn("flex items-center gap-3 rounded-lg border p-3", t.initials === "?" ? "border-dashed border-gold-400 bg-gold-100/40" : "border-line")}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white" style={{ background: t.initials === "?" ? "#e2b04a" : f.color }}>{t.initials}</span>
                  <div className="min-w-0"><p className="truncate text-[13px] font-bold text-navy-900">{t.name}</p><p className="text-[11.5px] text-slate-500">{t.role}</p>{t.initials === "?" && openOpps[0] && <Link to={`/opportunities/${openOpps[0]!.slug}`} className="text-[11px] font-semibold text-gold-800 hover:underline">Apply for this role →</Link>}</div>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "events",
          label: "Events",
          subtitle: "Where you can meet this founder",
          content: speaking.length ? <div className="grid gap-4 md:grid-cols-2">{speaking.map((ev) => <EventCard key={ev.slug} e={ev} view="grid" />)}</div> : <p className="text-[12.5px] text-slate-500">No upcoming talks. <Link to="/events" className="font-semibold text-navy-700">Browse all events →</Link></p>,
        },
        {
          id: "stories",
          label: "Stories",
          content: fStories.length ? <div className="grid gap-4 sm:grid-cols-2">{fStories.map((st) => <StoryCard key={st.slug} s={st} />)}</div> : <p className="text-[12.5px] text-slate-500">No stories yet. <Link to="/stories?submit=1" className="font-semibold text-navy-700">Nominate this founder for a story →</Link></p>,
        },
        {
          id: "looking",
          label: "Looking For",
          content: (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {f.lookingFor.map((l) => <span key={l} className="inline-flex items-center gap-1.5 rounded-lg bg-gold-100 px-3 py-2 text-[12.5px] font-semibold text-gold-800"><Target className="h-4 w-4" /> {l}</span>)}
              </div>
              {openOpps.length > 0 ? (
                <div>
                  <p className="mb-2 text-[12.5px] font-bold text-navy-900">Open requirements</p>
                  <ul className="space-y-2">
                    {openOpps.map((o) => o && (
                      <li key={o.slug}>
                        <Link to={`/opportunities/${o.slug}`} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 transition-colors hover:border-navy-700 hover:bg-navy-50">
                          <div><span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", typeColor[o.type])}>{o.type}</span><p className="mt-1 text-[13px] font-semibold text-navy-900">{o.title}</p></div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-navy-600" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <p className="text-[12.5px] text-slate-500">No open requirements posted. Connect to start a conversation.</p>}
            </div>
          ),
        },
        {
          id: "gallery",
          label: "Gallery",
          content: (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {f.gallery.map((g) => (
                <figure key={g.image} className="group overflow-hidden rounded-lg"><img src={g.image} alt={g.label} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" /><figcaption className="mt-1 text-[11px] text-slate-500">{g.label}</figcaption></figure>
              ))}
            </div>
          ),
        },
        {
          id: "reviews",
          label: "Reviews",
          content: f.reviews.length ? (
            <ul className="space-y-3">
              {f.reviews.map((r) => (
                <li key={r.name} className="rounded-lg border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[13px] font-bold text-navy-900">{r.name}</p><p className="text-[11px] text-slate-500">{r.role}</p></div>
                    <span className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}</span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-700">{r.text}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12.5px] text-slate-500">No reviews yet. Worked with {f.name.split(" ")[0]}? Be the first to leave one.</p>,
        },
        {
          id: "activity",
          label: "Activity",
          content: (
            <ul className="space-y-2.5">
              {f.activity.map((a) => (
                <li key={a.title} className="flex items-start gap-3 rounded-lg border border-line p-3">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{a.type}</span>
                  <div className="min-w-0 flex-1">{a.to ? <Link to={a.to} className="text-[13px] font-semibold text-navy-900 hover:text-navy-600">{a.title}</Link> : <p className="text-[13px] font-semibold text-navy-900">{a.title}</p>}<p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500"><CalendarDays className="h-3 w-3" /> {a.date}</p></div>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
      sidebar={
        <>
          <SideCard title="Quick Info">
            <KV rows={[["Stage", f.stage], ["Industry", f.industry], ["Experience", `${f.experience} years`], ["Funding raised", f.fundingRaised ? `₹${f.fundingRaised} L` : "Bootstrapped"], ["Languages", f.languages.join(", ")], ["Mutual connections", f.mutual]]} />
          </SideCard>
          <SideCard title="Contact">
            {user ? (
              <ul className="space-y-2 text-[12.5px]">
                <li><a href={`mailto:${f.social.email}`} className="text-navy-700 hover:underline">{f.social.email}</a></li>
                <li><a href={`https://${f.social.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-navy-700 hover:underline">{f.social.linkedin} <ExternalLink className="h-3 w-3" /></a></li>
                <li className="text-slate-600">{f.social.instagram}</li>
              </ul>
            ) : <LockedNote text="Contact details are visible to members." />}
            <div className="mt-3"><ReportBtn targetType="founder" targetSlug={f.slug} /></div>
          </SideCard>
          <SideCard className="bg-navy-900 text-white">
            <Users className="h-7 w-7 text-gold-400" />
            <h3 className="mt-3 text-[15px] font-bold">Want a warm intro?</h3>
            <p className="mt-1 text-[12px] text-white/75">WS Hub team or a mutual member can introduce you to {f.name.split(" ")[0]}.</p>
            <div className="mt-4"><IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} variant="gold" className="w-full" /></div>
          </SideCard>
        </>
      }
      related={{ title: "Related Founders", subtitle: `More founders in ${f.industry}`, to: `/founders?industry=${encodeURIComponent(f.industry)}`, children: <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar snap-x">{relatedFounders(f).map((r) => <div key={r.slug} className="w-[300px] shrink-0 snap-start"><FounderCard f={r} /></div>)}</div> }}
      stickyActions={<><ConnectBtn founderSlug={f.slug} founderName={f.name} /><IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} variant="gold" /></>}
      footer={
        <section className="relative mt-4 overflow-hidden bg-navy-950 py-12 text-white">
          <img src="/images/cta-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/50" />
          <div className="relative mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div><h2 className="text-[24px] font-bold">Become a <span className="text-gold-500">Founder</span> on WS Hub</h2><p className="mt-1 text-[13px] text-white/80">Tell your story, list your requirements and get discovered by investors and partners.</p></div>
            <Link to="/signup?role=founder" className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-[13px] font-bold text-navy-900 hover:bg-gold-400">Create founder profile <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      }
    />
  );
}
