import { useSyncExternalStore } from "react";
import { authApi, getAccessToken, setSession } from "./api";

/* ------------------------------------------------------------------ */
/* WS Hub client store — auth, saves, requests, applications, alerts   */
/* Persisted to localStorage; swap the actions for API calls later.    */
/* ------------------------------------------------------------------ */

export type SavedType = "business" | "founder" | "investor" | "opportunity" | "event" | "story" | "startup";
export type ReqStatus = "Pending" | "Accepted" | "Rejected";
export type AppStatus = "Applied" | "Shortlisted" | "Meeting" | "Rejected" | "Accepted" | "Completed";
export type Role = "Founder" | "Investor" | "Business" | "Mentor" | "Student" | "Professional" | "Admin";

export interface User {
  name: string;
  email: string;
  role: Role;
  verified: boolean;
}
export interface ConnectionReq {
  id: string;
  founderSlug: string;
  founderName: string;
  message: string;
  relationship: Role;
  status: ReqStatus;
  at: string;
}
export interface IntroReq {
  id: string;
  targetType: "founder" | "investor";
  targetSlug: string;
  targetName: string;
  via: string;
  reason: string;
  purpose?: string;
  outcome?: string;
  status: ReqStatus;
  at: string;
}
export interface MeetingReq {
  id: string;
  investorSlug: string;
  investorName: string;
  startup: string;
  slot: string;
  agenda: string;
  status: "Requested" | "Confirmed" | "Completed" | "Declined";
  at: string;
}
export interface InfoReq {
  id: string;
  opportunitySlug: string;
  opportunityTitle: string;
  question: string;
  status: "Sent" | "Answered";
  answer?: string;
  at: string;
}
export interface ReceivedReq {
  id: string;
  fromName: string;
  fromInitials: string;
  fromRole: Role;
  fromTo?: string;
  message: string;
  status: ReqStatus;
  at: string;
}
export type AnalyticsKey = "views" | "saves" | "clicks" | "requests" | "shares" | "applications";
export interface StartupContact { id: string; startupSlug: string; startupName: string; purpose: string; message: string; status: "Sent" | "Replied"; at: string }
export interface StartupInterest { id: string; startupSlug: string; startupName: string; investorName: string; organization: string; range: string; stage: string; sector: string; message: string; profile?: string; status: "Pending" | "Founder viewed" | "Meeting"; at: string }
export interface StartupMeeting { id: string; startupSlug: string; startupName: string; kind: "Meeting" | "Demo"; date: string; slot: string; mode: "Virtual" | "Offline"; status: "Requested" | "Confirmed"; at: string }
export interface DocAccess { id: string; startupSlug: string; doc: string; status: "Requested" | "Granted"; at: string }
export interface InterestReq {
  id: string;
  investorSlug: string;
  investorName: string;
  startup: string;
  message: string;
  pitch?: string;
  companyProfile?: string;
  status: ReqStatus;
  at: string;
}
export interface Application {
  id: string;
  opportunitySlug: string;
  opportunityTitle: string;
  name: string;
  company: string;
  role: string;
  why: string;
  attachments: string[];
  status: AppStatus;
  at: string;
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  to?: string;
}
export interface Report {
  id: string;
  targetType: string;
  targetSlug: string;
  reason: string;
  at: string;
}
export interface Toast {
  id: string;
  message: string;
  kind: "success" | "info" | "error";
  to?: string;
}

export interface Registration {
  id: string;
  eventSlug: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  food: string;
  amount: number;
  code: string;
  status: "Registered" | "Attended" | "Cancelled";
  at: string;
}
export interface Feedback {
  eventSlug: string;
  rating: number;
  review: string;
  photos: string[];
  at: string;
}
export interface Certificate {
  id: string;
  eventSlug: string;
  eventTitle: string;
  issuedAt: string;
}
export interface Comment {
  id: string;
  name: string;
  initials: string;
  text: string;
  at: string;
  likes: number;
  liked?: boolean;
  replies: Comment[];
}
export interface UserStory {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  tags: string[];
  status: "Draft" | "Pending Review" | "Published" | "Rejected";
  at: string;
  views: number;
}
export type PlanId = "free" | "business" | "premium" | "enterprise";
export interface MembershipState {
  plan: PlanId;
  billing: "monthly" | "yearly";
  since: string;
  renewsAt: string;
  status: "active" | "paused" | "cancelled";
}
export interface Invoice {
  id: string;
  plan: PlanId;
  amount: number;
  at: string;
  period: string;
  note?: string;
}

