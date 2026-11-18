import { Link } from "react-router-dom";
import { Building2, Rocket, UserPlus } from "lucide-react";
import { Reveal } from "./Reveal";

export function CTA() {
  return (
    <section className="relative mt-12 overflow-hidden bg-navy-950 text-white lg:mt-14" aria-labelledby="cta-title">
      <img
        src="/images/cta-bg.jpg"
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-900/75 to-navy-950/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-transparent to-navy-950/60" />

      <div className="relative mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Reveal>
            <h2 id="cta-title" className="max-w-[520px] text-[26px] font-bold leading-tight sm:text-[30px]">
              Be Part of Warangal’s
              <br className="hidden sm:block" /> Growing Business Ecosystem
            </h2>
            <p className="mt-4 max-w-[520px] text-[12.5px] leading-relaxed text-white/85 sm:text-[13px]">
              Whether you are a founder, entrepreneur, investor, professional or established business — WS Hub is
              built to help you connect, collaborate and grow.
            </p>
          </Reveal>

          <Reveal delay={150} className="flex flex-col items-start gap-8 lg:items-end">
            <p className="text-[16px] italic tracking-wide text-white/90 sm:text-[17px]">
              <span className="relative">
                Stronger Businesses
                <span className="absolute -bottom-2 left-0 h-[2px] w-full origin-left bg-gold-500" />
              </span>{" "}
              <span className="ml-1">A Brighter Warangal</span>
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/membership"
                className="inline-flex items-center gap-2.5 rounded-md bg-gold-500 px-6 py-3 text-[13px] font-bold text-navy-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-[0_12px_24px_-10px_rgba(226,176,74,0.9)]"
              >
                <UserPlus className="h-4 w-4" strokeWidth={2.2} />
                Join WS Hub
              </Link>
              <Link
                to="/businesses/manage"
                className="inline-flex items-center gap-2.5 rounded-md border border-white/80 px-6 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-navy-900"
              >
                <Building2 className="h-4 w-4" strokeWidth={2} />
                List Your Business
              </Link>
              <Link
                to="/startups"
                className="inline-flex items-center gap-2.5 rounded-md border border-white/80 px-6 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-navy-900"
              >
                <Rocket className="h-4 w-4" strokeWidth={2} />
                Register Your Startup
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
