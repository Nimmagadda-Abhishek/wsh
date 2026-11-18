import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "../utils/cn";

export interface ProfileTab {
  id: string;
  label: string;
  content: ReactNode;
  subtitle?: string;
}
interface Props {
  cover: string;
  crumbs: { label: string; to?: string }[];
  avatar: ReactNode;
  title: string;
  verified?: boolean;
  subtitle?: ReactNode;
  meta: ReactNode;
  badges?: ReactNode;
  actions: ReactNode;
  topRight: ReactNode;
  tabs: ProfileTab[];
  sidebar: ReactNode;
  related?: { title: string; subtitle?: string; to: string; children: ReactNode };
  footer?: ReactNode;
  stickyActions?: ReactNode;
}

export function ProfileShell(p: Props) {
  const [active, setActive] = useState(p.tabs[0]?.id);
  const tabIds = p.tabs.map((t) => t.id).join(",");

  useEffect(() => {
    const els = p.tabs.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-130px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div className={cn("page-in lg:pb-0", p.stickyActions ? "pb-36" : "pb-20")}>
      <div className="relative z-0 h-[200px] overflow-hidden bg-navy-900 sm:h-[260px] lg:h-[300px]">
        <img src={p.cover} alt="" className="ken-burns h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-navy-950/40" />
        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/85">
              {p.crumbs.map((c, i) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  {c.to ? <Link to={c.to} className="hover:text-white">{c.label}</Link> : <span className="max-w-[180px] truncate font-semibold text-white">{c.label}</span>}
                </span>
              ))}
            </nav>
          </div>
        </div>
        <div className="absolute right-4 top-4 flex gap-2 sm:right-6 lg:right-8">{p.topRight}</div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-12 rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:-mt-14 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {p.avatar}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-black leading-tight tracking-tight text-navy-900 sm:text-[30px]">{p.title}</h1>
                  {p.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-navy-800 px-2.5 py-1 text-[10px] font-semibold text-white">
                      <BadgeCheck className="h-3 w-3 text-gold-400" strokeWidth={2.4} /> Verified
                    </span>
                  )}
                </div>
                {p.subtitle && <p className="mt-1 text-[13.5px] font-medium text-slate-700">{p.subtitle}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500">{p.meta}</div>
                {p.badges && <div className="mt-2.5 flex flex-wrap gap-1.5">{p.badges}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:max-w-[400px] md:justify-end">{p.actions}</div>
          </div>
        </div>
      </div>

      <div className="sticky top-[60px] z-30 mt-5 border-y border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto hide-scrollbar" aria-label="Profile sections">
            {p.tabs.map((t) => (
              <button key={t.id} type="button" onClick={() => jump(t.id)} aria-current={active === t.id ? "true" : undefined} className={cn("relative shrink-0 px-4 py-3.5 text-[13px] font-semibold transition-colors", active === t.id ? "text-navy-900" : "text-slate-500 hover:text-navy-800")}>
                {t.label}
                <span className={cn("absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-gold-500 transition-transform duration-300", active === t.id ? "scale-x-100" : "scale-x-0")} />
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {p.tabs.map((t) => (
              <Reveal key={t.id} as="section" className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
                <div id={t.id} className="scroll-mt-[128px]" />
                <h2 className="text-[18px] font-bold text-navy-900">{t.label}</h2>
                {t.subtitle && <p className="mt-0.5 text-[12.5px] text-slate-500">{t.subtitle}</p>}
                <div className="mt-4">{t.content}</div>
              </Reveal>
            ))}
          </div>
          <aside className="space-y-5 lg:sticky lg:top-[124px] lg:self-start">{p.sidebar}</aside>
        </div>

        {p.related && (
          <section className="mt-12 mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[19px] font-bold text-navy-800">{p.related.title}</h2>
                {p.related.subtitle && <p className="text-[12px] text-slate-500">{p.related.subtitle}</p>}
              </div>
              <Link to={p.related.to} className="view-all">View All <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            {p.related.children}
          </section>
        )}
      </div>
      {p.footer}
      {p.stickyActions && (
        <div className="fixed inset-x-0 bottom-[57px] z-40 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden" role="region" aria-label="Primary actions">
          <div className="flex gap-2 [&>*]:flex-1 [&>*]:justify-center">{p.stickyActions}</div>
        </div>
      )}
    </div>
  );
}

/* Reusable bits for profile bodies */
export function SideCard({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]", className)}>
      {title && <h3 className="text-[14px] font-bold text-navy-900">{title}</h3>}
      <div className={title ? "mt-3" : ""}>{children}</div>
    </div>
  );
}
export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="space-y-2.5 text-[12.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line pb-2 last:border-0">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-right font-semibold text-navy-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Tag({ children, to }: { children: ReactNode; to?: string }) {
  const cls = "rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-navy-800 hover:text-white";
  return to ? <Link to={to} className={cls}>{children}</Link> : <span className={cls}>{children}</span>;
}
export function Timeline({ items }: { items: { year: string; title: string; type: string; description: string }[] }) {
  return (
    <ol className="relative ml-3 border-l-2 border-navy-100 pl-6">
      {items.map((a) => (
        <li key={a.title} className="relative pb-6 last:pb-0">
          <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-gold-500 ring-4 ring-white" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-gold-800">{a.year}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{a.type}</span>
          </div>
          <h3 className="mt-1 text-[13.5px] font-bold text-navy-900">{a.title}</h3>
          <p className="mt-0.5 text-[12px] text-slate-600">{a.description}</p>
        </li>
      ))}
    </ol>
  );
}
export function Avatar({ initials, color, size = "xl" }: { initials: string; color: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = { sm: "h-10 w-10 text-xs", md: "h-14 w-14 text-base", lg: "h-[72px] w-[72px] text-xl", xl: "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl" }[size];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-black tracking-tight text-white ring-4 ring-white shadow-md", dims)} style={{ background: color }} aria-hidden="true">
      {initials}
    </span>
  );
}
export function LockedNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[12.5px] text-slate-600">
      🔒 {text}{" "}
      <Link to="/login" className="font-semibold text-navy-700 hover:underline">Sign in</Link>
    </div>
  );
}
