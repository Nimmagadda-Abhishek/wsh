import { cn } from "../../utils/cn";

export function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}

export function BusinessCardShimmer({ count = 6 }: { count?: number }) {
  return <div role="status" aria-label="Loading businesses" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }, (_, index) => <article key={index} className="overflow-hidden rounded-xl border border-line bg-white">
      <Shimmer className="aspect-[16/8] rounded-none" />
      <div className="space-y-3 p-4"><div className="flex items-center gap-3"><Shimmer className="h-11 w-11 rounded-lg" /><div className="flex-1 space-y-2"><Shimmer className="h-4 w-3/4" /><Shimmer className="h-3 w-1/2" /></div></div><Shimmer className="h-3 w-full" /><Shimmer className="h-3 w-5/6" /><Shimmer className="h-9 w-full" /></div>
    </article>)}
  </div>;
}

export function MemberProfileShimmer() {
  return <main role="status" aria-label="Loading profile" className="mx-auto grid max-w-[1120px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
    <section className="space-y-4 rounded-xl border border-line bg-white p-6"><Shimmer className="mx-auto h-36 w-36 rounded-full" /><Shimmer className="mx-auto h-5 w-2/3" /><Shimmer className="mx-auto h-4 w-1/2" /><Shimmer className="mt-8 h-10 w-full" /><Shimmer className="h-10 w-full" /><Shimmer className="h-10 w-full" /></section>
    <section className="space-y-4 rounded-xl border border-line bg-white p-6"><Shimmer className="h-7 w-1/3" /><Shimmer className="h-4 w-full" /><Shimmer className="h-4 w-5/6" /><Shimmer className="mt-8 h-6 w-1/4" /><div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((item) => <Shimmer key={item} className="h-40" />)}</div></section>
  </main>;
}
