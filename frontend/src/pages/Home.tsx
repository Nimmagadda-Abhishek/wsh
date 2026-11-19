import { useEffect, useState } from "react";
import { Hero } from "../components/Hero";
import { Categories } from "../components/Categories";
import { Stats } from "../components/Stats";
import { FeaturedBusinesses, FeaturedStartups } from "../components/Featured";
import { LatestStories, UpcomingEvents } from "../components/EventsStories";
import { Opportunities, TrendingBusinesses } from "../components/OpportunitiesTrending";
import { CTA } from "../components/CTA";
import { homeApi } from "../api";
import { Shimmer } from "../components/ui/Shimmer";

export default function Home() {
  const [home, setHome] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    document.title = "WS Hub — Warangal’s Business & Startup Ecosystem";
    let active = true;
    homeApi.get().then((data) => { if (active) setHome(data); }).catch(() => { if (active) setHome(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="page-in pb-16 lg:pb-0">
      <Hero />
      {loading ? <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-8 sm:px-6 lg:px-8"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <Shimmer key={item} className="h-24 rounded-xl" />)}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, item) => <Shimmer key={item} className="h-20 rounded-xl" />)}</div><div className="grid gap-5 lg:grid-cols-2">{[0, 1].map((item) => <Shimmer key={item} className="h-64 rounded-xl" />)}</div><div className="grid gap-5 lg:grid-cols-2">{[0, 1].map((item) => <Shimmer key={item} className="h-64 rounded-xl" />)}</div></div> : <>
      <Categories items={home?.categories} />
      <Stats apiStats={home?.stats} />

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <section className="mt-9 grid gap-9 lg:grid-cols-2 lg:gap-7 xl:gap-8" aria-label="Featured">
          <FeaturedBusinesses items={home?.featured} />
          <FeaturedStartups />
        </section>

        <section className="mt-10 grid gap-9 lg:grid-cols-2 lg:gap-7 xl:gap-8" aria-label="Events and stories">
          <UpcomingEvents />
          <LatestStories />
        </section>

        <section className="mt-10 grid gap-9 lg:grid-cols-2 lg:gap-7 xl:gap-8" aria-label="Opportunities and trending">
          <Opportunities />
          <TrendingBusinesses items={home?.topRated?.length ? home.topRated : home?.latest} />
        </section>
      </div>

      <CTA />
      </>}
    </div>
  );
}
