import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CheckCircle2, Copy, Flag, Handshake, Link2, Mail, Paperclip, Share2, UserPlus, Users } from "lucide-react";
import { useEffect } from "react";
import {
  applicationFor,
  applyToOpportunity,
  connectionWith,
  expressInterest,
  report,
  requestInfo,
  requestIntro,
  requestMeeting,
  sendConnection,
  toast,
  toggleSaved,
  track,
  useStore,
  type Role,
  type SavedType,
} from "../../store";
import { Calendar, HelpCircle } from "lucide-react";

/* ---------- analytics: page views ---------- */
export function useTrackView(entity: string) {
  useEffect(() => {
    track("views", entity);
  }, [entity]);
}
import { founders } from "../../founders";
import { AuthForm } from "./AuthForm";
import { ChoiceGroup, Field, inputCls, Modal, PrimaryBtn, SecondaryBtn, textareaCls } from "./Modal";
import { WhatsAppIcon } from "../BusinessCard";
import { cn } from "../../utils/cn";

/* ---------- Auth gate: protected actions show the sign-in form first ---------- */
export function Gate({ reason, children }: { reason: string; children: ReactNode }) {
  const user = useStore((s) => s.user);
  if (!user) return <AuthForm reason={reason} />;
  return <>{children}</>;
}

/* ---------- Success ---------- */
export function Success({ title, body, to, toLabel = "Track in Dashboard", onClose }: { title: string; body: string; to?: string; toLabel?: string; onClose: () => void }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2 className="h-9 w-9 text-verified" />
      </span>
      <h3 className="mt-4 text-[17px] font-bold text-navy-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-600">{body}</p>
      <div className="mt-6 flex justify-center gap-2">
        <SecondaryBtn onClick={onClose}>Close</SecondaryBtn>
        {to && (
          <Link to={to} onClick={onClose} className="inline-flex items-center rounded-md bg-navy-800 px-4 py-3 text-[13px] font-semibold text-white hover:bg-navy-700">
            {toLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------- Save ---------- */
export function SaveBtn({ type, slug, className, label }: { type: SavedType; slug: string; className?: string; label?: boolean }) {
  const saved = useStore((s) => s.saved[type]).includes(slug);
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(type, slug);
        setPop(true);
        setTimeout(() => setPop(false), 450);
      }}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-white text-navy-800 shadow-sm transition-all duration-300 hover:shadow-md",
        label ? "px-3 text-[12px] font-semibold" : "w-9",
        saved ? "border-gold-500 text-gold-600" : "border-slate-200",
        pop && "animate-[bookmark-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)]",
        className,
      )}
    >
      <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} strokeWidth={2.2} />
      {label && (saved ? "Saved" : "Save")}
    </button>
  );
}

