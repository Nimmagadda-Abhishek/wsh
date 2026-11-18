import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronRight, Eye, Heart, PenSquare, Search, X } from "lucide-react";
import { fmtStoryDate, stories, storyCategories, type Story } from "../stories";
import { Reveal } from "../components/Reveal";
import { Avatar } from "../components/ProfileShell";
import { Gate, SaveBtn, ShareBtn, Success } from "../components/ui/Actions";
import { ChoiceGroup, Field, inputCls, Modal, PrimaryBtn, SecondaryBtn, textareaCls } from "../components/ui/Modal";
import { addRecentSearch, submitStory, useStore } from "../store";
import { cn } from "../utils/cn";

export function StoryCard({ s, size = "md" }: { s: Story; size?: "sm" | "md" | "lg" }) {
  const liked = useStore((x) => x.storyLikes.includes(s.slug));
  return (
    <article className={cn("card group relative flex overflow-hidden", size === "lg" ? "flex-col" : "flex-col")}>
      <Link to={`/stories/${s.slug}`} className={cn("relative block overflow-hidden", size === "lg" ? "aspect-[16/9]" : "aspect-[16/9]")}>
        <img src={s.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-md bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-navy-900">{s.category}</span>
        {/* hover preview */}
        <p className="absolute inset-x-3 bottom-3 translate-y-2 text-[12px] leading-snug text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 line-clamp-2">{s.excerpt}</p>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className={cn("font-bold leading-snug text-navy-900", size === "lg" ? "text-[20px]" : "text-[15px]")}><Link to={`/stories/${s.slug}`} className="hover:text-navy-600">{s.title}</Link></h3>
        <div className="mt-2 flex items-center gap-2 text-[11.5px] text-slate-500"><Avatar initials={s.author.initials} color={s.author.color} size="sm" /><span className="min-w-0"><span className="block font-semibold text-navy-900">{s.author.name}</span><span>{fmtStoryDate(s.date)} · {s.readTime} min read</span></span></div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-3"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {s.views.toLocaleString("en-IN")}</span><span className={cn("inline-flex items-center gap-1", liked && "text-red-600")}><Heart className="h-3 w-3" fill={liked ? "currentColor" : "none"} /> {s.likes + (liked ? 1 : 0)}</span></span>
          <span className="flex items-center gap-1.5"><Link to={`/stories/${s.slug}`} className="rounded-md bg-navy-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-navy-700">Read</Link><SaveBtn type="story" slug={s.slug} /><ShareBtn title={s.title} path={`/stories/${s.slug}`} /></span>
        </div>
      </div>
    </article>
  );
}

export function SubmitStoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(""); const [category, setCategory] = useState("Startup Story"); const [content, setContent] = useState(""); const [tags, setTags] = useState(""); const [img, setImg] = useState<string>(); const [preview, setPreview] = useState(false); const [done, setDone] = useState(false);
  const submit = (publish: boolean) => { submitStory({ title, category, excerpt: content.slice(0, 140), tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }, publish); setDone(true); };
  return (
    <Modal open={open} onClose={onClose} title="Submit your story" subtitle="Reviewed by the WS Hub editorial team within 2 days" size="lg">
      <Gate reason="Sign in to publish a story.">
        {done ? <Success title="Story submitted" body="Track approval status under Dashboard → Stories. Once approved it appears on the Stories page and in followers' alerts." to="/dashboard?tab=stories" onClose={onClose} /> : preview ? (
          <div><span className="rounded-md bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-navy-900">{category}</span><h3 className="mt-2 text-[22px] font-black text-navy-900">{title || "Untitled"}</h3><p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700">{content}</p><div className="mt-3 flex flex-wrap gap-1.5">{tags.split(",").filter(Boolean).map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px]">{t.trim()}</span>)}</div><div className="mt-5 flex gap-2"><SecondaryBtn onClick={() => setPreview(false)}>Edit</SecondaryBtn><PrimaryBtn type="button" onClick={() => submit(true)} className="flex-1">Publish for review</PrimaryBtn></div></div>
        ) : (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); setPreview(true); }} className="space-y-4">
            <Field label="Title" htmlFor="st-title"><input id="st-title" required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A headline that tells the story" /></Field>
            <Field label="Category"><ChoiceGroup options={storyCategories.slice(0, 9)} value={category} onChange={setCategory} name="Category" /></Field>
            <Field label="Cover image"><label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 px-3 py-3 text-[12.5px] text-slate-600 hover:border-navy-700 hover:bg-navy-50"><span className="flex-1 truncate">{img ?? "Upload cover (JPG/PNG, 1600×900)"}</span><input type="file" accept="image/*" className="sr-only" onChange={(e) => setImg(e.target.files?.[0]?.name)} /></label></Field>
            <Field label="Content" htmlFor="st-content" hint="Markdown supported. Add quotes, numbers and images — stories with data get 3× more reads."><textarea id="st-content" required rows={7} className={textareaCls} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
            <Field label="Tags" htmlFor="st-tags"><input id="st-tags" className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AgriTech, Funding, Warangal" /></Field>
            <div className="flex gap-2"><SecondaryBtn onClick={() => submit(false)} className="flex-1">Save draft</SecondaryBtn><PrimaryBtn className="flex-1">Preview</PrimaryBtn></div>
          </form>
        )}
      </Gate>
    </Modal>
  );
}

export default function Stories() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || ""; const cat = params.get("category") || ""; const sort = params.get("sort") || "latest";
  const [query, setQuery] = useState(q); const [submit, setSubmit] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => setQuery(q), [q]);
  useEffect(() => { document.title = "Stories — WS Hub"; }, []);
  useEffect(() => { if (params.get("submit") === "1") { setSubmit(true); const n = new URLSearchParams(params); n.delete("submit"); setParams(n, { replace: true }); } }, [params, setParams]);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 280); return () => clearTimeout(t); }, [params]);
  const update = (patch: Record<string, string | undefined>) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setParams(n); };

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return ([] as Story[]).filter((x) => (!cat || x.category === cat) && (!s || [x.title, x.excerpt, x.category, x.author.name, x.author.company, ...x.tags].join(" ").toLowerCase().includes(s)))
      .sort((a, b) => (sort === "popular" ? b.views - a.views : sort === "liked" ? b.likes - a.likes : b.date.localeCompare(a.date)));
  }, [q, cat, sort]);
  const featured = ([] as Story[]).filter((s) => s.featured);
  const showFeatured = !q && !cat;

  return (
    <div className="page-in pb-20 lg:pb-0">
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0"><div className="absolute inset-y-0 right-0 w-full md:w-[55%]"><img src="/images/hero.jpg" alt="" className="h-full w-full object-cover" /></div><div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/30 md:via-45%" /></div>
        <div className="relative mx-auto max-w-[1280px] px-4 pb-8 pt-7 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/80"><Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" /><span className="font-semibold text-white">Stories</span></nav>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div><h1 className="text-[38px] font-black leading-none tracking-tight sm:text-[50px]">Stories That <span className="text-gold-500">Inspire</span></h1><p className="mt-3 max-w-[560px] text-[15px] text-white/90">Real journeys, local voices and ideas that make Warangal stronger. Entrepreneurs · Innovation · Success · Community.</p></div>
            <button type="button" onClick={() => setSubmit(true)} className="inline-flex items-center gap-2 self-start rounded-md bg-gold-500 px-5 py-3 text-[13px] font-bold text-navy-900 hover:bg-gold-400 lg:self-end"><PenSquare className="h-4 w-4" /> Submit Your Story</button>
          </div>
          <form role="search" onSubmit={(e) => { e.preventDefault(); addRecentSearch(query); update({ q: query.trim() || undefined }); }} className="mt-6 flex max-w-[800px] overflow-hidden rounded-lg bg-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.6)] focus-within:ring-2 focus-within:ring-gold-400/80">
            <span className="flex items-center pl-4 pr-3 text-navy-800"><Search className="h-[18px] w-[18px]" /></span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories by title, founder, startup or topic..." aria-label="Search stories" className="h-12 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-slate-400 focus:outline-none" />{query && <button type="button" aria-label="Clear" onClick={() => { setQuery(""); update({ q: undefined }); }} className="px-2 text-slate-400"><X className="h-4 w-4" /></button>}<button type="submit" className="bg-gold-500 px-6 text-[13.5px] font-semibold text-navy-900 hover:bg-gold-400">Search</button>
          </form>
        </div>
      </section>

      <div className="border-b border-line bg-white"><div className="mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto px-4 py-3 hide-scrollbar sm:px-6 lg:px-8">
        <button type="button" onClick={() => update({ category: undefined })} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium", !cat ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-navy-700")}>All</button>
        {storyCategories.map((c) => <button key={c} type="button" onClick={() => update({ category: cat === c ? undefined : c })} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition-all hover:-translate-y-0.5", cat === c ? "border-gold-500 bg-gold-100 text-gold-800" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-navy-700")}>{c}</button>)}
      </div></div>

      <div className="mx-auto max-w-[1280px] px-4 pt-7 sm:px-6 lg:px-8">
        {showFeatured && (
          <Reveal>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-[19px] font-bold text-navy-800">Featured Stories</h2><button type="button" onClick={() => update({ sort: "popular" })} className="view-all">View All <ArrowRight className="h-3.5 w-3.5" /></button></div>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <StoryCard s={featured[0]} size="lg" />
              <div className="grid gap-4">{featured.slice(1, 3).map((s) => (
                <Link key={s.slug} to={`/stories/${s.slug}`} className="card group flex gap-4 p-3"><img src={s.cover} alt="" className="h-24 w-32 shrink-0 rounded-lg object-cover transition-transform duration-500 group-hover:scale-105" /><div className="min-w-0"><span className="rounded-md bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-gold-800">{s.category}</span><h3 className="mt-1.5 text-[14.5px] font-bold leading-snug text-navy-900 group-hover:text-navy-600">{s.title}</h3><p className="mt-1 text-[11px] text-slate-500">{s.readTime} min read · {fmtStoryDate(s.date)}</p></div></Link>
              ))}</div>
            </div>
          </Reveal>
        )}

        <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[19px] font-bold text-navy-800">{cat || (q ? `Results for “${q}”` : "Latest Stories")}</h2><p className="text-[12px] text-slate-500">{list.length} {list.length === 1 ? "story" : "stories"}</p></div>
          <select aria-label="Sort" className="select h-9 w-auto min-w-[150px] text-[12px]" value={sort} onChange={(e) => update({ sort: e.target.value === "latest" ? undefined : e.target.value })}><option value="latest">Latest</option><option value="popular">Most Read</option><option value="liked">Most Liked</option></select>
        </div>
        {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-xl border border-line bg-white"><div className="aspect-[16/9] rounded-t-xl bg-slate-200" /><div className="space-y-2 p-4"><div className="h-4 w-4/5 rounded bg-slate-200" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div></div>)}</div>
          : list.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-[16px] font-bold text-navy-900">No stories found</h3><p className="mt-1 text-[13px] text-slate-500">Try another category — or write the first one on this topic.</p><div className="mt-4 flex justify-center gap-2"><button type="button" onClick={() => setParams({})} className="btn-navy px-5 py-2.5">Clear filters</button><button type="button" onClick={() => setSubmit(true)} className="rounded-md border border-slate-300 px-5 py-2.5 text-xs font-semibold text-navy-800">Submit a story</button></div></div>
          : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{list.map((s, i) => <Reveal key={s.slug} delay={i * 50}><StoryCard s={s} /></Reveal>)}</div>}

        <Reveal className="my-10 grid gap-4 md:grid-cols-3">
          {[{ t: "Meet the founders", d: "Every story links to the people behind it.", to: "/founders", c: "bg-navy-900 text-white" }, { t: "Attend an event", d: "Hear these stories live at meetups and panels.", to: "/events", c: "bg-white border border-line text-navy-900" }, { t: "Publish with Business+", d: "Members can publish stories and get featured on the home page.", to: "/membership", c: "bg-gold-500 text-navy-900" }].map((x) => (
            <Link key={x.t} to={x.to} className={cn("card flex items-center justify-between gap-3 rounded-xl p-5", x.c)}><span><span className="block text-[15px] font-bold">{x.t}</span><span className="block text-[12px] opacity-80">{x.d}</span></span><ArrowRight className="h-5 w-5 shrink-0" /></Link>
          ))}
        </Reveal>
      </div>
      <SubmitStoryModal open={submit} onClose={() => setSubmit(false)} />
    </div>
  );
}