export interface State {
  user: User | null;
  registrations: Registration[];
  feedback: Feedback[];
  certificates: Certificate[];
  comments: Record<string, Comment[]>;
  storyLikes: string[];
  follows: string[];
  userStories: UserStory[];
  membership: MembershipState;
  invoices: Invoice[];
  saved: Record<SavedType, string[]>;
  connections: ConnectionReq[];
  intros: IntroReq[];
  interests: InterestReq[];
  meetings: MeetingReq[];
  infoRequests: InfoReq[];
  received: ReceivedReq[];
  analytics: Record<AnalyticsKey, number>;
  compare: string[];
  compareStartups: string[];
  followsStartups: string[];
  startupContacts: StartupContact[];
  startupInterests: StartupInterest[];
  startupMeetings: StartupMeeting[];
  docAccess: DocAccess[];
  applications: Application[];
  notifications: Notification[];
  reports: Report[];
  recentSearches: string[];
  profileViews: number;
  toasts: Toast[];
}

const KEY = "wshub:state:v1";
const emptyMembership: MembershipState = { plan: "free", billing: "monthly", since: "", renewsAt: "", status: "active" };
const empty: State = {
  user: null,
  registrations: [],
  feedback: [],
  certificates: [],
  comments: {},
  storyLikes: [],
  follows: [],
  userStories: [],
  membership: emptyMembership,
  invoices: [],
  saved: { business: [], founder: [], investor: [], opportunity: [], event: [], story: [], startup: [] },
  connections: [],
  intros: [],
  interests: [],
  meetings: [],
  infoRequests: [],
  received: [],
  analytics: { views: 0, saves: 0, clicks: 0, requests: 0, shares: 0, applications: 0 },
  compare: [],
  compareStartups: [],
  followsStartups: [],
  startupContacts: [],
  startupInterests: [],
  startupMeetings: [],
  docAccess: [],
  applications: [],
  notifications: [],
  reports: [],
  recentSearches: [],
  profileViews: 128,
  toasts: [],
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    // Do not restore an old account or its private client state after its token is gone.
    if (!getAccessToken()) return empty;
    // migrate legacy saved businesses
    const legacy = JSON.parse(localStorage.getItem("wshub:saved") || "[]");
    return { ...empty, ...parsed, analytics: { ...empty.analytics, ...parsed.analytics }, membership: { ...emptyMembership, ...parsed.membership }, saved: { ...empty.saved, ...parsed.saved, business: parsed.saved?.business?.length ? parsed.saved.business : legacy }, toasts: [] };
  } catch {
    return empty;
  }
}

let state: State = typeof window === "undefined" ? empty : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    const { toasts: _t, ...rest } = state;
    void _t;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* ignore quota */
  }
}
function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((l) => l());
  persist();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
export const getState = () => state;

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

/* ---------- analytics ---------- */
const analyticsLog: { key: AnalyticsKey; entity?: string; at: string }[] = [];
export function track(key: AnalyticsKey, entity?: string) {
  analyticsLog.push({ key, entity, at: now() });
  set((s) => ({ analytics: { ...s.analytics, [key]: (s.analytics[key] ?? 0) + 1 } }));
}
export const getAnalyticsLog = () => analyticsLog;

/* ---------- compare ---------- */
export function toggleCompare(slug: string) {
  const has = state.compare.includes(slug);
  if (!has && state.compare.length >= 3) return toast("You can compare up to 3 founders", "info");
  set((s) => ({ compare: has ? s.compare.filter((x) => x !== slug) : [...s.compare, slug] }));
}
export const clearCompare = () => set({ compare: [] });

/* ---------- toasts ---------- */
export function toast(message: string, kind: Toast["kind"] = "success", to?: string) {
  const id = uid();
  set((s) => ({ toasts: [...s.toasts, { id, message, kind, to }] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
}
export const dismissToast = (id: string) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));

/* ---------- notifications ---------- */
export function notify(title: string, body: string, to?: string) {
  set((s) => ({ notifications: [{ id: uid(), title, body, at: now(), read: false, to }, ...s.notifications].slice(0, 40) }));
}
export const markAllRead = () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
export const markRead = (id: string) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));

