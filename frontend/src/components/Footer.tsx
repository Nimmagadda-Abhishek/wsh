import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, MessageCircle } from "lucide-react";

type IconProps = { className?: string };

function Linkedin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function Instagram({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Youtube({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  );
}
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";

const columns: { title: string; links: string[] }[] = [
  { title: "Explore", links: ["Businesses", "Startups", "Founders", "Investors", "Events", "Map"] },
  {
    title: "Community",
    links: ["Requirements", "Collaboration", "Jobs", "Stories", "Achievements", "Reviews"],
  },
  { title: "Support", links: ["Help Center", "Contact Us", "Privacy Policy", "Terms of Service"] },
  { title: "Membership", links: ["Plans", "Compare", "For Businesses", "For Startups"] },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.5 8.57L22.8 22h-6.9l-5.4-7.06L4.3 22H1.04l8.02-9.17L.6 2h7.07l4.88 6.45L18.24 2Zm-1.21 18h1.8L7.05 3.9H5.12L17.03 20Z" />
    </svg>
  );
}

const socials = [
  { label: "LinkedIn", icon: Linkedin, href: "https://linkedin.com" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com" },
  { label: "YouTube", icon: Youtube, href: "https://youtube.com" },
  { label: "X", icon: XIcon, href: "https://x.com" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <footer className="relative bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-10 sm:px-6 lg:px-8 lg:pt-12">
        <Reveal className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,minmax(0,0.8fr))_1.5fr] lg:gap-6">
          {/* Brand */}
          <div className="md:col-span-2 lg:col-span-1">
            <Logo dark size="lg" />
            <p className="mt-5 text-[12px] font-medium text-navy-800">
              Connect <span className="mx-1 text-slate-400">•</span> Collaborate{" "}
              <span className="mx-1 text-slate-400">•</span> Grow
            </p>
            <ul className="mt-5 flex items-center gap-4">
              {socials.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-navy-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-50 hover:text-navy-600"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[12.5px] font-bold text-navy-900">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link
                      to={`/${l.toLowerCase().replace(/\s+/g, "-")}`}
                      className="group relative inline-block text-[11.5px] text-slate-600 transition-colors hover:text-navy-800"
                    >
                      {l}
                      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gold-500 transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Newsletter */}
          <div className="md:col-span-2 lg:col-span-1">
            <h3 className="text-[14px] font-bold text-navy-900">Stay Updated</h3>
            <p className="mt-1.5 text-[11.5px] text-slate-600">Subscribe to our newsletter</p>
            <form
              className="mt-3 flex overflow-hidden rounded-md border border-slate-300 bg-white transition-shadow focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/15"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
              }}
            >
              <label htmlFor="newsletter" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-9 min-w-0 flex-1 bg-transparent px-3 text-[11.5px] text-ink placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex w-9 shrink-0 items-center justify-center bg-gold-500 text-navy-900 transition-colors hover:bg-gold-400"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </form>
            <p
              className={`mt-2 text-[11px] text-verified transition-opacity duration-300 ${done ? "opacity-100" : "opacity-0"}`}
              aria-live="polite"
            >
              Thanks! You’re on the list.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-line pt-4 text-[11px] text-slate-600 sm:flex-row sm:items-center">
          <p>© 2026 WS Hub. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            Proudly for Warangal <Heart className="h-3.5 w-3.5 text-red-500" fill="currentColor" strokeWidth={0} />
          </p>
        </div>
      </div>

      {/* Floating chat */}
      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 lg:bottom-6 lg:right-6 items-center justify-center rounded-full bg-navy-900 text-white shadow-[0_10px_30px_-8px_rgba(6,19,48,0.6)] transition-all duration-300 hover:-translate-y-1 hover:bg-navy-700 hover:shadow-[0_16px_34px_-8px_rgba(6,19,48,0.7)]"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2} />
      </button>
    </footer>
  );
}
