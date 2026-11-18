export interface Business {
  slug: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  verified: boolean;
  image?: string;
  mark?: "shield";
}

export const featuredBusinesses: Business[] = [];

export interface Startup {
  name: string;
  category: string;
  location: string;
  stage: string;
  verified: boolean;
  logo: "agrizen" | "learnloop" | "medinext" | "voltx";
}

export const featuredStartups: Startup[] = [];

export interface EventItem {
  month: string;
  day: string;
  title: string;
  venue: string;
  time: string;
  image: string;
}

export const events: EventItem[] = [];

export interface Story {
  title: string;
  date: string;
  read: string;
  image: string;
}

export const featuredStory = {
  title: "From Warangal to the World",
  excerpt: "How local founders are building global solutions",
  author: "WS Hub Team",
  date: "Oct 2, 2026",
  read: "5 min read",
  image: "/images/hero.jpg",
};

export const stories: Story[] = [];

export interface Opportunity {
  title: string;
  company: string;
  location: string;
  posted: string;
}

export const opportunities: Opportunity[] = [];

export interface Trending {
  slug: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  logo: "hotel" | "auto" | "tech" | "jewel" | "estate";
}

export const trending: Trending[] = [
  { slug: "hotel-grand-warangal", name: "Hotel Grand Warangal", category: "Hospitality", rating: 4.8, reviews: 52, logo: "hotel" },
  { slug: "srinivasa-automobiles", name: "Srinivasa Automobiles", category: "Automobile", rating: 4.6, reviews: 38, logo: "auto" },
  { slug: "techware-solutions", name: "TechWare Solutions", category: "IT Services", rating: 4.5, reviews: 27, logo: "tech" },
  { slug: "lakshmi-jewellers", name: "Lakshmi Jewellers", category: "Retail", rating: 4.4, reviews: 21, logo: "jewel" },
  { slug: "varadhi-constructions", name: "Deccan Real Estates", category: "Real Estate", rating: 4.3, reviews: 18, logo: "estate" },
];
