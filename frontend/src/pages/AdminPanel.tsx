import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, CreditCard, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi, type ApiMeta } from "../api";

type AdminStats = { users: number; pendingUsers: number; businesses: number; published: number; revenueMinor: number };
type AdminUser = { id: string; email?: string; full_name: string; role: string; approval_status: string; created_at: string; city?: string; country?: string };
type AdminBusiness = { id: string; name: string; slug: string; owner_id: string; category_id?: string; city?: string; status: string; email?: string; phone?: string; created_at: string };
type AdminPayment = {
  id: string; user_id: string; business_id?: string; razorpay_order_id: string; razorpay_payment_id?: string;
  amount: number; currency: string; status: string; payment_type?: string; paid_at?: string; created_at: string;
  plan?: { code?: string; name?: string } | null; business?: { name?: string } | null;
  payer?: { full_name?: string; email?: string } | null;
};

const dateLabel = (value?: string) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const moneyLabel = (minor: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format((minor || 0) / 100);
const inputClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15";
const statusTone = (status: string) => status === "paid" || status === "approved" || status === "published" ? "bg-emerald-50 text-emerald-700" : status === "failed" || status === "rejected" || status === "suspended" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800";

export default function AdminPanel() {
  const [tab, setTab] = useState<"users" | "businesses" | "payments">("users");
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const metrics: { label: string; value: number | string; icon: LucideIcon }[] = [
    { label: "Users", value: stats?.users ?? "—", icon: Users },
    { label: "Awaiting approval", value: stats?.pendingUsers ?? "—", icon: BadgeCheck },
    { label: "Businesses", value: stats?.businesses ?? "—", icon: Building2 },
    { label: "Paid revenue", value: stats ? moneyLabel(stats.revenueMinor) : "—", icon: CreditCard },
  ];

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [statsResult, listResult] = await Promise.all([
        adminApi.stats(),
        tab === "users"
          ? adminApi.users({ page, limit: 20, q: query.trim() || undefined, approvalStatus: status === "all" ? undefined : status })
          : tab === "businesses"
            ? adminApi.businesses({ page, limit: 20, status: status === "all" ? undefined : status })
            : adminApi.payments({ page, limit: 20, status: status === "all" ? undefined : status }),
      ]);
      setStats(statsResult);
      setMeta(listResult.meta);
      if (tab === "users") setUsers(listResult.data as AdminUser[]);
      else if (tab === "businesses") setBusinesses(listResult.data as AdminBusiness[]);
      else setPayments(listResult.data as AdminPayment[]);
      setAuthorized(true);
    } catch (reason) {
      const apiError = reason as Error & { status?: number };
      if (apiError.status === 401 || apiError.status === 403) setAuthorized(false);
      setError(apiError.message || "Could not load the admin console.");
    } finally { setLoading(false); }
  }, [page, query, status, tab]);

  useEffect(() => { void load(); }, [load]);

  const changeTab = (next: "users" | "businesses" | "payments") => {
    setTab(next); setPage(1); setQuery(""); setStatus(next === "users" ? "pending" : next === "payments" ? "all" : "all");
  };

  const reviewUser = async (id: string, nextStatus: "approved" | "rejected") => {
    setBusy(id); setError("");
    try { await adminApi.approveUser(id, nextStatus, nextStatus === "rejected" ? "Please contact WS Hub support for next steps." : undefined); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update account approval."); }
    finally { setBusy(""); }
  };

  return <main className="page-in mx-auto max-w-[1280px] px-4 py-9 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-gold-800">WS Hub administration</p><h1 className="mt-1 text-[28px] font-black text-navy-900">Admin panel</h1><p className="mt-1 text-[13px] text-slate-600">Review accounts, inspect businesses, and track payments.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-[12px] font-semibold text-navy-800 hover:bg-navy-50"><RefreshCw className="h-4 w-4" /> Refresh</button></div>

    {error && <div role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-[12.5px] text-red-700">{error}</div>}
    {authorized === false ? <section className="mt-7 rounded-xl border border-line bg-white p-8 text-center"><ShieldAlert className="mx-auto h-9 w-9 text-amber-600" /><h2 className="mt-3 text-[18px] font-bold text-navy-900">Administrator access required</h2><p className="mt-1 text-[13px] text-slate-600">Sign in with an account assigned the admin role to use this page.</p><Link to="/dashboard" className="btn-navy mt-4 px-5 py-2.5">Return to dashboard</Link></section> : <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => <article key={label} className="card flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700"><Icon className="h-5 w-5" /></span><span><span className="block text-[20px] font-black text-navy-900">{value}</span><span className="text-[11.5px] text-slate-500">{label}</span></span></article>)}
      </section>

      <section className="mt-7 overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
            {(["users", "businesses", "payments"] as const).map((key) => <button key={key} type="button" onClick={() => changeTab(key)} className={`rounded px-3 py-2 text-[12px] font-semibold capitalize ${tab === key ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"}`}>{key}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === "users" && <label className="relative"><span className="sr-only">Search users</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-9 sm:w-56`} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by name" /></label>}
            <select className={`${inputClass} w-auto min-w-36`} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label={`${tab} status`}>
              {tab === "users" ? <><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All users</option></> : tab === "businesses" ? <><option value="all">All businesses</option><option value="draft">Drafts</option><option value="published">Published</option><option value="suspended">Suspended</option></> : <><option value="all">All payments</option><option value="created">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></>}
            </select>
          </div>
        </div>

        {loading ? <div className="p-10 text-center text-[13px] text-slate-500">Loading {tab}…</div> : tab === "users" ? <div className="divide-y divide-line">
          {users.length === 0 && <p className="p-10 text-center text-[13px] text-slate-500">No users match this filter.</p>}
          {users.map((user) => <article key={user.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="truncate text-[13.5px] font-bold text-navy-900">{user.full_name || "Unnamed member"}</h2><p className="truncate text-[12px] text-slate-600">{user.email || "No email on profile"} · {user.role}</p><p className="mt-1 text-[11px] text-slate-500">Joined {dateLabel(user.created_at)}{user.city ? ` · ${user.city}${user.country ? `, ${user.country}` : ""}` : ""}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">{user.id}</p></div><div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${statusTone(user.approval_status || "pending")}`}>{user.approval_status || "pending"}</span>{user.approval_status !== "approved" && <button type="button" disabled={busy === user.id} onClick={() => void reviewUser(user.id, "approved")} className="rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">{busy === user.id ? "Saving…" : "Approve"}</button>}{user.approval_status !== "rejected" && <button type="button" disabled={busy === user.id} onClick={() => void reviewUser(user.id, "rejected")} className="rounded-md border border-slate-300 px-3 py-2 text-[11px] font-semibold text-slate-700 disabled:opacity-50">Reject</button>}</div></article>)}
        </div> : tab === "businesses" ? <div className="divide-y divide-line">
          {businesses.length === 0 && <p className="p-10 text-center text-[13px] text-slate-500">No businesses match this filter.</p>}
          {businesses.map((business) => <article key={business.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="truncate text-[13.5px] font-bold text-navy-900">{business.name}</h2><p className="text-[12px] text-slate-600">{business.city || "Location not set"} · Owner {business.owner_id}</p><p className="mt-1 text-[11px] text-slate-500">{business.email || business.phone || "No public contact"} · Added {dateLabel(business.created_at)}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">{business.id}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize ${statusTone(business.status)}`}>{business.status}</span></article>)}
        </div> : <div className="divide-y divide-line">
          {payments.length === 0 && <p className="p-10 text-center text-[13px] text-slate-500">No payments match this filter.</p>}
          {payments.map((payment) => <article key={payment.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[13.5px] font-bold text-navy-900">{moneyLabel(payment.amount, payment.currency)}</h2><span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize ${statusTone(payment.status)}`}>{payment.status}</span></div><p className="mt-1 text-[12px] text-slate-700">{payment.payer?.full_name || payment.payer?.email || "Account"}{payment.payer?.email && payment.payer.full_name ? ` · ${payment.payer.email}` : ""}</p><p className="mt-1 text-[11px] text-slate-500">{payment.business?.name || "No business"} · {payment.payment_type === "business_listing" ? "Business listing fee" : payment.plan?.name || payment.plan?.code || "Membership plan"} · Created {dateLabel(payment.created_at)}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">Order {payment.razorpay_order_id}{payment.razorpay_payment_id ? ` · Payment ${payment.razorpay_payment_id}` : ""}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">User {payment.user_id}</p></div><div className="text-left text-[11px] text-slate-500 md:text-right"><span className="block font-semibold text-slate-700">{payment.status === "paid" ? "Paid" : "Last updated"}</span>{dateLabel(payment.paid_at || payment.created_at)}</div></article>)}
        </div>}

        {meta && meta.totalPages > 1 && <div className="flex items-center justify-between border-t border-line p-4 text-[12px] text-slate-500"><span>Page {meta.page} of {meta.totalPages} · {meta.total} records</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))} className="rounded border border-slate-300 px-3 py-1.5 font-semibold text-navy-800 disabled:opacity-40">Previous</button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((n) => n + 1)} className="rounded border border-slate-300 px-3 py-1.5 font-semibold text-navy-800 disabled:opacity-40">Next</button></span></div>}
      </section>
    </>}
  </main>;
}
