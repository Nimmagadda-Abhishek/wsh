const px = (id: number, w = 800, h = 600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;

export type InvestorType = "Angel Investor" | "VC Firm" | "Angel Network" | "Family Office" | "Corporate" | "Government" | "CSR" | "Accelerator" | "Incubator";
export type InvStage = "Pre-Seed" | "Seed" | "Series A" | "Series B+" | "Growth";

export interface Investor {
  slug: string;
  name: string;
  firm: string;
  type: InvestorType;
  initials: string;
  color: string;
  location: string;
  stages: InvStage[];
  ticketMin: number; // lakhs
  ticketMax: number;
  sectors: string[];
  portfolioSize: number;
  lookingFor: ("Startups" | "Partnerships" | "Co-Investors" | "Advisory")[];
  format: ("Equity" | "Grant" | "Convertible" | "Debt")[];
  verified: boolean;
  active: boolean;
  bio: string;
  about: string;
  thesis: { what: string; avgTicket: string; industries: string[]; geography: string; checkSize: string; preferredRevenue: string; preferredTeamSize: string };
  pastInvestments: { name: string; sector: string; year: string; outcome: string }[];
  portfolio: { name: string; sector: string; stage: string; founderSlug?: string; year: string }[];
  focus: string[];
  team: { name: string; role: string; initials: string }[];
  events: { title: string; date: string; past: boolean }[];
  requirements: string[];
  website: string;
  linkedin: string;
  email: string;
  cover: string;
  joinedAt: string;
  views: number;
}

export const investorQuick = ["Angel Investors", "VC Firms", "Angel Networks", "Family Offices", "Corporate Investors", "Government", "CSR", "Accelerators", "Incubators"];
export const investorSectors = ["SaaS", "AgriTech", "HealthTech", "FinTech", "EdTech", "Consumer", "DeepTech", "CleanTech", "Manufacturing", "Sustainability", "Real Estate Tech", "Sector Agnostic"];
export const investorRanges = [
  { label: "Any Range", min: 0, max: Infinity },
  { label: "Under ₹25L", min: 0, max: 25 },
  { label: "₹25L – ₹1Cr", min: 25, max: 100 },
  { label: "₹1Cr – ₹5Cr", min: 100, max: 500 },
  { label: "₹5Cr+", min: 500, max: Infinity },
];

export const fmtLakh = (l: number) => (l >= 100 ? `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)}Cr` : `₹${l}L`);
export const ticketLabel = (i: Investor) => `${fmtLakh(i.ticketMin)} – ${fmtLakh(i.ticketMax)}`;

const evts = (a: string, b: string) => [
  { title: a, date: "Oct 19, 2026", past: false },
  { title: b, date: "Aug 8, 2026", past: true },
];

export const investors: Investor[] = [];

export const getInvestor = (slug: string) => investors.find((i) => i.slug === slug);
export const relatedInvestors = (i: Investor, n = 4) =>
  investors
    .filter((x) => x.slug !== i.slug)
    .sort((a, b) => {
      const s = (z: Investor) => (z.type === i.type ? 2 : 0) + z.sectors.filter((t) => i.sectors.includes(t)).length * 2 + z.stages.filter((t) => i.stages.includes(t)).length;
      return s(b) - s(a);
    })
    .slice(0, n);
