const px = (id: number, w = 1200, h = 627) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;
// Event dates are relative to "today" so Today / This Week / Past filters always demonstrate.
const at = (days: number, hour: number, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

export type EventType = "Meetup" | "Workshop" | "Conference" | "Webinar" | "Hackathon" | "Networking" | "Pitch" | "Investor Meet" | "Panel";
export type Mode = "In-Person" | "Online" | "Hybrid";

export interface Speaker { name: string; initials: string; color: string; company: string; bio: string; linkedin: string; session: string; founderSlug?: string; investorSlug?: string }
export interface AgendaItem { time: string; title: string; desc: string }
export interface Discussion { id: string; name: string; initials: string; text: string; at: string; likes: number; replies: { name: string; text: string }[] }

export interface WsEvent {
  slug: string;
  title: string;
  type: EventType;
  start: string;
  end: string;
  organizer: { name: string; verified: boolean; to?: string };
  location: string;
  venue: string;
  address: string;
  mode: Mode;
  price: number;
  seats: number;
  seatsLeft: number;
  interested: number;
  industry: string;
  languages: string[];
  memberOnly?: boolean;
  featured?: boolean;
  cover: string;
  tagline: string;
  description: string;
  outcomes: string[];
  audience: string[];
  requirements: string[];
  agenda: AgendaItem[];
  speakers: Speaker[];
  sponsors: { name: string; tier: "Title" | "Gold" | "Community"; to?: string }[];
  venueInfo: { parking: string; hotels: { name: string; to?: string }[]; transit: string };
  gallery: string[];
  faq: { q: string; a: string }[];
  discussion: Discussion[];
  relatedStory?: string;
  relatedOpportunity?: string;
}

export const eventTypes: EventType[] = ["Meetup", "Workshop", "Conference", "Webinar", "Hackathon", "Networking", "Pitch", "Investor Meet", "Panel"];
export const eventIndustries = ["Sector Agnostic", "Technology", "AgriTech", "HealthTech", "Clean Energy", "Manufacturing", "Finance"];
export const eventOrganizers = [];
export const eventLocations = ["Warangal", "Hanamkonda", "Kazipet", "Online"];

export const fmtEventDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const isPast = (e: WsEvent) => new Date(e.end).getTime() < Date.now();
export const dayParts = (iso: string) => ({ mon: new Date(iso).toLocaleString("en-IN", { month: "short" }).toUpperCase(), day: String(new Date(iso).getDate()).padStart(2, "0") });

const sp = {};
const S = (k: keyof typeof sp, session: string): Speaker => ({ ...sp[k], session });
const disc = (a: string, b: string): Discussion[] => [
  { id: "d1", name: "Kiran Tej", initials: "KT", text: a, at: "2d ago", likes: 6, replies: [{ name: "WS Hub Team", text: "Yes — details are in the FAQ. See you there!" }] },
  { id: "d2", name: "Harika S.", initials: "HS", text: b, at: "1d ago", likes: 2, replies: [] },
];
const venue = (parking: string, transit: string) => ({ parking, hotels: [{ name: "Hotel Grand Warangal", to: "/businesses/hotel-grand-warangal" }, { name: "Haritha Kakatiya" }], transit });
const gallery = [px(9275222, 800, 600), px(20733081, 800, 600), px(29708283, 800, 600), px(15141483, 800, 600)];

export const events: WsEvent[] = [];

export const getEvent = (slug: string) => events.find((e) => e.slug === slug);
export const relatedEvents = (e: WsEvent, n = 4) =>
  events.filter((x) => x.slug !== e.slug && !isPast(x)).sort((a, b) => {
    const s = (z: WsEvent) => (z.type === e.type ? 2 : 0) + (z.industry === e.industry ? 1 : 0) + (z.organizer.name === e.organizer.name ? 1 : 0) + z.speakers.filter((sp) => e.speakers.some((es) => es.name === sp.name)).length;
    return s(b) - s(a);
  }).slice(0, n);
export const eventsForFounder = (founderSlug: string) => events.filter((e) => !isPast(e) && e.speakers.some((s) => s.founderSlug === founderSlug));
