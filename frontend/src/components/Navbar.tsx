import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Building2, ChevronDown, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { Logo } from "./Logo";
import { GlobalSearch } from "./GlobalSearch";
import { logout, markAllRead, markRead, timeAgo, useStore } from "../store";
import { cn } from "../utils/cn";

const links: { label: string; to: string; end?: boolean }[] = [
  { label: "Home", to: "/", end: true },
  { label: "Businesses", to: "/businesses" },
  { label: "Startups", to: "/startups" },
  { label: "Founders", to: "/founders" },
  { label: "Investors", to: "/investors" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Events", to: "/events" },
  { label: "Stories", to: "/stories" },
  { label: "Membership", to: "/membership" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const user = useStore((s) => s.user);
  const notifications = useStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setNotifOpen(false);
    setUserOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const initials = user?.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className={cn("sticky top-0 z-50 bg-navy-900/95 backdrop-blur transition-shadow duration-300", scrolled && "shadow-[0_6px_24px_-8px_rgba(0,0,0,0.5)]")}>
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("group relative px-2.5 py-2 text-[12.5px] font-medium transition-colors hover:text-white xl:px-3", isActive ? "text-white" : "text-white/85")}>
              {({ isActive }) => (
                <>
                  {l.label}
                  <span className={cn("absolute inset-x-2.5 -bottom-[13px] h-[2px] origin-left rounded-full bg-gold-500 transition-transform duration-300 group-hover:scale-x-100 xl:inset-x-3", isActive ? "scale-x-100" : "scale-x-0")} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div ref={popRef} className="flex items-center gap-2 lg:gap-3">
          <button type="button" aria-label="Search (Ctrl+K)" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 lg:w-auto lg:gap-2 lg:px-3">
            <Search className="h-4 w-4" strokeWidth={2.2} />
            <span className="hidden text-[12px] text-white/70 lg:block">Search</span>
            <kbd className="hidden rounded border border-white/20 px-1 text-[9.5px] text-white/60 xl:block">⌘K</kbd>
          </button>

          {user && (
            <div className="relative">
              <button type="button" aria-label={`Notifications (${unread} unread)`} onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                <Bell className="h-4 w-4" strokeWidth={2.2} />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-navy-900">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="page-in absolute right-0 top-11 w-[340px] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-2xl">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5"><p className="text-[13px] font-bold text-navy-900">Notifications</p>{unread > 0 && <button type="button" onClick={markAllRead} className="text-[11px] font-semibold text-navy-700 hover:underline">Mark all read</button>}</div>
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && <li className="p-6 text-center text-[12px] text-slate-500">You're all caught up.</li>}
                    {notifications.slice(0, 6).map((n) => (
                      <li key={n.id} className={cn("border-b border-line last:border-0", !n.read && "bg-navy-50/50")}>
                        <button type="button" onClick={() => { markRead(n.id); setNotifOpen(false); if (n.to) navigate(n.to); }} className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-slate-50">
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold-500")} />
                          <span className="min-w-0"><span className="block text-[12.5px] font-bold text-navy-900">{n.title}</span><span className="block text-[11.5px] text-slate-600">{n.body}</span><span className="block text-[10.5px] text-slate-400">{timeAgo(n.at)}</span></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Link to="/dashboard?tab=notifications" className="block border-t border-line py-2.5 text-center text-[12px] font-semibold text-navy-700 hover:bg-slate-50">View all</Link>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative hidden lg:block">
              <button type="button" onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-white hover:bg-white/20" aria-haspopup="menu" aria-expanded={userOpen}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-[11px] font-black text-navy-900">{initials}</span>
                <span className="max-w-[90px] truncate text-[12.5px] font-semibold">{user.name.split(" ")[0]}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {userOpen && (
                <div role="menu" className="page-in absolute right-0 top-11 w-56 overflow-hidden rounded-xl border border-line bg-white text-ink shadow-2xl">
                  <div className="border-b border-line px-4 py-3"><p className="truncate text-[13px] font-bold text-navy-900">{user.name}</p><p className="truncate text-[11px] text-slate-500">{user.role} · {user.email}</p></div>
                  <Link to="/dashboard" role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                  <Link to="/profile/edit" role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"><UserRound className="h-4 w-4" /> Edit profile</Link>
                  <Link to="/businesses/manage" role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"><Building2 className="h-4 w-4" /> Manage businesses</Link>
                  {user.role === "Admin" && <Link to="/admin" role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"><ShieldCheck className="h-4 w-4" /> Admin panel</Link>}
                  <Link to="/dashboard?tab=saved" role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50">Saved items</Link>
                  <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-[12.5px] font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-3 lg:flex">
              <Link to="/login" className="rounded-md border border-white/50 px-5 py-2 text-[13px] font-semibold text-white transition-all hover:border-white hover:bg-white/10">Login</Link>
              <Link to="/signup" className="btn-gold whitespace-nowrap">Sign Up</Link>
            </div>
          )}

          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-md text-white lg:hidden" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className={cn("overflow-hidden bg-navy-900 transition-[max-height] duration-500 ease-out lg:hidden", open ? "max-h-[680px]" : "max-h-0")}>
        <nav className="flex flex-col px-4 pb-6 pt-2" aria-label="Mobile">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => cn("border-b border-white/10 py-3 text-sm font-medium transition-colors hover:text-gold-400", isActive ? "text-gold-400" : "text-white/90")}>{l.label}</NavLink>
          ))}
          {user ? (
            <div className="mt-4 flex gap-3">
              <Link to="/dashboard" className="flex-1 rounded-md bg-gold-500 py-2.5 text-center text-sm font-semibold text-navy-900">Dashboard</Link>
              <Link to="/businesses/manage" className="flex-1 rounded-md border border-white/50 py-2.5 text-center text-sm font-semibold text-white">Businesses</Link>
              {user.role === "Admin" && <Link to="/admin" className="flex-1 rounded-md border border-gold-400 py-2.5 text-center text-sm font-semibold text-gold-300">Admin</Link>}
              <button type="button" onClick={logout} className="flex-1 rounded-md border border-white/50 py-2.5 text-center text-sm font-semibold text-white">Sign out</button>
            </div>
          ) : (
            <div className="mt-4 flex gap-3">
              <Link to="/login" className="flex-1 rounded-md border border-white/50 py-2.5 text-center text-sm font-semibold text-white">Login</Link>
              <Link to="/signup" className="btn-gold flex-1 py-2.5 text-sm whitespace-nowrap">Sign Up</Link>
            </div>
          )}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
