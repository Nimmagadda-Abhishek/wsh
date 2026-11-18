const px = (id: number, w = 1200, h = 627) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;

export type StoryCategory = "Founder Journey" | "Startup Story" | "Business Story" | "Funding" | "Innovation" | "Technology" | "Women Founder" | "Student Startup" | "Opinion" | "Community" | "Insights";
export const storyCategories: StoryCategory[] = ["Founder Journey", "Startup Story", "Business Story", "Funding", "Innovation", "Technology", "Women Founder", "Student Startup", "Opinion", "Community", "Insights"];

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string; by: string }
  | { type: "image"; src: string; caption: string }
  | { type: "stats"; items: { value: string; label: string }[] }
  | { type: "video"; title: string; poster: string }
  | { type: "list"; items: string[] };

export interface Author { id: string; name: string; initials: string; color: string; role: string; company: string; followers: number; website: string; founderSlug?: string; investorSlug?: string; bio: string }
export interface Story {
  slug: string;
  title: string;
  excerpt: string;
  category: StoryCategory;
  tags: string[];
  author: Author;
  date: string;
  readTime: number;
  views: number;
  likes: number;
  featured?: boolean;
  cover: string;
  body: Block[];
  links: { founder?: string; business?: string; investor?: string; event?: string; opportunity?: string };
}

const A: Record<string, Author> = {};

export const stories: Story[] = [];

export const getStory = (slug: string) => stories.find((s) => s.slug === slug);
export const relatedStories = (s: Story, n = 3) =>
  stories.filter((x) => x.slug !== s.slug).sort((a, b) => {
    const f = (z: Story) => (z.category === s.category ? 2 : 0) + z.tags.filter((t) => s.tags.includes(t)).length + (z.author.id === s.author.id ? 1 : 0);
    return f(b) - f(a);
  }).slice(0, n);
export const storiesByAuthor = (id: string) => stories.filter((s) => s.author.id === id);
export const fmtStoryDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
