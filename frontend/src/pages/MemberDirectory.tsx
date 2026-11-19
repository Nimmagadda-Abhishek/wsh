import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, ExternalLink, Globe2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { directoryApi, type ApiMeta, type DirectoryMember } from "../api";

type DirectoryKind = "founders" | "investors";
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "M";

export default function MemberDirectory({ kind }: { kind: DirectoryKind }) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const load = kind === "founders" ? directoryApi.founders(page) : directoryApi.investors(page);
    load.then((result) => {
      if (!active) return;
      setMembers(result.data); setMeta(result.meta);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Could not load member profiles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, page]);

  const title = kind === "founders" ? "Founders & Businesses" : "Investors & Mentors";
  const description = kind === "founders"
    ? "Meet approved founders and business owners in the WS Hub community."
    : "Connect with approved investors and mentors in the WS Hub community.";

  return <main className="page-in mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
    <header className="rounded-2xl bg-navy-900 px-6 py-9 text-white sm:px-9"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-gold-400">WS Hub community</p><h1 className="mt-2 text-[30px] font-black sm:text-[38px]">{title}</h1><p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/75">{description}</p>{meta && <p className="mt-4 text-[12px] text-white/70">{meta.total} approved {kind === "founders" ? "founders and businesses" : "investors and mentors"}</p>}</header>

    {error && <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}
    {loading ? <div className="py-16 text-center text-[13px] text-slate-500">Loading member profiles…</div> : members.length === 0 ? <section className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-400"/><h2 className="mt-3 text-[17px] font-bold text-navy-900">No approved profiles yet</h2><p className="mt-1 text-[13px] text-slate-600">Approved {kind === "founders" ? "founders and business owners" : "investors and mentors"} will appear here.</p></section> : <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => <article key={member.id} className="card flex flex-col p-5">
        <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-100 text-[14px] font-black text-navy-800">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(member.full_name)}</div><div className="min-w-0 flex-1"><h2 className="truncate text-[15px] font-bold text-navy-900">{member.full_name}</h2><p className="mt-0.5 text-[11px] font-semibold capitalize text-gold-800">{member.member_type}</p>{(member.city || member.country) && <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3"/>{[member.city, member.country].filter(Boolean).join(", ")}</p>}</div></div>
        <p className="mt-4 line-clamp-3 min-h-12 text-[12.5px] leading-relaxed text-slate-600">{member.bio || "WS Hub community member."}</p>
        {(member.email || member.phone) && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">{member.email && <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 text-navy-700 hover:underline"><Mail className="h-3 w-3"/>Email</a>}{member.phone && <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 text-navy-700 hover:underline"><Phone className="h-3 w-3"/>Call</a>}</div>}
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-500"><Building2 className="h-3.5 w-3.5"/>{kind === "investors" ? "Businesses & portfolio" : "Businesses"}</p>
          {member.businesses.length ? <ul className="space-y-2">{member.businesses.map((business) => <li key={business.id}><Link to={`/businesses/${business.slug}`} className="group flex items-center gap-2 text-[12px] font-semibold text-navy-800 hover:text-gold-800">{business.logo_url ? <img src={business.logo_url} alt="" className="h-7 w-7 rounded-md object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-50 text-[10px] font-black">{initials(business.name)}</span>}<span className="truncate">{business.name}</span><ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100"/></Link></li>)}</ul> : <p className="text-[11.5px] text-slate-500">No published business or portfolio links yet.</p>}
        </div>
        <Link to={`/members/${member.id}`} className="btn-navy mt-4 flex w-full items-center justify-center gap-1.5 py-2.5 text-[11.5px]">View member profile <ArrowRight className="h-3.5 w-3.5"/></Link>
      </article>)}
    </section>}

    {meta && meta.totalPages > 1 && <nav aria-label="Member pages" className="mt-7 flex items-center justify-between rounded-lg border border-line bg-white p-3 text-[12px] text-slate-600"><span>Page {meta.page} of {meta.totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40"><ArrowLeft className="h-3.5 w-3.5"/>Previous</button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40">Next<ArrowRight className="h-3.5 w-3.5"/></button></div></nav>}
  </main>;
}

export function MemberProfilePage() {
  const { id = "" } = useParams();
  const [member, setMember] = useState<DirectoryMember | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    directoryApi.member(id).then((result) => { if (active) setMember(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Member profile not found."); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="text-2xl font-black text-navy-900">Profile unavailable</h1><p className="mt-2 text-[13px] text-slate-600">{error}</p><Link to="/founders" className="btn-navy mt-5 inline-flex px-5 py-2.5">Browse members</Link></main>;
  if (!member) return <main className="mx-auto max-w-2xl px-4 py-16 text-center text-[13px] text-slate-500">Loading profile…</main>;

  const directory = member.member_type === "investor" || member.member_type === "mentor" ? "/investors" : "/founders";
  const socialLinks = Object.entries(member.social_links || {}).filter(([, url]) => typeof url === "string" && /^https?:\/\//i.test(url));
  return <main className="page-in mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-8">
    <Link to={directory} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-navy-700 hover:underline"><ArrowLeft className="h-3.5 w-3.5"/>Back to directory</Link>
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="card p-5 sm:p-6">
        <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl bg-navy-100 text-3xl font-black text-navy-800">{member.avatar_url ? <img src={member.avatar_url} alt={`${member.full_name} profile`} className="h-full w-full object-cover"/> : initials(member.full_name)}</div>
        <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-wide text-gold-800">{member.member_type}</p>
        <h1 className="mt-1 text-center text-[22px] font-black text-navy-900">{member.full_name}</h1>
        {(member.city || member.country) && <p className="mt-2 flex items-center justify-center gap-1 text-[12px] text-slate-500"><MapPin className="h-3.5 w-3.5"/>{[member.city, member.country].filter(Boolean).join(", ")}</p>}
        <div className="mt-5 border-t border-line pt-4"><h2 className="text-[12px] font-bold text-navy-900">Contact</h2><div className="mt-3 space-y-2.5">{member.email && <a href={`mailto:${member.email}`} className="flex items-center gap-2 break-all text-[12px] text-navy-700 hover:underline"><Mail className="h-4 w-4 shrink-0"/>{member.email}</a>}{member.phone && <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-[12px] text-navy-700 hover:underline"><Phone className="h-4 w-4 shrink-0"/>{member.phone}</a>}{!member.email && !member.phone && <p className="text-[11.5px] text-slate-500">Contact details have not been added yet.</p>}</div></div>
        {socialLinks.length > 0 && <div className="mt-5 border-t border-line pt-4"><h2 className="text-[12px] font-bold text-navy-900">Online profiles</h2><ul className="mt-2 space-y-2">{socialLinks.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[12px] capitalize text-navy-700 hover:underline"><Globe2 className="h-3.5 w-3.5"/>{name === "x" ? "X (Twitter)" : name}<ExternalLink className="h-3 w-3"/></a></li>)}</ul></div>}
      </aside>
      <div className="space-y-5">
        <section className="card p-5 sm:p-7"><h2 className="text-[17px] font-bold text-navy-900">About {member.full_name.split(" ")[0]}</h2><p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{member.bio || "This member has not added a profile synopsis yet."}</p></section>
        <section><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-[20px] font-black text-navy-900">{directory === "/investors" ? "Businesses & portfolio" : "Businesses"}</h2><p className="mt-1 text-[12px] text-slate-500">Published listings linked to this member.</p></div><span className="rounded-full bg-navy-50 px-3 py-1 text-[10.5px] font-bold text-navy-700">{member.businesses.length} listed</span></div>
          {member.businesses.length ? <div className="mt-4 grid gap-4">{member.businesses.map((business) => <article key={business.id} className="card overflow-hidden"><div className="flex flex-col sm:flex-row">{business.logo_url ? <img src={business.logo_url} alt={`${business.name} logo`} className="h-36 w-full object-cover sm:h-auto sm:w-44"/> : <div className="flex h-28 w-full items-center justify-center bg-navy-50 text-navy-700 sm:h-auto sm:w-44"><Building2 className="h-8 w-8"/></div>}<div className="min-w-0 flex-1 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-gold-800">{business.city || "WS Hub business"}</p><h3 className="mt-1 text-[16px] font-bold text-navy-900">{business.name}</h3><p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-slate-600">{business.description || "Business profile and portfolio details are available on its listing."}</p><Link to={`/businesses/${business.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-navy-700 hover:underline">View business profile<ArrowRight className="h-3.5 w-3.5"/></Link></div></div></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-7 text-center text-[12.5px] text-slate-500">No published business or portfolio listings are linked to this profile yet.</p>}
        </section>
      </div>
    </div>
  </main>;
}
