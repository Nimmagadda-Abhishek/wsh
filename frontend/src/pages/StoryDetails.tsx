import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Bookmark, ChevronRight, Clock, Eye, Flag, Heart, MessageCircle, Play, Share2, ThumbsUp, UserPlus } from "lucide-react";
import { fmtStoryDate, getStory, relatedStories, stories, storiesByAuthor, type Block } from "../stories";
import { getFounder } from "../founders";
import { getInvestor } from "../investors";
import { getBusiness } from "../businesses";
import { startupByFounder } from "../startups";
import { getEvent, fmtEventDate } from "../events";
import { getOpportunity } from "../opportunities";
import { Avatar } from "../components/ProfileShell";
import { ReportBtn, ShareModal } from "../components/ui/Actions";
import { textareaCls } from "../components/ui/Modal";
import { StoryCard } from "./Stories";
import { addComment, likeComment, timeAgo, toast, toggleFollow, toggleSaved, toggleStoryLike, useStore, type Comment } from "../store";
import { cn } from "../utils/cn";
import { useTrackView } from "../components/ui/Actions";

function Body({ b }: { b: Block }) {
  switch (b.type) {
    case "h2": return <h2 className="mt-8 text-[22px] font-bold text-navy-900">{b.text}</h2>;
    case "p": return <p className="mt-4 text-[16px] leading-[1.8] text-slate-700">{b.text}</p>;
    case "quote": return <blockquote className="my-6 border-l-4 border-gold-500 bg-gold-100/40 px-5 py-4 text-[18px] font-medium italic leading-relaxed text-navy-900">“{b.text}”<footer className="mt-2 text-[12.5px] not-italic text-slate-600">— {b.by}</footer></blockquote>;
    case "image": return <figure className="my-6"><img src={b.src} alt={b.caption} loading="lazy" className="w-full rounded-xl" /><figcaption className="mt-2 text-center text-[12px] text-slate-500">{b.caption}</figcaption></figure>;
    case "stats": return <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{b.items.map((i) => <div key={i.label} className="rounded-xl bg-navy-900 p-4 text-center text-white"><p className="text-[24px] font-black text-gold-400">{i.value}</p><p className="text-[11px] text-white/70">{i.label}</p></div>)}</div>;
    case "video": return <button type="button" onClick={() => toast("Video player opens in the full release", "info")} className="group relative my-6 block w-full overflow-hidden rounded-xl"><img src={b.poster} alt="" className="aspect-video w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-navy-950/40"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-navy-900 transition-transform group-hover:scale-110"><Play className="ml-1 h-7 w-7" fill="currentColor" /></span></span><span className="absolute bottom-3 left-4 text-[13px] font-semibold text-white">{b.title}</span></button>;
    case "list": return <ul className="mt-4 space-y-2">{b.items.map((i) => <li key={i} className="flex items-start gap-2 text-[15px] text-slate-700"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" /> {i}</li>)}</ul>;
  }
}

function CommentItem({ c, slug, depth = 0 }: { c: Comment; slug: string; depth?: number }) {
  const user = useStore((s) => s.user);
  const [reply, setReply] = useState(false); const [text, setText] = useState("");
  return (
    <li className={cn(depth > 0 && "ml-8 border-l-2 border-line pl-4")}>
      <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">{c.initials}</span><div className="min-w-0 flex-1"><p className="text-[12.5px]"><span className="font-bold text-navy-900">{c.name}</span> <span className="text-slate-400">· {timeAgo(c.at)}</span></p><p className="mt-0.5 text-[13.5px] text-slate-700">{c.text}</p>
        <div className="mt-1.5 flex items-center gap-4 text-[11.5px]"><button type="button" onClick={() => likeComment(slug, c.id)} className={cn("inline-flex items-center gap-1 font-medium", c.liked ? "text-navy-800" : "text-slate-500 hover:text-navy-800")}><ThumbsUp className="h-3.5 w-3.5" fill={c.liked ? "currentColor" : "none"} /> {c.likes}</button>{depth < 2 && <button type="button" onClick={() => setReply((v) => !v)} className="font-medium text-slate-500 hover:text-navy-800">Reply</button>}<button type="button" onClick={() => toast("Comment reported", "info")} className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600"><Flag className="h-3 w-3" /> Report</button></div>
        {reply && <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (!user) return toast("Sign in to reply", "info", "/login"); addComment(slug, text, c.id); setText(""); setReply(false); }} className="mt-2 flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} required placeholder="Write a reply…" className="h-9 flex-1 rounded-md border border-slate-300 px-3 text-[12.5px] focus:border-navy-700 focus:outline-none" /><button type="submit" className="btn-navy px-3">Reply</button></form>}
        {c.replies.length > 0 && <ul className="mt-3 space-y-3">{c.replies.map((r) => <CommentItem key={r.id} c={r} slug={slug} depth={depth + 1} />)}</ul>}
      </div></div>
    </li>
  );
}

const seedComments = (slug: string): Comment[] => [
  { id: `${slug}-c1`, name: "Harika S.", initials: "HS", text: "Inspiring! We need more stories like this from Warangal.", at: new Date(Date.now() - 2 * 864e5).toISOString(), likes: 12, replies: [{ id: `${slug}-c1r`, name: "WS Hub Team", initials: "WS", text: "Thank you, Harika — more coming every week.", at: new Date(Date.now() - 864e5).toISOString(), likes: 3, replies: [] }] },
  { id: `${slug}-c2`, name: "Kiran Tej", initials: "KT", text: "Would love a follow-up on the numbers behind this.", at: new Date(Date.now() - 5 * 3600e3).toISOString(), likes: 4, replies: [] },
];

export default function StoryDetails() {
  const { slug = "" } = useParams();
  useTrackView("story:" + slug);
  const s = getStory(slug);
  const user = useStore((x) => x.user);
  const liked = useStore((x) => x.storyLikes.includes(slug));
  const saved = useStore((x) => x.saved.story.includes(slug));
  const following = useStore((x) => (s ? x.follows.includes(s.author.id) : false));
  const userComments = useStore((x) => x.comments[slug] ?? []);
  const [share, setShare] = useState(false); const [text, setText] = useState(""); const [sort, setSort] = useState<"newest" | "top">("newest"); const [progress, setProgress] = useState(0); const [side, setSide] = useState<"Related" | "Trending" | "Recent" | "Most Read">("Related");

  useEffect(() => { if (s) document.title = `${s.title} — Stories — WS Hub`; }, [s]);
  useEffect(() => {
    const onScroll = () => { const h = document.documentElement; setProgress(Math.min(100, (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100)); };
    window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const comments = useMemo(() => { const all = [...userComments, ...seedComments(slug)]; return sort === "top" ? [...all].sort((a, b) => b.likes - a.likes) : all; }, [userComments, slug, sort]);
  if (!s) return <Navigate to="/stories" replace />;

  const founder = s.links.founder ? getFounder(s.links.founder) : undefined;
  const startup = founder ? startupByFounder(founder.slug) : undefined;
  const business = s.links.business ? getBusiness(s.links.business) : undefined;
  const investor = s.links.investor ? getInvestor(s.links.investor) : undefined;
  const event = s.links.event ? getEvent(s.links.event) : undefined;
  const opp = s.links.opportunity ? getOpportunity(s.links.opportunity) : undefined;
  const sideList = side === "Related" ? relatedStories(s) : side === "Trending" ? [...stories].filter((x) => x.slug !== s.slug).sort((a, b) => b.likes - a.likes).slice(0, 3) : side === "Recent" ? [...stories].filter((x) => x.slug !== s.slug).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3) : [...stories].filter((x) => x.slug !== s.slug).sort((a, b) => b.views - a.views).slice(0, 3);
  const authorTo = s.author.founderSlug ? `/founders/${s.author.founderSlug}` : s.author.investorSlug ? `/investors/${s.author.investorSlug}` : undefined;
  const like = () => { if (!user) return toast("Sign in to like stories", "info", "/login"); toggleStoryLike(s.slug); };
  const follow = () => { if (!user) return toast("Sign in to follow authors", "info", "/login"); toggleFollow(s.author.id, s.author.name); };
  const comment = (e: FormEvent) => { e.preventDefault(); if (!user) return toast("Sign in to comment", "info", "/login"); addComment(s.slug, text); setText(""); };

  const actionBar = (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={like} className={cn("inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[12.5px] font-semibold transition-all", liked ? "border-red-200 bg-red-50 text-red-600" : "border-slate-300 text-navy-800 hover:bg-navy-50")}><Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} /> {s.likes + (liked ? 1 : 0)}</button>
      <button type="button" onClick={() => toggleSaved("story", s.slug)} className={cn("inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[12.5px] font-semibold", saved ? "border-gold-500 text-gold-700" : "border-slate-300 text-navy-800 hover:bg-navy-50")}><Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Bookmark"}</button>
      <button type="button" onClick={() => setShare(true)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3.5 py-2 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><Share2 className="h-4 w-4" /> Share</button>
      <a href="#comments" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3.5 py-2 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50"><MessageCircle className="h-4 w-4" /> {comments.length}</a>
      <button type="button" onClick={follow} className={cn("inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[12.5px] font-semibold", following ? "bg-emerald-50 text-emerald-700" : "bg-navy-800 text-white hover:bg-navy-700")}><UserPlus className="h-4 w-4" /> {following ? "Following" : "Follow Author"}</button>
    </div>
  );

  return (
    <div className="page-in pb-20 lg:pb-0">
      <div className="fixed inset-x-0 top-[60px] z-40 h-[3px] bg-transparent"><div className="h-full bg-gold-500 transition-[width] duration-150" style={{ width: `${progress}%` }} /></div>
      <div className="relative h-[280px] overflow-hidden bg-navy-900 sm:h-[380px] lg:h-[440px]">
        <img src={s.cover} alt="" className="ken-burns h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-navy-950/30" />
        <div className="absolute inset-x-0 top-0 mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-8"><nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/85"><Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" /><Link to="/stories" className="hover:text-white">Stories</Link><ChevronRight className="h-3 w-3" /><Link to={`/stories?category=${encodeURIComponent(s.category)}`} className="hover:text-white">{s.category}</Link></nav></div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-8">
          <span className="rounded-md bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-navy-900">{s.category}</span>
          <h1 className="mt-3 max-w-4xl text-[26px] font-black leading-tight text-white sm:text-[36px] lg:text-[42px]">{s.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/85">
            <span className="inline-flex items-center gap-2"><Avatar initials={s.author.initials} color={s.author.color} size="sm" /><span><span className="block font-semibold text-white">{s.author.name}</span><span className="text-white/70">{s.author.role}, {s.author.company}</span></span></span>
            <span>{fmtStoryDate(s.date)}</span><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.readTime} min read</span><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {s.views.toLocaleString("en-IN")} views</span>
            <button type="button" onClick={() => setShare(true)} className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 font-semibold text-white hover:bg-white/25"><Share2 className="h-3.5 w-3.5" /> Share</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0">
            <p className="text-[18px] font-medium leading-relaxed text-navy-900">{s.excerpt}</p>
            <div className="mt-5">{actionBar}</div>
            {s.body.map((b, i) => <Body key={i} b={b} />)}
            <div className="mt-8 flex flex-wrap gap-1.5">{s.tags.map((t) => <Link key={t} to={`/stories?q=${encodeURIComponent(t)}`} className="rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:bg-navy-800 hover:text-white">#{t}</Link>)}</div>

            {/* Continue the journey */}
            {(founder || startup || business || investor || event || opp) && (
              <div className="mt-8 rounded-xl border border-line bg-white p-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-gold-800">Continue the journey</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {founder && <Link to={`/founders/${founder.slug}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50"><Avatar initials={founder.initials} color={founder.color} size="sm" /><span className="min-w-0"><span className="block text-[11px] text-slate-500">Founder</span><span className="block truncate text-[13px] font-bold text-navy-900">{founder.name}</span></span><ArrowRight className="ml-auto h-4 w-4 text-navy-600" /></Link>}
                  {startup && <Link to={`/startups/${startup.slug}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50"><span className="flex h-10 w-10 items-center justify-center rounded-lg text-[11px] font-black" style={{ background: startup.logo.bg, color: startup.logo.fg }}>{startup.logo.initials}</span><span className="min-w-0"><span className="block text-[11px] text-slate-500">Startup</span><span className="block truncate text-[13px] font-bold text-navy-900">{startup.name}</span></span><ArrowRight className="ml-auto h-4 w-4 text-navy-600" /></Link>}
                  {business && <Link to={`/businesses/${business.slug}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50"><span className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-black" style={{ background: business.logo.bg, color: business.logo.fg }}>{business.logo.initials}</span><span className="min-w-0"><span className="block text-[11px] text-slate-500">Company</span><span className="block truncate text-[13px] font-bold text-navy-900">{business.name}</span></span><ArrowRight className="ml-auto h-4 w-4 text-navy-600" /></Link>}
                  {investor && <Link to={`/investors/${investor.slug}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50"><Avatar initials={investor.initials} color={investor.color} size="sm" /><span className="min-w-0"><span className="block text-[11px] text-slate-500">Investor</span><span className="block truncate text-[13px] font-bold text-navy-900">{investor.name}</span></span><ArrowRight className="ml-auto h-4 w-4 text-navy-600" /></Link>}
                  {event && <Link to={`/events/${event.slug}`} className="flex items-center gap-3 rounded-lg border border-gold-300 bg-gold-100/40 p-3 hover:bg-gold-100"><span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-navy-900 text-white"><span className="text-[8px] font-bold text-gold-400">{new Date(event.start).toLocaleString("en-IN", { month: "short" }).toUpperCase()}</span><span className="text-[14px] font-black leading-none">{new Date(event.start).getDate()}</span></span><span className="min-w-0"><span className="block text-[11px] text-slate-500">Upcoming event · {fmtEventDate(event.start)}</span><span className="block truncate text-[13px] font-bold text-navy-900">{event.title}</span></span><ArrowRight className="ml-auto h-4 w-4 text-navy-600" /></Link>}
                  {opp && <Link to={`/opportunities/${opp.slug}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50 sm:col-span-2"><span className="rounded-md bg-navy-800 px-2 py-1 text-[10px] font-bold text-white">{opp.type}</span><span className="min-w-0"><span className="block text-[11px] text-slate-500">Open opportunity</span><span className="block truncate text-[13px] font-bold text-navy-900">{opp.title}</span></span><ArrowRight className="ml-auto h-4 w-4 text-navy-600" /></Link>}
                </div>
              </div>
            )}

            <div className="mt-8 border-y border-line py-5">{actionBar}</div>

            {/* Author */}
            <div className="mt-6 flex flex-col gap-4 rounded-xl bg-navy-50/60 p-5 sm:flex-row sm:items-center">
              <Avatar initials={s.author.initials} color={s.author.color} size="lg" />
              <div className="min-w-0 flex-1"><p className="text-[15px] font-bold text-navy-900">{s.author.name}</p><p className="text-[12px] text-slate-600">{s.author.role}, {s.author.company} · {s.author.followers + (following ? 1 : 0)} followers · {storiesByAuthor(s.author.id).length} stories</p><p className="mt-1.5 text-[13px] text-slate-700">{s.author.bio}</p><div className="mt-2 flex flex-wrap gap-3 text-[12px] font-semibold">{authorTo && <Link to={authorTo} className="text-navy-700 hover:underline">View profile</Link>}<a href={`https://${s.author.website}`} target="_blank" rel="noreferrer" className="text-navy-700 hover:underline">{s.author.website}</a><Link to={`/stories?q=${encodeURIComponent(s.author.name)}`} className="text-navy-700 hover:underline">All articles</Link></div></div>
              <button type="button" onClick={follow} className={cn("shrink-0 rounded-md px-4 py-2.5 text-[12.5px] font-semibold", following ? "bg-emerald-50 text-emerald-700" : "bg-navy-800 text-white hover:bg-navy-700")}>{following ? "Following" : "Follow"}</button>
            </div>

            {/* Comments */}
            <section id="comments" className="mt-8 scroll-mt-24">
              <div className="flex items-center justify-between"><h2 className="text-[18px] font-bold text-navy-900">Comments ({comments.length})</h2><div className="flex rounded-md bg-slate-100 p-0.5 text-[11.5px] font-semibold">{(["newest", "top"] as const).map((k) => <button key={k} type="button" onClick={() => setSort(k)} className={cn("rounded px-3 py-1 capitalize", sort === k ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}>{k}</button>)}</div></div>
              <form onSubmit={comment} className="mt-4"><textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3} className={textareaCls} placeholder={user ? "Share your thoughts…" : "Sign in to join the conversation"} /><div className="mt-2 flex justify-end"><button type="submit" className="btn-navy px-4 py-2.5">Post comment</button></div></form>
              <ul className="mt-5 space-y-5">{comments.map((c) => <CommentItem key={c.id} c={c} slug={s.slug} />)}</ul>
              <div className="mt-4"><ReportBtn targetType="story" targetSlug={s.slug} /></div>
            </section>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-[80px] lg:self-start">
            <div className="rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex gap-1 rounded-md bg-slate-100 p-0.5 text-[11px] font-semibold">{(["Related", "Trending", "Recent", "Most Read"] as const).map((k) => <button key={k} type="button" onClick={() => setSide(k)} className={cn("flex-1 rounded px-1 py-1.5", side === k ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}>{k}</button>)}</div>
              <ul className="mt-3 space-y-3">{sideList.map((r) => <li key={r.slug}><Link to={`/stories/${r.slug}`} className="group flex gap-3"><img src={r.cover} alt="" className="h-14 w-20 shrink-0 rounded-md object-cover transition-transform group-hover:scale-105" /><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-gold-800">{r.category}</span><span className="line-clamp-2 text-[12.5px] font-bold leading-snug text-navy-900 group-hover:text-navy-600">{r.title}</span><span className="text-[10.5px] text-slate-500">{r.readTime} min · {r.views.toLocaleString("en-IN")} views</span></span></Link></li>)}</ul>
              <Link to="/stories" className="view-all mt-3">All stories <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="rounded-xl bg-navy-900 p-5 text-white shadow-[var(--shadow-card)]"><p className="text-[15px] font-bold">Have a story to tell?</p><p className="mt-1 text-[12px] text-white/75">Business members can publish stories and get featured on the WS Hub home page.</p><div className="mt-3 flex gap-2"><Link to="/stories?submit=1" className="flex-1 rounded-md bg-gold-500 py-2 text-center text-[12px] font-bold text-navy-900 hover:bg-gold-400">Submit story</Link><Link to="/membership" className="flex-1 rounded-md border border-white/40 py-2 text-center text-[12px] font-semibold text-white hover:bg-white/10">Membership</Link></div></div>
          </aside>
        </div>

        <section className="mt-12 mb-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-[19px] font-bold text-navy-800">Related Stories</h2><Link to={`/stories?category=${encodeURIComponent(s.category)}`} className="view-all">More in {s.category} <ArrowRight className="h-3.5 w-3.5" /></Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{relatedStories(s).map((r) => <StoryCard key={r.slug} s={r} />)}</div></section>
      </div>
      <ShareModal open={share} onClose={() => setShare(false)} title={s.title} path={`/stories/${s.slug}`} />
    </div>
  );
}