/* ---------- auth ---------- */
export function login(user: Omit<User, "verified">) {
  const signedInUser = { ...user, verified: user.role !== "Student" };
  const accountChanged = state.user && state.user.email.toLowerCase() !== signedInUser.email.toLowerCase();
  if (accountChanged) set({ ...empty, user: signedInUser });
  else set({ user: signedInUser });
  toast(`Welcome, ${user.name.split(" ")[0]}!`);
  if (getState().notifications.length === 0) {
    notify("Welcome to WS Hub", "Complete your profile to get discovered by founders and investors.", "/dashboard");
    setTimeout(() => notify("Investor viewed your profile", "Suresh Reddy (Angel Investor) viewed your profile.", "/investors/suresh-reddy"), 9000);
  }
  if (getState().received.length === 0) {
    set({
      received: [
        { id: uid(), fromName: "Karthik Reddy", fromInitials: "KR", fromRole: "Founder", fromTo: "/founders/karthik-reddy", message: "Hi! We're both building for Warangal's industrial estate — would love to swap notes on IoT pilots.", status: "Pending", at: now() },
        { id: uid(), fromName: "Sahil Shaik", fromInitials: "SS", fromRole: "Founder", fromTo: "/founders/sahil-shaik", message: "Foodly is looking for partners in your space. Open to a quick chat?", status: "Pending", at: new Date(Date.now() - 864e5).toISOString() },
      ],
    });
    setTimeout(() => notify("New connection request", "Karthik Reddy (FabWorks) wants to connect.", "/dashboard?tab=requests"), 4000);
  }
}
export function logout() {
  // Start revocation while the bearer token is still available, then clear local
  // credentials and persisted account data immediately instead of waiting on the network.
  void authApi.logout().catch(() => undefined);
  setSession(null);
  set({ ...empty });
  toast("Signed out", "info");
}

/* ---------- saves ---------- */
export function toggleSaved(type: SavedType, slug: string) {
  const cur = state.saved[type];
  const isSaved = cur.includes(slug);
  if (!isSaved) track("saves", slug);
  set((s) => ({ saved: { ...s.saved, [type]: isSaved ? cur.filter((x) => x !== slug) : [...cur, slug] } }));
  toast(isSaved ? "Removed from saved" : "Saved to your dashboard", isSaved ? "info" : "success", isSaved ? undefined : "/dashboard?tab=saved");
}

/* ---------- connections ---------- */
export function sendConnection(founderSlug: string, founderName: string, message: string, relationship: Role) {
  const id = uid();
  track("requests", founderSlug);
  set((s) => ({ connections: [{ id, founderSlug, founderName, message, relationship, status: "Pending", at: now() }, ...s.connections] }));
  toast(`Connection request sent to ${founderName}`, "success", "/dashboard?tab=requests");
  // Simulated response from the founder
  setTimeout(() => {
    set((s) => ({ connections: s.connections.map((c) => (c.id === id ? { ...c, status: "Accepted" } : c)) }));
    notify("Connection accepted", `${founderName} accepted your connection request. You can now message them.`, `/founders/${founderSlug}`);
    toast(`${founderName} accepted your request`, "success", `/founders/${founderSlug}`);
  }, 9000);
}
export const connectionWith = (s: State, founderSlug: string) => s.connections.find((c) => c.founderSlug === founderSlug);

export function respondReceived(id: string, status: ReqStatus) {
  const r = state.received.find((x) => x.id === id);
  set((s) => ({ received: s.received.map((x) => (x.id === id ? { ...x, status } : x)) }));
  if (r) toast(status === "Accepted" ? `You're now connected with ${r.fromName}` : `Request from ${r.fromName} declined`, status === "Accepted" ? "success" : "info", status === "Accepted" ? "/dashboard?tab=messages" : undefined);
}

/* ---------- introductions ---------- */
export function requestIntro(targetType: IntroReq["targetType"], targetSlug: string, targetName: string, via: string, reason: string, purpose?: string, outcome?: string) {
  const id = uid();
  track("requests", targetSlug);
  set((s) => ({ intros: [{ id, targetType, targetSlug, targetName, via, reason, purpose, outcome, status: "Pending", at: now() }, ...s.intros] }));
  toast(`Introduction request sent via ${via}`, "success", "/dashboard?tab=requests");
  setTimeout(() => notify("Introduction in progress", `${via} is working on your introduction to ${targetName}.`, "/dashboard?tab=requests"), 7000);
}

/* ---------- investor interest ---------- */
export function expressInterest(investorSlug: string, investorName: string, startup: string, message: string, pitch?: string, companyProfile?: string) {
  const id = uid();
  track("requests", investorSlug);
  set((s) => ({ interests: [{ id, investorSlug, investorName, startup, message, pitch, companyProfile, status: "Pending", at: now() }, ...s.interests] }));
  toast(`${startup} shared with ${investorName}`, "success", "/dashboard?tab=requests");
  setTimeout(() => notify("Investor viewed your pitch", `${investorName} opened the ${startup} pitch.`, `/investors/${investorSlug}`), 8000);
}

