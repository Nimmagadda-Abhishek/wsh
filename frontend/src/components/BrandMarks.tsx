import { Car, Gem, Hexagon, Hotel, Shield } from "lucide-react";

/* Stylised brand marks for startups and trending businesses (SVG / icon based). */

export function StartupLogo({ kind }: { kind: "agrizen" | "learnloop" | "medinext" | "voltx" }) {
  switch (kind) {
    case "agrizen":
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-emerald-100">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22V10" />
              <path d="M12 10c0-4 3-7 7-7 0 4-3 7-7 7Z" />
              <path d="M12 14c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5Z" />
              <path d="M12 18c0-3 2.5-5 5.5-5 0 3-2.5 5-5.5 5Z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-emerald-700">AgriZen</span>
        </div>
      );
    case "learnloop":
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-700 shadow-md shadow-blue-300/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white/90">
            <span className="h-3.5 w-3.5 rounded-full bg-white" />
          </div>
        </div>
      );
    case "medinext":
      return (
        <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
          <ellipse cx="32" cy="14" rx="9" ry="12" fill="#0e8f8a" />
          <ellipse cx="32" cy="50" rx="9" ry="12" fill="#1fb6a8" />
          <ellipse cx="14" cy="32" rx="12" ry="9" fill="#12a39c" />
          <ellipse cx="50" cy="32" rx="12" ry="9" fill="#0b6f7a" />
        </svg>
      );
    case "voltx":
      return (
        <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
          <path d="M14 10h22l-8 18h14L18 56l6-22H12l2-24Z" fill="#1d4ed8" />
          <path d="M36 10h14L38 30h14L34 56l8-22H30l6-24Z" fill="#0ea5e9" opacity="0.85" />
        </svg>
      );
  }
}

export function BusinessMark() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-navy-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-500/70">
        <Shield className="h-8 w-8 text-gold-500" strokeWidth={1.8} />
      </div>
    </div>
  );
}

export function TrendingLogo({ kind }: { kind: "hotel" | "auto" | "tech" | "jewel" | "estate" }) {
  switch (kind) {
    case "hotel":
      return (
        <div className="flex flex-col items-center gap-1 text-[#b8892b]">
          <Hotel className="h-9 w-9" strokeWidth={1.5} />
          <span className="text-[8px] font-bold uppercase tracking-[0.18em]">Hotel Grand</span>
        </div>
      );
    case "auto":
      return (
        <div className="flex flex-col items-center gap-1 text-navy-700">
          <Car className="h-9 w-9" strokeWidth={1.5} />
          <span className="text-[8px] font-bold uppercase tracking-[0.14em]">Srinivasa</span>
        </div>
      );
    case "tech":
      return <Hexagon className="h-11 w-11 text-blue-600" strokeWidth={2.4} />;
    case "jewel":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-navy-950 text-gold-500">
          <Gem className="h-7 w-7" strokeWidth={1.5} />
          <span className="text-[8px] font-bold uppercase tracking-[0.18em]">Lakshmi</span>
        </div>
      );
    case "estate":
      return (
        <div className="flex flex-col items-center gap-1 text-[#b8892b]">
          <svg viewBox="0 0 48 32" className="h-8 w-12" fill="currentColor" aria-hidden="true">
            <path d="M2 30 12 14l6 8 6-14 8 12 6-6 8 16H2Z" />
          </svg>
          <span className="text-[8px] font-bold uppercase tracking-[0.18em]">Deccan</span>
        </div>
      );
  }
}

