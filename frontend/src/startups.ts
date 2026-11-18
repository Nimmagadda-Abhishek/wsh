const px = (id: number, w = 1200, h = 627) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;

export type StartupStage = "Idea" | "MVP" | "Pre-Seed" | "Seed" | "Series A" | "Growth" | "Scaleup";
export type BusinessModel = "B2B" | "B2C" | "D2C" | "Marketplace" | "SaaS" | "AI";
export type LookingFor = "Investment" | "Customers" | "Mentors" | "Hiring" | "Co-Founder" | "Partners" | "Government Support";

export interface Startup {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  category: string; // quick pill
  technologies: string[];
  stage: StartupStage;
  location: string;
  founded: number;
  fundingRaised: number; // lakhs
  teamSize: number;
  businessModel: BusinessModel[];
  lookingFor: LookingFor[];
  verified: boolean;
  womenFounded: boolean;
  featured?: boolean;
  logo: { initials: string; bg: string; fg: string };
  cover: string;
  founderSlug: string;
  coFounders: { name: string; role: string; initials: string; linkedin: string; experience: string }[];
  core: { name: string; role: string; initials: string }[];
  businessSlug?: string;
  website: string;
  social: { linkedin: string; twitter: string; instagram: string };
  overview: { mission: string; vision: string; problem: string; solution: string; audience: string; usp: string; model: string; market: string };
  products: { name: string; description: string; price: string; image: string; demo: boolean }[];
  traction: { users: string; customers: string; revenue: string; growth: string; monthly: number[]; milestones: { date: string; title: string }[] };
  funding: { status: "Bootstrapped" | "Raising" | "Funded"; seeking?: string; investorSlugs: string[]; useOfFunds: { label: string; pct: number }[]; capTable: { label: string; pct: number }[]; timeline: { date: string; round: string; amount: string; lead: string }[] };
  documents: { name: string; type: string; size: string; access: "public" | "request" }[];
  achievements: { year: string; title: string; type: "Award" | "Expansion" | "Media" | "Patent" | "Partnership" | "Funding"; description: string }[];
  jobs: { title: string; type: "Full-time" | "Internship" | "Contract"; location: string; opportunitySlug?: string }[];
  reviews: { name: string; role: string; rating: number; text: string }[];
  gallery: string[];
  views: number;
  trending: number;
  addedAt: string;
  updatedAt: string;
  followers: number;
  recentAchievement: string;
  mapQuery: string;
}

export const startupCategories = ["AI", "HealthTech", "AgriTech", "FinTech", "EdTech", "CleanTech", "SaaS", "DeepTech", "Manufacturing", "FoodTech", "RetailTech", "HRTech", "ConstructionTech", "Cybersecurity"];
export const startupIndustries = ["AgriTech", "Cybersecurity", "HealthTech", "EdTech", "Clean Energy", "Construction Tech", "FoodTech", "HRTech", "FinTech", "Manufacturing", "RetailTech"];
export const startupTech = ["AI/ML", "IoT", "Computer Vision", "Mobile", "Cloud", "Blockchain", "Drones", "Hardware", "Data Analytics", "NLP", "AR/VR"];
export const startupStages: StartupStage[] = ["Idea", "MVP", "Pre-Seed", "Seed", "Series A", "Growth", "Scaleup"];
export const businessModels: BusinessModel[] = ["B2B", "B2C", "D2C", "Marketplace", "SaaS", "AI"];
export const startupLookingFor: LookingFor[] = ["Investment", "Customers", "Mentors", "Hiring", "Co-Founder", "Partners", "Government Support"];
export const startupLocations = ["Warangal", "Hanamkonda", "Kazipet", "Narsampet"];

export const fmtFunding = (l: number) => (l === 0 ? "Bootstrapped" : l >= 100 ? `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)} Cr` : `₹${l} L`);
export const fmtStartupDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const gal = (a: number, b: number, c: number, d: number) => [px(a, 800, 600), px(b, 800, 600), px(c, 800, 600), px(d, 800, 600)];
const docs = (extra: { name: string; type: string; size: string; access: "public" | "request" }[] = []) => [
  { name: "Company One-Pager", type: "PDF", size: "640 KB", access: "public" as const },
  { name: "Pitch Deck", type: "PDF", size: "4.2 MB", access: "request" as const },
  { name: "Company Profile", type: "PDF", size: "2.1 MB", access: "public" as const },
  { name: "Financial Summary FY26", type: "XLSX", size: "180 KB", access: "request" as const },
  ...extra,
];

export const startups: Startup[] = [];

export const getStartup = (slug: string) => startups.find((s) => s.slug === slug);
export const startupByFounder = (founderSlug: string) => startups.find((s) => s.founderSlug === founderSlug);
export const startupsByInvestor = (investorSlug: string) => startups.filter((s) => s.funding.investorSlugs.includes(investorSlug));
export const relatedStartups = (s: Startup, n = 4) =>
  startups.filter((x) => x.slug !== s.slug).sort((a, b) => {
    const f = (z: Startup) => (z.industry === s.industry ? 3 : 0) + (z.stage === s.stage ? 2 : 0) + z.technologies.filter((t) => s.technologies.includes(t)).length;
    return f(b) - f(a);
  }).slice(0, n);
export const totalFunding = startups.reduce((a, s) => a + s.fundingRaised, 0);