/* ---------- meetings ---------- */
export function requestMeeting(investorSlug: string, investorName: string, startup: string, slot: string, agenda: string) {
  const id = uid();
  track("requests", investorSlug);
  set((s) => ({ meetings: [{ id, investorSlug, investorName, startup, slot, agenda, status: "Requested", at: now() }, ...s.meetings] }));
  toast(`Meeting requested with ${investorName}`, "success", "/dashboard?tab=meetings");
  setTimeout(() => {
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, status: "Confirmed" } : m)) }));
    notify("Meeting confirmed", `${investorName} confirmed your meeting for ${slot}. Calendar invite sent.`, "/dashboard?tab=meetings");
    toast(`${investorName} confirmed your meeting`, "success", "/dashboard?tab=meetings");
  }, 10000);
}

/* ---------- information requests ---------- */
export function requestInfo(opportunitySlug: string, opportunityTitle: string, question: string) {
  const id = uid();
  track("requests", opportunitySlug);
  set((s) => ({ infoRequests: [{ id, opportunitySlug, opportunityTitle, question, status: "Sent", at: now() }, ...s.infoRequests] }));
  toast("Question sent to the poster", "success", "/dashboard?tab=applications");
  setTimeout(() => {
    set((s) => ({ infoRequests: s.infoRequests.map((r) => (r.id === id ? { ...r, status: "Answered", answer: "Thanks for asking — yes, that's possible. Please mention it in your application and we'll take it into account." } : r)) }));
    notify("Your question was answered", `The poster of "${opportunityTitle}" replied.`, "/dashboard?tab=applications");
  }, 9000);
}

/* ---------- applications ---------- */
export function applyToOpportunity(input: Omit<Application, "id" | "status" | "at">) {
  const id = uid();
  track("applications", input.opportunitySlug);
  set((s) => ({ applications: [{ ...input, id, status: "Applied", at: now() }, ...s.applications] }));
  setTimeout(() => {
    set((s) => ({ applications: s.applications.map((a) => (a.id === id ? { ...a, status: "Shortlisted" } : a)) }));
    notify("You've been shortlisted", `Your application for "${input.opportunityTitle}" was shortlisted.`, "/dashboard?tab=applications");
    toast("Application shortlisted!", "success", "/dashboard?tab=applications");
  }, 12000);
  return id;
}
export const applicationFor = (s: State, slug: string) => s.applications.find((a) => a.opportunitySlug === slug);

/* ---------- reports & search ---------- */
export function report(targetType: string, targetSlug: string, reason: string) {
  set((s) => ({ reports: [{ id: uid(), targetType, targetSlug, reason, at: now() }, ...s.reports] }));
  toast("Report submitted. Our team will review it.", "info");
}
export function addRecentSearch(q: string) {
  const v = q.trim();
  if (!v) return;
  set((s) => ({ recentSearches: [v, ...s.recentSearches.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6) }));
}
export const clearRecentSearches = () => set({ recentSearches: [] });

export const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

/* ================= EVENTS ================= */
const ticketCode = () => "WSH-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
export function registerEvent(input: Omit<Registration, "id" | "code" | "status" | "at">, reminder: string) {
  const reg: Registration = { ...input, id: uid(), code: ticketCode(), status: "Registered", at: now() };
  set((s) => ({ registrations: [reg, ...s.registrations] }));
  notify("You're registered", `${input.eventTitle} — your QR pass is ready in My Events.`, `/events/${input.eventSlug}`);
  setTimeout(() => notify("Reminder: event tomorrow", reminder, `/events/${input.eventSlug}`), 12000);
  return reg;
}
export function cancelRegistration(id: string) {
  set((s) => ({ registrations: s.registrations.map((r) => (r.id === id ? { ...r, status: "Cancelled" } : r)) }));
  toast("Registration cancelled", "info");
}
export const registrationFor = (s: State, slug: string) => s.registrations.find((r) => r.eventSlug === slug && r.status !== "Cancelled");
export function submitFeedback(eventSlug: string, rating: number, review: string, photos: string[]) {
  set((s) => ({ feedback: [{ eventSlug, rating, review, photos, at: now() }, ...s.feedback.filter((f) => f.eventSlug !== eventSlug)], registrations: s.registrations.map((r) => (r.eventSlug === eventSlug ? { ...r, status: "Attended" } : r)) }));
  toast("Thanks for your feedback!");
}
export function requestCertificate(eventSlug: string, eventTitle: string) {
  if (state.certificates.some((c) => c.eventSlug === eventSlug)) return toast("Certificate already issued", "info", "/dashboard?tab=events");
  set((s) => ({ certificates: [{ id: "CERT-" + uid().toUpperCase(), eventSlug, eventTitle, issuedAt: now() }, ...s.certificates] }));
  notify("Certificate issued", `Your certificate for ${eventTitle} is ready to download.`, "/dashboard?tab=events");
  toast("Certificate issued", "success", "/dashboard?tab=events");
}

