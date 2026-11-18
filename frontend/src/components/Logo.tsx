import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

interface LogoProps {
  className?: string;
  dark?: boolean;
  size?: "sm" | "lg";
}

export function Logo({ className, dark = false, size = "sm" }: LogoProps) {
  const lg = size === "lg";
  return (
    <Link to="/" className={cn("group flex items-center gap-2 select-none", className)} aria-label="WS Hub home">
      <span
        className={cn(
          "font-black leading-none tracking-tight",
          lg ? "text-5xl" : "text-[34px]",
          dark ? "text-navy-800" : "text-white",
        )}
      >
        W<span className="text-gold-500">S</span>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-extrabold tracking-wide",
            lg ? "text-2xl" : "text-lg",
            dark ? "text-navy-800" : "text-white",
          )}
        >
          HUB
        </span>
        <span
          className={cn(
            "font-semibold",
            lg ? "text-[11px] mt-0.5" : "text-[10px]",
            dark ? "text-navy-800/80" : "text-white/85",
          )}
        >
          {lg ? "Warangal Startups Hub" : "Warangal Startups"}
        </span>
      </span>
    </Link>
  );
}
