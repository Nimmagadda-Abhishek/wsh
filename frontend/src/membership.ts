import type { PlanId } from "./store";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  cta: string;
  highlights: string[];
  audience: string;
}

export const plans: Plan[] = [
  { id: "free", name: "Free", tagline: "Get started with basic access.", monthly: 0, yearly: 0, cta: "Get Started", audience: "Explorers & students", highlights: ["Browse all profiles", "1 event per month", "Limited messaging (5/mo)", "Community access"] },
  { id: "business", name: "Business", tagline: "Get discovered by customers and partners.", monthly: 499, yearly: 4990, cta: "Choose Business", audience: "Businesses & SMEs", highlights: ["Verified badge", "Priority listing in directory", "Profile analytics", "Unlimited events", "Post opportunities"] },
  { id: "premium", name: "Premium", tagline: "Best for active founders & investors.", monthly: 1999, yearly: 19990, popular: true, cta: "Choose Premium", audience: "Founders & investors", highlights: ["All Business benefits", "Investor Connect & VIP events", "Direct messaging (unlimited)", "Featured profile & stories", "Investor network access", "Priority support"] },
  { id: "enterprise", name: "Enterprise", tagline: "For institutions, corporates & accelerators.", monthly: 4999, yearly: 49990, cta: "Choose Enterprise", audience: "Corporates, banks, institutions", highlights: ["All Premium benefits", "Dedicated account manager", "Custom events & workshops", "Team seats (up to 10)", "API & data exports", "Sponsorship placements"] },
];

export const planRank: Record<PlanId, number> = { free: 0, business: 1, premium: 2, enterprise: 3 };
export const getPlan = (id: string) => plans.find((p) => p.id === id);
export const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export type Cell = boolean | string;
export const comparison: { feature: string; values: Record<PlanId, Cell> }[] = [
  { feature: "Verified badge", values: { free: false, business: true, premium: true, enterprise: true } },
  { feature: "Priority listing", values: { free: false, business: true, premium: "Featured", enterprise: "Featured" } },
  { feature: "Profile analytics", values: { free: false, business: "Basic", premium: "Advanced", enterprise: "Advanced + exports" } },
  { feature: "Networking / messaging", values: { free: "5 / month", business: "50 / month", premium: "Unlimited", enterprise: "Unlimited" } },
  { feature: "Events", values: { free: "1 / month", business: "Unlimited", premium: "Unlimited + VIP", enterprise: "Unlimited + hosted" } },
  { feature: "Promotion", values: { free: false, business: "Directory", premium: "Home + newsletter", enterprise: "Sponsored" } },
  { feature: "Support", values: { free: "Community", business: "Email", premium: "Priority", enterprise: "Dedicated manager" } },
  { feature: "Investor access", values: { free: false, business: false, premium: true, enterprise: true } },
  { feature: "Workshops", values: { free: "Public", business: "Public", premium: "All + recordings", enterprise: "Custom" } },
  { feature: "Stories", values: { free: "Read", business: "Publish", premium: "Publish + featured", enterprise: "Publish + featured" } },
  { feature: "Referral rewards", values: { free: false, business: "10%", premium: "20%", enterprise: "20%" } },
  { feature: "Dashboard", values: { free: "Basic", business: "Business", premium: "Full", enterprise: "Team" } },
];

export const coupons: Record<string, number> = { WSHUB20: 0.2, FOUNDER10: 0.1, WARANGAL25: 0.25 };
export const GST = 0.18;

export const testimonials: { name: string; role: string; text: string; to: string }[] = [];

export const membershipFaq = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrades apply immediately and you only pay the difference; downgrades apply at renewal." },
  { q: "Is GST included?", a: "Prices are exclusive of 18% GST, shown at checkout. GST invoices are available in your dashboard." },
  { q: "What payment methods do you accept?", a: "UPI, credit/debit cards and net banking." },
  { q: "Can I pause my membership?", a: "Yes — pause for up to 3 months from your dashboard; you won't be billed while paused." },
  { q: "Do you offer student pricing?", a: "Student founders get Business at 50% off with a valid college ID. Contact support." },
];

export const benefitIcons = ["Exclusive Events", "Networking", "Priority Access", "Learning Resources", "Community Support"];
