const px = (id: number, w = 1200, h = 627) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;

export type BusinessType = "Startup" | "SME" | "Large Enterprise";
export type Membership = "Free" | "Premium" | "Enterprise";

export interface Product {
  name: string;
  description: string;
  image?: string;
  price?: string;
}
export interface Service {
  name: string;
  description: string;
}
export interface GalleryItem {
  image: string;
  label: string;
  group: "Office" | "Team" | "Events" | "Products" | "Other";
}
export interface Achievement {
  year: string;
  title: string;
  description: string;
  type: "Award" | "Certification" | "Expansion" | "Media";
}
export interface Review {
  name: string;
  role: string;
  rating: number;
  date: string;
  text: string;
  helpful: number;
}

export interface BusinessRecord {
  slug: string;
  name: string;
  category: string;
  industry: string;
  location: string;
  area: string;
  tagline: string;
  description: string;
  mission: string;
  vision: string;
  founder: string;
  employees: string;
  established: number;
  hours: string;
  businessType: BusinessType;
  membership: Membership;
  verified: boolean;
  rating: number;
  reviews: number;
  views: number;
  addedAt: string;
  verifiedAt: string;
  tags: string[];
  products: Product[];
  services: Service[];
  gallery: GalleryItem[];
  achievements: Achievement[];
  reviewList: Review[];
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    website: string;
    address: string;
    maps?: string;
    linkedin: string;
    instagram: string;
  };
  cover: string;
  logoUrl?: string;
  logo: { initials: string; bg: string; fg: string };
}

export const categories = [];

export const industries = [];

export const locations = [];
export const popularSearches = [];

const std = {
  hours: "Mon – Sat, 9:30 AM – 6:30 PM",
};

const teamGallery = (a: number, b: number, c: number, d: number): GalleryItem[] => [
  { image: px(a, 800, 600), label: "Head office", group: "Office" },
  { image: px(b, 800, 600), label: "Our team", group: "Team" },
  { image: px(c, 800, 600), label: "Annual meet 2025", group: "Events" },
  { image: px(d, 800, 600), label: "Workspace", group: "Office" },
  { image: px(3184357, 800, 600), label: "Strategy session", group: "Team" },
  { image: px(9275222, 800, 600), label: "WS Hub Summit", group: "Events" },
];

const reviewsFor = (names: [string, string, string], texts: [string, string, string]): Review[] => [
  { name: names[0], role: "Verified customer", rating: 5, date: "Sep 18, 2026", text: texts[0], helpful: 14 },
  { name: names[1], role: "Business partner", rating: 4, date: "Aug 30, 2026", text: texts[1], helpful: 9 },
  { name: names[2], role: "Verified customer", rating: 5, date: "Jul 12, 2026", text: texts[2], helpful: 6 },
];

export const businesses: BusinessRecord[] = [];

export const getBusiness = (slug: string) => businesses.find((b) => b.slug === slug);

export const relatedBusinesses = (b: BusinessRecord, n = 4) =>
  businesses
    .filter((x) => x.slug !== b.slug)
    .sort((x, y) => {
      const score = (z: BusinessRecord) =>
        (z.category === b.category ? 2 : 0) + (z.industry === b.industry ? 3 : 0) + (z.location === b.location ? 1 : 0);
      return score(y) - score(x);
    })
    .slice(0, n);