/* ================= STORIES ================= */
export function toggleStoryLike(slug: string) {
  const liked = state.storyLikes.includes(slug);
  set((s) => ({ storyLikes: liked ? s.storyLikes.filter((x) => x !== slug) : [...s.storyLikes, slug] }));
}
export function toggleFollow(authorId: string, name: string) {
  const f = state.follows.includes(authorId);
  set((s) => ({ follows: f ? s.follows.filter((x) => x !== authorId) : [...s.follows, authorId] }));
  toast(f ? `Unfollowed ${name}` : `Following ${name} — new stories will appear in your alerts`, f ? "info" : "success");
}
export function addComment(storySlug: string, text: string, parentId?: string) {
  const u = state.user;
  const c: Comment = { id: uid(), name: u?.name ?? "Member", initials: (u?.name ?? "M").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(), text, at: now(), likes: 0, replies: [] };
  const insert = (list: Comment[]): Comment[] => list.map((x) => (x.id === parentId ? { ...x, replies: [...x.replies, c] } : { ...x, replies: insert(x.replies) }));
  set((s) => ({ comments: { ...s.comments, [storySlug]: parentId ? insert(s.comments[storySlug] ?? []) : [c, ...(s.comments[storySlug] ?? [])] } }));
  toast(parentId ? "Reply posted" : "Comment posted");
}
export function likeComment(storySlug: string, id: string) {
  const walk = (list: Comment[]): Comment[] => list.map((x) => (x.id === id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : { ...x, replies: walk(x.replies) }));
  set((s) => ({ comments: { ...s.comments, [storySlug]: walk(s.comments[storySlug] ?? []) } }));
}
export function submitStory(input: Omit<UserStory, "id" | "status" | "at" | "views">, publish: boolean) {
  const id = uid();
  set((s) => ({ userStories: [{ ...input, id, status: publish ? "Pending Review" : "Draft", at: now(), views: 0 }, ...s.userStories] }));
  if (publish) {
    toast("Story submitted for review", "success", "/dashboard?tab=stories");
    setTimeout(() => {
      set((s) => ({ userStories: s.userStories.map((x) => (x.id === id ? { ...x, status: "Published", views: 42 } : x)) }));
      notify("Story approved & published", `"${input.title}" is now live on WS Hub Stories.`, "/dashboard?tab=stories");
    }, 15000);
  } else toast("Draft saved", "info", "/dashboard?tab=stories");
}

/* ================= MEMBERSHIP ================= */
const addDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
export function subscribePlan(plan: PlanId, billing: "monthly" | "yearly", amount: number, note?: string) {
  const period = billing === "yearly" ? 365 : 30;
  set((s) => ({
    membership: { plan, billing, since: s.membership.since || now(), renewsAt: addDays(period), status: "active" },
    invoices: [{ id: "INV-" + uid().toUpperCase(), plan, amount, at: now(), period: billing, note }, ...s.invoices],
  }));
  notify("Welcome to WS Hub " + plan.charAt(0).toUpperCase() + plan.slice(1), "Your membership is active. Explore exclusive events and investor access.", "/dashboard?tab=membership");
}
export function pauseMembership() {
  set((s) => ({ membership: { ...s.membership, status: "paused" } }));
  toast("Membership paused — you won't be billed until you resume", "info");
}
export function resumeMembership() {
  set((s) => ({ membership: { ...s.membership, status: "active" } }));
  toast("Membership resumed");
}
export function cancelMembership(reason: string) {
  set((s) => ({ membership: { ...s.membership, status: "cancelled" } }));
  notify("Membership cancelled", `Reason: ${reason}. You keep benefits until ${new Date(state.membership.renewsAt).toLocaleDateString("en-IN")}.`, "/dashboard?tab=membership");
  toast("Membership cancelled. We're sorry to see you go.", "info");
}
export function renewMembership(amount: number) {
  set((s) => ({ membership: { ...s.membership, renewsAt: addDays(s.membership.billing === "yearly" ? 365 : 30), status: "active" }, invoices: [{ id: "INV-" + uid().toUpperCase(), plan: s.membership.plan, amount, at: now(), period: s.membership.billing, note: "Renewal" }, ...s.invoices] }));
  toast("Membership renewed");
}