/* ---------- Share ---------- */
export function ShareModal({ open, onClose, title, path }: { open: boolean; onClose: () => void; title: string; path: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#${path}` : path;
  const enc = encodeURIComponent;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      track("shares", path);
      toast("Link copied to clipboard");
    } catch {
      toast("Could not copy link", "error");
    }
  };
  const items = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, icon: <Link2 className="h-5 w-5" />, cls: "bg-[#0a66c2]" },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} — ${url}`)}`, icon: <WhatsAppIcon className="h-5 w-5" />, cls: "bg-[#25d366]" },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(url)}`, icon: <Mail className="h-5 w-5" />, cls: "bg-navy-800" },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Share" subtitle={title} size="sm">
      <div className="grid grid-cols-4 gap-3">
        {items.map((i) => (
          <a key={i.label} href={i.href} target="_blank" rel="noreferrer" onClick={() => track("shares", path)} className="group flex flex-col items-center gap-2 text-[11px] font-medium text-slate-700">
            <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform group-hover:-translate-y-1", i.cls)}>{i.icon}</span>
            {i.label}
          </a>
        ))}
        <button type="button" onClick={copy} className="group flex flex-col items-center gap-2 text-[11px] font-medium text-slate-700">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-navy-900 transition-transform group-hover:-translate-y-1">
            <Copy className="h-5 w-5" />
          </span>
          Copy Link
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-600">{url}</span>
        <button type="button" onClick={copy} className="text-[11.5px] font-bold text-navy-700 hover:underline">Copy</button>
      </div>
    </Modal>
  );
}

export function ShareBtn({ title, path, className }: { title: string; path: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Share" onClick={() => setOpen(true)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-navy-800 shadow-sm transition-all hover:shadow-md", className)}>
        <Share2 className="h-4 w-4" />
      </button>
      <ShareModal open={open} onClose={() => setOpen(false)} title={title} path={path} />
    </>
  );
}

/* ---------- Report ---------- */
const reportReasons = ["Spam", "Fake", "Duplicate", "Abuse"] as const;
export function ReportBtn({ targetType, targetSlug, className }: { targetType: string; targetSlug: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reportReasons)[number]>("Spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    report(targetType, targetSlug, `${reason}: ${details}`);
    setDone(true);
  };
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:text-red-600", className)}>
        <Flag className="h-3.5 w-3.5" /> Report
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Report profile" subtitle="Help us keep WS Hub trustworthy" size="sm">
        {done ? (
          <Success title="Report submitted" body="Our trust & safety team reviews every report within 48 hours." onClose={() => setOpen(false)} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Reason"><ChoiceGroup options={[...reportReasons]} value={reason} onChange={setReason} name="Reason" cols={2} /></Field>
            <Field label="Details (optional)" htmlFor="rep-details">
              <textarea id="rep-details" rows={3} className={textareaCls} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us more…" />
            </Field>
            <PrimaryBtn className="bg-red-600 text-white hover:bg-red-500 hover:shadow-none">Submit report</PrimaryBtn>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ---------- Connect (founders) ---------- */
const relationships: Role[] = ["Founder", "Investor", "Business", "Mentor", "Student", "Professional"];
export function ConnectBtn({ founderSlug, founderName, className, size = "md" }: { founderSlug: string; founderName: string; className?: string; size?: "sm" | "md" }) {
  const conn = useStore((s) => connectionWith(s, founderSlug));
  const user = useStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [rel, setRel] = useState<Role>(user?.role ?? "Founder");
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    sendConnection(founderSlug, founderName, msg, rel);
    setDone(true);
  };
  const base = cn("inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all", size === "sm" ? "px-3 py-2 text-[11.5px]" : "px-4 py-2.5 text-[12.5px]");
  if (conn) {
    return (
      <span className={cn(base, conn.status === "Accepted" ? "bg-emerald-50 text-emerald-700" : conn.status === "Rejected" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600", className)}>
        <Users className="h-3.5 w-3.5" /> {conn.status === "Accepted" ? "Connected" : conn.status === "Rejected" ? "Declined" : "Pending"}
      </span>
    );
  }
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={cn(base, "bg-navy-800 text-white hover:bg-navy-700 hover:shadow-[0_8px_18px_-8px_rgba(15,42,92,0.7)]", className)}>
        <UserPlus className="h-3.5 w-3.5" /> Connect
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Send Connection Request" subtitle={`to ${founderName}`}>
        <Gate reason={`Sign in to connect with ${founderName}.`}>
          {done ? (
            <Success title="Request sent" body={`${founderName} will be notified. You'll get an alert when they respond — status is Pending until then.`} to="/dashboard?tab=requests" onClose={() => setOpen(false)} />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Personal message" htmlFor="conn-msg" hint="Requests with a specific reason are accepted 3× more often.">
                <textarea id="conn-msg" required rows={4} className={textareaCls} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`Hi ${founderName.split(" ")[0]}, I'd love to connect because…`} />
              </Field>
              <Field label="I'm reaching out as a"><ChoiceGroup options={relationships} value={rel} onChange={setRel} name="Relationship" /></Field>
              <div className="flex gap-2">
                <SecondaryBtn onClick={() => setOpen(false)} className="flex-1">Cancel</SecondaryBtn>
                <PrimaryBtn className="flex-1">Send</PrimaryBtn>
              </div>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Request Introduction ---------- */
