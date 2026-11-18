import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const chips: { label: string; to: string }[] = [
  { label: "Businesses", to: "/businesses" },
  { label: "Startups", to: "/startups" },
  { label: "Founders", to: "/founders" },
  { label: "Investors", to: "/investors" },
  { label: "Jobs", to: "/jobs" },
  { label: "Events", to: "/events" },
  { label: "Requirements", to: "/requirements" },
];

export function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white" aria-labelledby="hero-title">
      {/* Background image */}
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 right-0 w-full overflow-hidden md:w-[68%]">
          <img
            src="/images/hero.jpg"
            alt=""
            className="ken-burns h-full w-full object-cover object-center"
            fetchPriority="high"
          />
        </div>
        {/* Gradients: fade image into navy on the left and bottom */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/10 md:via-navy-900/85 md:via-35%" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-transparent to-navy-900/40" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 pb-20 pt-3 sm:px-6 lg:px-8 lg:pb-[92px]">
        <p className="hero-in text-[12.5px] font-semibold tracking-wide text-white/80" style={{ animationDelay: "0ms" }}>
          Warangal Startups Hub
        </p>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:mt-9">
          <div className="max-w-[640px]">
            <p
              className="hero-in text-[11px] font-bold uppercase tracking-[0.32em] text-gold-400"
              style={{ animationDelay: "80ms" }}
            >
              Connect <span className="mx-1.5 text-gold-400/80">•</span> Collaborate{" "}
              <span className="mx-1.5 text-gold-400/80">•</span> Grow
            </p>

            <h1
              id="hero-title"
              className="hero-in mt-2 text-[64px] font-black leading-[0.95] tracking-tight sm:text-[80px] lg:text-[92px]"
              style={{ animationDelay: "160ms" }}
            >
              WS <span className="text-gold-500">Hub</span>
            </h1>

            <h2
              className="hero-in mt-3 text-[22px] font-bold leading-snug sm:text-[26px] lg:text-[27px]"
              style={{ animationDelay: "240ms" }}
            >
              Warangal’s Business &amp; Startup Ecosystem
            </h2>

            <p
              className="hero-in mt-3 max-w-[520px] text-[15px] leading-relaxed text-white/90 sm:text-base"
              style={{ animationDelay: "320ms" }}
            >
              Discover businesses. Find startups. Meet founders. Explore opportunities. Connect and grow.
            </p>

            {/* Search */}
            <form
              className="hero-in mt-6 flex overflow-hidden rounded-lg bg-white shadow-[0_14px_36px_-14px_rgba(0,0,0,0.6)] focus-within:ring-2 focus-within:ring-gold-400/80"
              style={{ animationDelay: "400ms" }}
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/businesses?q=${encodeURIComponent(q.trim())}`);
              }}
              role="search"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search
              </label>
              <span className="flex items-center pl-4 pr-3 text-navy-900">
                <Search className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </span>
              <input
                id="hero-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search businesses, startups, founders, products or services..."
                className="h-[42px] min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-slate-400 focus:outline-none sm:h-[44px]"
              />
              <button
                type="submit"
                className="shrink-0 bg-gold-500 px-5 text-[13px] font-semibold text-navy-900 transition-colors hover:bg-gold-400 sm:px-7"
              >
                Search
              </button>
            </form>

            {/* Chips */}
            <div className="hero-in mt-4 flex flex-wrap gap-2" style={{ animationDelay: "480ms" }}>
              {chips.map((c) => (
                <Link
                  key={c.label}
                  to={c.to}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-500 hover:text-navy-900"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right column: tagline */}
          <div className="relative hidden h-full min-h-[300px] w-[240px] lg:block xl:w-[300px]">
            <div
              className="hero-in absolute right-0 top-[90px] border-l border-white/80 pl-2.5 text-[11px] font-bold uppercase leading-[1.65] tracking-[0.06em] text-white"
              style={{ animationDelay: "500ms" }}
            >
              <span className="block">Local</span>
              <span className="block">Ideas</span>
              <span className="block">Global</span>
              <span className="block">Opportunities</span>
            </div>

            <div
              className="hero-in absolute -right-2 top-[215px]"
              style={{ animationDelay: "650ms" }}
            >
              <div className="float-y font-script text-[40px] leading-[0.95] text-gold-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] xl:text-[46px]">
                <span className="block">Warangal</span>
                <span className="block pl-8">Rises Together</span>
                <svg
                  className="ml-10 mt-1 w-[150px] text-gold-400"
                  viewBox="0 0 150 8"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2 5 C40 1, 110 1, 148 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
