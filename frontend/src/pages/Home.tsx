import { useEffect, useState } from "react";
import { Hero } from "../components/Hero";
import { Categories } from "../components/Categories";
import { Stats } from "../components/Stats";
import { FeaturedBusinesses, FeaturedStartups } from "../components/Featured";
import { LatestStories, UpcomingEvents } from "../components/EventsStories";
import { Opportunities, TrendingBusinesses } from "../components/OpportunitiesTrending";
import { CTA } from "../components/CTA";
import { homeApi } from "../api";

export default function Home() {
  const [home, setHome] = useState<any>(null);
  useEffect(() => {
    document.title = "WS Hub — Warangal’s Business & Startup Ecosystem";
    homeApi.get().then(setHome).catch(() => setHome(null));
  }, []);

  return (
    <div className="page-in pb-16 lg:pb-0">
      <Hero />
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
    </div>
  );
}