const introVia = ["WS Hub Team", "Mutual Member", "Business", "Investor"] as const;
const introPurpose = ["Partnership", "Investment", "Mentorship", "Hiring", "Customer", "Advice"] as const;
export function IntroBtn({ targetType, targetSlug, targetName, className, size = "md", variant = "outline" }: { targetType: "founder" | "investor"; targetSlug: string; targetName: string; className?: string; size?: "sm" | "md"; variant?: "outline" | "gold" }) {
  const existing = useStore((s) => s.intros).find((i) => i.targetSlug === targetSlug);
  const [open, setOpen] = useState(false);
  const [via, setVia] = useState<(typeof introVia)[number]>("WS Hub Team");
  const [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState<(typeof introPurpose)[number]>("Partnership");
  const [outcome, setOutcome] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    requestIntro(targetType, targetSlug, targetName, via, reason, purpose, outcome);
    setDone(true);
  };
  const base = cn("inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all", size === "sm" ? "px-3 py-2 text-[11.5px]" : "px-4 py-2.5 text-[12.5px]");
  return (
    <>
      <button
        type="button"
        onClick={() => { setDone(false); setOpen(true); }}
        className={cn(base, variant === "gold" ? "bg-gold-500 text-navy-900 hover:bg-gold-400" : "border border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50", existing && "opacity-80", className)}
      >
        <Handshake className="h-3.5 w-3.5" /> {existing ? "Intro requested" : "Request Intro"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request Introduction" subtitle={`to ${targetName}`}>
        <Gate reason="Sign in to request a warm introduction.">
          {done ? (
            <Success title="Introduction requested" body={`${via} will review your request and make the introduction if there's a fit. Typical turnaround: 3–5 days.`} to="/dashboard?tab=requests" onClose={() => setOpen(false)} />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Who should introduce you?"><ChoiceGroup options={[...introVia]} value={via} onChange={setVia} name="Via" cols={2} /></Field>
              <Field label="Purpose"><ChoiceGroup options={[...introPurpose]} value={purpose} onChange={setPurpose} name="Purpose" /></Field>
              <Field label="Reason" htmlFor="intro-reason">
                <textarea id="intro-reason" required rows={3} className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What would you like to discuss, and why now?" />
              </Field>
              <Field label="Expected outcome" htmlFor="intro-outcome" hint="e.g. a 20-minute call, a pilot, feedback on our deck">
                <input id="intro-outcome" required className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What does success look like?" />
              </Field>
              <PrimaryBtn>Submit request</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Interested Startup (investors) ---------- */
export function InterestedBtn({ investorSlug, investorName, className, size = "md" }: { investorSlug: string; investorName: string; className?: string; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const [startup, setStartup] = useState("");
  const [custom, setCustom] = useState("");
  const [msg, setMsg] = useState("");
  const [pitch, setPitch] = useState<string | undefined>();
  const [profile, setProfile] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const startups = founders.map((f) => f.company);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    expressInterest(investorSlug, investorName, startup === "__other" ? custom : startup, msg, pitch, profile);
    setDone(true);
  };
  const base = cn("inline-flex items-center justify-center gap-1.5 rounded-md bg-navy-800 font-semibold text-white transition-all hover:bg-navy-700 hover:shadow-[0_8px_18px_-8px_rgba(15,42,92,0.7)]", size === "sm" ? "px-3 py-2 text-[11.5px]" : "px-4 py-2.5 text-[12.5px]");
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={cn(base, className)}>
        <Handshake className="h-3.5 w-3.5" /> Interested Startup
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Share a startup" subtitle={`with ${investorName}`}>
        <Gate reason="Sign in to share your startup with investors.">
          {done ? (
            <Success title="Shared with investor" body={`${investorName} will receive your pitch. You'll be notified when they view it or request a meeting.`} to="/dashboard?tab=requests" onClose={() => setOpen(false)} />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Select startup" htmlFor="int-startup">
                <select id="int-startup" required className="select" value={startup} onChange={(e) => setStartup(e.target.value)}>
                  <option value="">Choose…</option>
                  {startups.map((s) => <option key={s}>{s}</option>)}
                  <option value="__other">Other / my startup</option>
                </select>
              </Field>
              {startup === "__other" && (
                <Field label="Startup name" htmlFor="int-custom"><input id="int-custom" required className={inputCls} value={custom} onChange={(e) => setCustom(e.target.value)} /></Field>
              )}
              <Field label="Message" htmlFor="int-msg">
                <textarea id="int-msg" required rows={4} className={textareaCls} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Traction, round size, why this investor…" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Attach pitch deck">
                  <label className={cn("flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 text-[12.5px] transition-colors hover:border-navy-700 hover:bg-navy-50", pitch ? "border-verified bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600")}>
                    <Paperclip className="h-4 w-4" />
                    <span className="flex-1 truncate">{pitch ?? "PDF (max 10 MB)"}</span>
                    <input type="file" accept=".pdf" className="sr-only" onChange={(e) => setPitch(e.target.files?.[0]?.name)} />
                  </label>
                </Field>
                <Field label="Attach company profile">
                  <label className={cn("flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 text-[12.5px] transition-colors hover:border-navy-700 hover:bg-navy-50", profile ? "border-verified bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600")}>
                    <Paperclip className="h-4 w-4" />
                    <span className="flex-1 truncate">{profile ?? "PDF / one-pager"}</span>
                    <input type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => setProfile(e.target.files?.[0]?.name)} />
                  </label>
                </Field>
              </div>
              <PrimaryBtn>Submit</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Apply (opportunities) ---------- */
const attachmentKinds = ["Resume", "Pitch Deck", "Proposal", "Portfolio"] as const;
export function ApplyBtn({ slug, title, closed, className, size = "md", similarTo }: { slug: string; title: string; closed?: boolean; className?: string; size?: "sm" | "md"; similarTo?: string }) {
  const [shareOpen, setShareOpen] = useState(false);
  const app = useStore((s) => applicationFor(s, slug));
  const user = useStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [why, setWhy] = useState("");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const base = cn("inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all", size === "sm" ? "px-3 py-2 text-[11.5px]" : "px-5 py-2.5 text-[12.5px]");
  if (app) {
    return (
      <Link to="/dashboard?tab=applications" className={cn(base, "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", className)}>
        <CheckCircle2 className="h-3.5 w-3.5" /> {app.status}
      </Link>
    );
  }
  if (closed) return <span className={cn(base, "bg-slate-100 text-slate-500", className)}>Closed</span>;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    applyToOpportunity({ opportunitySlug: slug, opportunityTitle: title, name, company, role, why, attachments: Object.entries(files).map(([k, v]) => `${k}: ${v}`) });
    setDone(true);
  };
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setName(user?.name ?? name); setOpen(true); }} className={cn(base, "bg-gold-500 text-navy-900 hover:bg-gold-400 hover:shadow-[0_10px_20px_-10px_rgba(226,176,74,0.9)]", className)}>
        Apply
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Apply" subtitle={title}>
        <Gate reason="Sign in to apply for this opportunity.">
          {done ? (
            <div>
              <Success title="Application submitted" body="Track status in Dashboard — you'll be notified when you're shortlisted or a meeting is scheduled." to="/dashboard?tab=applications" onClose={() => setOpen(false)} />
              <div className="flex justify-center gap-4 border-t border-line pt-4 text-[12.5px] font-semibold">
                <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 text-navy-700 hover:underline"><Share2 className="h-4 w-4" /> Share opportunity</button>
                <Link to={similarTo ?? "/opportunities"} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 text-navy-700 hover:underline">Explore similar →</Link>
              </div>
              <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} title={title} path={`/opportunities/${slug}`} />
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="ap-name"><input id="ap-name" required className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Company" htmlFor="ap-co"><input id="ap-co" required className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Startup or business" /></Field>
              </div>
              <Field label="Role" htmlFor="ap-role"><input id="ap-role" required className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder, Director, Engineer…" /></Field>
              <Field label="Why are you interested?" htmlFor="ap-why">
                <textarea id="ap-why" required rows={4} className={textareaCls} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Relevant experience, capacity, timeline…" />
              </Field>
              <Field label="Attachments">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {attachmentKinds.map((k) => (
                    <label key={k} className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-2 py-3 text-center text-[11.5px] transition-colors hover:border-navy-700 hover:bg-navy-50", files[k] ? "border-verified bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600")}>
                      <Paperclip className="h-4 w-4" />
                      <span className="font-semibold">{k}</span>
                      <span className="w-full truncate text-[10.5px]">{files[k] ?? "PDF / DOCX"}</span>
                      <input type="file" className="sr-only" onChange={(e) => e.target.files?.[0] && setFiles((f) => ({ ...f, [k]: e.target.files![0].name }))} />
                    </label>
                  ))}
                </div>
              </Field>
              <PrimaryBtn>Submit application</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Request Meeting (investors) ---------- */
const slots = ["Mon 10:00 AM", "Tue 3:00 PM", "Wed 11:30 AM", "Thu 4:00 PM", "Fri 10:00 AM", "Flexible"] as const;
export function MeetingBtn({ investorSlug, investorName, className, size = "md" }: { investorSlug: string; investorName: string; className?: string; size?: "sm" | "md" }) {
  const existing = useStore((s) => s.meetings).find((m) => m.investorSlug === investorSlug && m.status !== "Declined");
  const [open, setOpen] = useState(false);
  const [startup, setStartup] = useState("");
  const [slot, setSlot] = useState<(typeof slots)[number]>("Flexible");
  const [agenda, setAgenda] = useState("");
  const [done, setDone] = useState(false);
  const base = cn("inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white font-semibold text-navy-800 transition-all hover:border-navy-700 hover:bg-navy-50", size === "sm" ? "px-3 py-2 text-[11.5px]" : "px-4 py-2.5 text-[12.5px]");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    requestMeeting(investorSlug, investorName, startup, slot, agenda);
    setDone(true);
  };
  if (existing) {
    return (
      <Link to="/dashboard?tab=meetings" className={cn(base, "!border-emerald-200 !bg-emerald-50 !text-emerald-700", className)}>
        <Calendar className="h-3.5 w-3.5" /> Meeting {existing.status.toLowerCase()}
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={cn(base, className)}>
        <Calendar className="h-3.5 w-3.5" /> Request Meeting
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request a meeting" subtitle={`with ${investorName}`}>
        <Gate reason="Sign in to request investor meetings.">
          {done ? (
            <Success title="Meeting requested" body={`${investorName} will confirm a slot. Confirmed meetings appear in Dashboard → Meetings with a calendar invite.`} to="/dashboard?tab=meetings" toLabel="View meetings" onClose={() => setOpen(false)} />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Your startup" htmlFor="mt-startup"><input id="mt-startup" required className={inputCls} value={startup} onChange={(e) => setStartup(e.target.value)} placeholder="Startup name" /></Field>
              <Field label="Preferred slot (IST)"><ChoiceGroup options={[...slots]} value={slot} onChange={setSlot} name="Slot" /></Field>
              <Field label="Agenda" htmlFor="mt-agenda"><textarea id="mt-agenda" required rows={3} className={textareaCls} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Round size, traction, what you'd like feedback on…" /></Field>
              <PrimaryBtn>Request meeting</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}

/* ---------- Request Information (opportunities) ---------- */
export function RequestInfoBtn({ slug, title, className }: { slug: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    requestInfo(slug, title, q);
    setDone(true);
  };
  return (
    <>
      <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={cn("inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50", className)}>
        <HelpCircle className="h-4 w-4" /> Request Information
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request information" subtitle={title} size="sm">
        <Gate reason="Sign in to ask the poster a question.">
          {done ? (
            <Success title="Question sent" body="The poster typically replies within 2 business days. You'll get a notification and can see the answer in your dashboard." to="/dashboard?tab=applications" toLabel="View in dashboard" onClose={() => setOpen(false)} />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Your question" htmlFor="ri-q"><textarea id="ri-q" required rows={4} className={textareaCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about eligibility, budget, timelines, documents…" /></Field>
              <PrimaryBtn>Send question</PrimaryBtn>
            </form>
          )}
        </Gate>
      </Modal>
    </>
  );
}
