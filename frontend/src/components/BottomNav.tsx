import { NavLink } from "react-router-dom";
import { Calendar, Compass, Home, Rocket, User } from "lucide-react";
import { cn } from "../utils/cn";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/businesses", label: "Explore", icon: Compass },
  { to: "/startups", label: "Startups", icon: Rocket },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/dashboard", label: "Profile", icon: User },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  isActive ? "text-navy-800" : "text-slate-500 hover:text-navy-700",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-gold-100")}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
