import { useEffect, useRef, useState } from "react";
import {
  Rocket,
  User,
  BarChart3,
  Users,
  ClipboardCheck,
  CalendarCheck,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./Reveal";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
}

const stats: Stat[] = [
  { value: 1250, suffix: "+", label: "Businesses", icon: Building2 },
  { value: 430, suffix: "+", label: "Startups", icon: Rocket },
  { value: 700, suffix: "+", label: "Founders", icon: User },
  { value: 95, suffix: "+", label: "Investors", icon: BarChart3 },
  { value: 3200, suffix: "+", label: "Members", icon: Users },
  { value: 250, suffix: "+", label: "Jobs", icon: ClipboardCheck },
  { value: 65, suffix: "+", label: "Events", icon: CalendarCheck },
];

function useCountUp(target: number, start: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return value;
}

function StatItem({ stat, start }: { stat: Stat; start: boolean }) {
  const n = useCountUp(stat.value, start);
  const Icon = stat.icon;
  return (
    <li className="flex items-center gap-3 px-2 py-2 lg:px-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gold-500">
        <Icon className="h-7 w-7" strokeWidth={1.6} />
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-bold text-navy-800 tabular-nums">
          {n.toLocaleString("en-IN")}
          {stat.suffix}
        </p>
        <p className="text-[11px] text-slate-500">{stat.label}</p>
      </div>
    </li>
  );
}

export function Stats({ apiStats }: { apiStats?: { businesses?: number; users?: number } }) {
  const ref = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStart(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="mt-3 lg:mt-4" aria-label="Ecosystem statistics">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <Reveal delay={100} className="rounded-xl border border-line bg-white shadow-[0_10px_30px_-18px_rgba(10,28,63,0.3)]">
          <ul
            ref={ref}
            className="grid grid-cols-2 gap-x-2 px-3 py-2 sm:grid-cols-4 lg:grid-cols-7 lg:justify-between lg:px-4"
          >
            {[{ label: "Businesses", value: apiStats?.businesses ?? 0 }, { label: "Members", value: apiStats?.users ?? 0 }].map((s) => (
              <li key={s.label} className="flex items-center gap-3 px-2 py-2 lg:px-3">
                <div><p className="text-[15px] font-bold text-navy-800 tabular-nums">{s.value.toLocaleString("en-IN")}+</p><p className="text-[11px] text-slate-500">{s.label}</p></div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
