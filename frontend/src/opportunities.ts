export type OppType =
  | "Funding" | "Investment" | "Partnership" | "Collaboration" | "Hiring" | "Office Space" | "Manufacturing"
  | "Distribution" | "Marketing" | "Technology" | "Government" | "Tender" | "Grant" | "Challenge" | "Hackathon"
  | "Supplier" | "Mentorship" | "Internship" | "Legal" | "Finance";
export type PosterType = "Business" | "Startup" | "Investor" | "Government" | "Incubator" | "Founder";
export type Urgency = "Low" | "Medium" | "High";

export interface Opportunity {
  slug: string;
  title: string;
  type: OppType;
  industry: string;
  budget: string;
  budgetValue: number; // lakhs, for filtering
  location: string;
  deadline: string; // ISO
  postedBy: { type: PosterType; name: string; slug?: string; founderSlug?: string };
  verified: boolean;
  summary: string;
  description: string;
  goals?: string[];
  deliverables?: string[];
  tags: string[];
  stage: string[];
  urgency: Urgency;
  status: "Open" | "Closing Soon" | "Closed";
  views: number;
  applicants: number;
  requirements: string[];
  eligibility: string[];
  timeline: { date: string; label: string }[];
  documents: { name: string; size: string }[];
  faq: { q: string; a: string }[];
  contact: { name: string; email: string };
  postedAt: string;
}

export const oppQuick: { label: string; types: OppType[] }[] = [
  { label: "Funding", types: ["Funding", "Investment"] },
  { label: "Collaboration", types: ["Collaboration", "Technology"] },
  { label: "Partnerships", types: ["Partnership", "Distribution", "Manufacturing", "Marketing"] },
  { label: "Grants", types: ["Grant", "Government"] },
  { label: "Tenders", types: ["Tender"] },
  { label: "Incubation", types: ["Challenge", "Hackathon"] },
  { label: "Hiring", types: ["Hiring", "Internship"] },
  { label: "Mentorship", types: ["Mentorship"] },
  { label: "Services", types: ["Legal", "Finance", "Supplier"] },
];
export const oppTypes: OppType[] = ["Funding", "Investment", "Partnership", "Collaboration", "Hiring", "Internship", "Mentorship", "Office Space", "Manufacturing", "Supplier", "Distribution", "Marketing", "Technology", "Legal", "Finance", "Government", "Tender", "Grant", "Challenge", "Hackathon"];
export const oppIndustries = ["AgriTech", "HealthTech", "Clean Energy", "EdTech", "Manufacturing", "FoodTech", "Cybersecurity", "Real Estate", "FinTech", "Sector Agnostic"];
export const oppBudgets = [
  { label: "Any Budget", min: 0, max: Infinity },
  { label: "Under ₹10L", min: 0, max: 10 },
  { label: "₹10L – ₹50L", min: 10, max: 50 },
  { label: "₹50L – ₹2Cr", min: 50, max: 200 },
  { label: "₹2Cr+", min: 200, max: Infinity },
];
export const oppPosters: PosterType[] = ["Investor", "Business", "Startup", "Government", "Incubator", "Founder"];
export const oppStages = ["Ideation", "Early Stage", "Growth", "Established"];

export const typeColor: Record<OppType, string> = {
  Funding: "bg-emerald-100 text-emerald-800",
  Investment: "bg-emerald-100 text-emerald-800",
  Partnership: "bg-amber-100 text-amber-800",
  Collaboration: "bg-violet-100 text-violet-800",
  Hiring: "bg-orange-100 text-orange-800",
  "Office Space": "bg-sky-100 text-sky-800",
  Manufacturing: "bg-slate-200 text-slate-800",
  Distribution: "bg-amber-100 text-amber-800",
  Marketing: "bg-pink-100 text-pink-800",
  Technology: "bg-violet-100 text-violet-800",
  Government: "bg-slate-200 text-slate-800",
  Tender: "bg-slate-200 text-slate-800",
  Grant: "bg-teal-100 text-teal-800",
  Challenge: "bg-indigo-100 text-indigo-800",
  Hackathon: "bg-indigo-100 text-indigo-800",
  Supplier: "bg-slate-200 text-slate-800",
  Mentorship: "bg-rose-100 text-rose-800",
  Internship: "bg-orange-100 text-orange-800",
  Legal: "bg-cyan-100 text-cyan-800",
  Finance: "bg-lime-100 text-lime-800",
};

export const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const doc = (name: string, size = "1.2 MB") => ({ name, size });

export const opportunities: Opportunity[] = [];

export const getOpportunity = (slug: string) => opportunities.find((o) => o.slug === slug);
export const relatedOpportunities = (o: Opportunity, n = 3) =>
  opportunities
    .filter((x) => x.slug !== o.slug)
    .sort((a, b) => {
      const s = (z: Opportunity) => (z.type === o.type ? 2 : 0) + (z.industry === o.industry ? 2 : 0) + (z.location === o.location ? 1 : 0);
      return s(b) - s(a);
    })
    .slice(0, n);
export const opportunitiesFor = (p: { businessSlug?: string; founderSlug?: string; investorSlug?: string }) =>
  opportunities.filter((o) => (p.businessSlug && o.postedBy.slug === p.businessSlug) || (p.founderSlug && o.postedBy.founderSlug === p.founderSlug) || (p.investorSlug && o.postedBy.slug === p.investorSlug));
export const posterLink = (p: Opportunity["postedBy"]) => {
  if (p.type === "Business" && p.slug) return `/businesses/${p.slug}`;
  if ((p.type === "Investor" || p.type === "Government" || p.type === "Incubator") && p.slug) return `/investors/${p.slug}`;
  if (p.founderSlug) return `/founders/${p.founderSlug}`;
  if (p.slug) return `/businesses/${p.slug}`;
  return undefined;
};