/* ================= STARTUPS ================= */
export function toggleCompareStartup(slug: string) {
  const has = state.compareStartups.includes(slug);
  if (!has && state.compareStartups.length >= 3) return toast("You can compare up to 3 startups", "info");
  set((s) => ({ compareStartups: has ? s.compareStartups.filter((x) => x !== slug) : [...s.compareStartups, slug] }));
}
export const clearCompareStartups = () => set({ compareStartups: [] });
export function toggleFollowStartup(slug: string, name: string) {
  const f = state.followsStartups.includes(slug);
  set((s) => ({ followsStartups: f ? s.followsStartups.filter((x) => x !== slug) : [...s.followsStartups, slug] }));
  toast(f ? `Unfollowed ${name}` : `Following ${name} — you'll get updates on funding, jobs and events`, f ? "info" : "success");
}
export function contactFounder(startupSlug: string, startupName: string, purpose: string, message: string) {
  const id = uid();
  track("requests", startupSlug);
  set((s) => ({ startupContacts: [{ id, startupSlug, startupName, purpose, message, status: "Sent", at: now() }, ...s.startupContacts] }));
  toast(`Message sent to ${startupName}'s founder`, "success", "/dashboard?tab=messages");
  setTimeout(() => {
    set((s) => ({ startupContacts: s.startupContacts.map((c) => (c.id === id ? { ...c, status: "Replied" } : c)) }));
    notify("Founder replied", `${startupName}'s founder replied to your ${purpose.toLowerCase()} enquiry.`, "/dashboard?tab=messages");
  }, 10000);
}
export function submitStartupInterest(input: Omit<StartupInterest, "id" | "status" | "at">) {
  const id = uid();
  track("requests", input.startupSlug);
  set((s) => ({ startupInterests: [{ ...input, id, status: "Pending", at: now() }, ...s.startupInterests] }));
  toast(`Interest sent to ${input.startupName}`, "success", "/dashboard?tab=startup");
  setTimeout(() => {
    set((s) => ({ startupInterests: s.startupInterests.map((c) => (c.id === id ? { ...c, status: "Founder viewed" } : c)) }));
    notify("Founder viewed your interest", `${input.startupName} viewed your investor interest. Book a meeting to continue.`, `/startups/${input.startupSlug}`);
  }, 9000);
}
export function bookStartupMeeting(startupSlug: string, startupName: string, kind: "Meeting" | "Demo", date: string, slot: string, mode: "Virtual" | "Offline") {
  const id = uid();
  track("requests", startupSlug);
  set((s) => ({ startupMeetings: [{ id, startupSlug, startupName, kind, date, slot, mode, status: "Requested" }, ...s.startupMeetings].map((m) => ({ ...m, at: (m as StartupMeeting).at ?? now() })) as StartupMeeting[] }));
  toast(`${kind} requested with ${startupName}`, "success", "/dashboard?tab=meetings");
  setTimeout(() => {
    set((s) => ({ startupMeetings: s.startupMeetings.map((m) => (m.id === id ? { ...m, status: "Confirmed" } : m)) }));
    notify(`${kind} confirmed`, `${startupName} confirmed ${date} · ${slot} (${mode}).`, "/dashboard?tab=meetings");
    toast(`${startupName} confirmed your ${kind.toLowerCase()}`, "success", "/dashboard?tab=meetings");
  }, 9000);
}
export function requestDocAccess(startupSlug: string, doc: string) {
  if (state.docAccess.some((d) => d.startupSlug === startupSlug && d.doc === doc)) return toast("Access already requested", "info");
  const id = uid();
  set((s) => ({ docAccess: [{ id, startupSlug, doc, status: "Requested", at: now() }, ...s.docAccess] }));
  toast(`Access requested for ${doc}`, "success");
  setTimeout(() => {
    set((s) => ({ docAccess: s.docAccess.map((d) => (d.id === id ? { ...d, status: "Granted" } : d)) }));
    notify("Document access granted", `You can now download ${doc}.`, `/startups/${startupSlug}`);
  }, 8000);
}
