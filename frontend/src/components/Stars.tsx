import { Star } from "lucide-react";

interface StarsProps {
  rating: number;
  reviews: number;
  size?: number;
}

export function Stars({ rating, reviews, size = 11 }: StarsProps) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Rated ${rating} out of 5 from ${reviews} reviews`}>
      <div className="flex items-center gap-[1px]">
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star className="absolute inset-0 text-slate-300" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="text-gold-500" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          );
        })}
      </div>
      <span className="text-[10.5px] font-semibold text-slate-700">
        {rating.toFixed(1)} <span className="font-normal text-slate-500">({reviews})</span>
      </span>
    </div>
  );
}
