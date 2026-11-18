const px = (id: number, w = 800, h = 600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;

export type Stage = "Ideation" | "Pre-Seed" | "Seed" | "Early Stage" | "Growth" | "Established";
export type LookingFor = "Investment" | "Mentorship" | "Hiring" | "Customers" | "Co-founder" | "Manufacturer" | "Distribution" | "Partnerships" | "Advisory";

export interface Founder {
  slug: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  company: string;
  businessSlug?: string;
  industry: string;
  tags: string[];
  quick: string[]; // quick filter labels
  stage: Stage;
  location: string;
  experience: number;
  lookingFor: LookingFor[];
  availability: "Open to connect" | "Selective" | "Busy";
  skills: string[];
  languages: string[];
  fundingRaised: number; // lakhs
  verified: boolean;
  women: boolean;
  student: boolean;
  bio: string;
  about: string;
  mission: string;
  vision: string;
  education: { degree: string; school: string; year: string }[];
  experienceList: { role: string; org: string; period: string }[];
  startup: { description: string; products: string[]; revenue: string; customers: string; funding: string; website: string };
  achievements: { year: string; title: string; type: "Award" | "Launch" | "Media" | "Funding" | "Expansion" | "Patent" | "Recognition"; description: string }[];
  team: { name: string; role: string; initials: string }[];
  revenueRange: "Pre-revenue" | "Under ₹50L" | "₹50L – ₹2Cr" | "₹2Cr – ₹10Cr" | "₹10Cr+";
  gallery: { image: string; label: string }[];
  reviews: { name: string; role: string; rating: number; text: string }[];
  activity: { type: "Post" | "Event" | "Story" | "Comment"; title: string; date: string; to?: string }[];
  openRequirements: string[]; // opportunity slugs
  mutual: number;
  recentAchievement: string;
  social: { linkedin: string; instagram: string; website: string; email: string };
  cover: string;
  joinedAt: string;
  views: number;
  trending: number;
}

export const founderQuick = ["AI", "Healthcare", "Manufacturing", "Agritech", "EdTech", "Women Founder", "Student Founder", "FinTech", "CleanTech"];
export const founderIndustries = ["AgriTech", "HealthTech", "Clean Energy", "EdTech", "Construction Tech", "FoodTech", "Cybersecurity", "FinTech", "Manufacturing"];
export const founderSkills = ["Product", "Engineering", "Sales", "Marketing", "Operations", "Fundraising", "Design", "Data Science", "Hardware", "Supply Chain"];
export const founderLanguages = ["Telugu", "English", "Hindi", "Urdu", "Kannada"];
export const founderLookingFor: LookingFor[] = ["Investment", "Mentorship", "Hiring", "Customers", "Co-founder", "Manufacturer", "Distribution", "Partnerships", "Advisory"];

const gal = (a: number, b: number, c: number) => [
  { image: px(a), label: "Team at work" },
  { image: px(b), label: "Product demo" },
  { image: px(c), label: "WS Hub Summit 2026" },
];

export const founders: Founder[] = [];

export const getFounder = (slug: string) => founders.find((f) => f.slug === slug);
export const relatedFounders = (f: Founder, n = 4) =>
  founders
    .filter((x) => x.slug !== f.slug)
    .sort((a, b) => {
      const s = (z: Founder) => (z.industry === f.industry ? 3 : 0) + (z.stage === f.stage ? 1 : 0) + z.tags.filter((t) => f.tags.includes(t)).length;
      return s(b) - s(a);
    })
    .slice(0, n);

export const founderRevenues = ["Pre-revenue", "Under ₹50L", "₹50L – ₹2Cr", "₹2Cr – ₹10Cr", "₹10Cr+"];
export const trendingFounders = (n = 5) => [...founders].sort((a, b) => b.trending - a.trending).slice(0, n);
export const recentFounders = (n = 5) => [...founders].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, n);
export const featuredFounder = founders.find((f) => f.slug === "anirudh-kumar");
export const mutualNames = (f: Founder) => founders.filter((x) => x.slug !== f.slug && x.industry === f.industry).slice(0, Math.min(3, f.mutual)).map((x) => x.name);
