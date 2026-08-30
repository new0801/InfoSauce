export type NewsItem = {
  id: string;
  title: string;
  content: string;
  area: string;
  topic: string;
  source: string;
  sourceType: "official" | "news" | "social";
  url: string;
  publishedAt: string;
};

export const news: NewsItem[] = [
    {
  id: "AI001",
  title: "New AI Technology Update",
  content: "Artificial intelligence continues to develop across different industries.",
  area: "AI & Technology",
  topic: "AI",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/ai-1",
  publishedAt: "2026-08-30"
    },

{
  id: "AI002",
  title: "Emerging Technology Development",
  content: "New technologies are being developed to improve digital experiences.",
  area: "AI & Technology",
  topic: "Emerging Technology",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/tech-1",
  publishedAt: "2026-08-30"
    },

{
  id: "AI003",
  title: "New Productivity App",
  content: "A new digital application aims to improve productivity for users.",
  area: "AI & Technology",
  topic: "Apps",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/app-1",
  publishedAt: "2026-08-30"
    },

{
  id: "AI004",
  title: "Latest Gadget Development",
  content: "Technology companies continue to introduce new smart devices.",
  area: "AI & Technology",
  topic: "Gadgets",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/gadget-1",
  publishedAt: "2026-08-30"
    },

{
  id: "AI005",
  title: "Cybersecurity Industry Update",
  content: "Organizations are increasing their focus on cybersecurity and digital protection.",
  area: "AI & Technology",
  topic: "Cybersecurity",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/security-1",
  publishedAt: "2026-08-30"
    },
{
  id: "ENT001",
  title: "Latest K-Pop Music Update",
  content: "A K-pop artist has announced a new music release.",
  area: "Entertainment & K-Pop",
  topic: "K-Pop",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/kpop-1",
  publishedAt: "2026-08-30"
    },

{
  id: "ENT002",
  title: "New K-Drama Announcement",
  content: "A new Korean drama has attracted attention from international viewers.",
  area: "Entertainment & K-Pop",
  topic: "K-Drama",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/kdrama-1",
  publishedAt: "2026-08-30"
    },

{
  id: "ENT003",
  title: "Upcoming Movie Release",
  content: "An upcoming movie has generated interest among audiences.",
  area: "Entertainment & K-Pop",
  topic: "Movies",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/movie-1",
  publishedAt: "2026-08-30"
    },

{
  id: "ENT004",
  title: "New Music Release",
  content: "A new music release has attracted attention from listeners.",
  area: "Entertainment & K-Pop",
  topic: "Music",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/music-1",
  publishedAt: "2026-08-30"
    },

{
  id: "ENT005",
  title: "Celebrity Entertainment Update",
  content: "A celebrity announcement has become a popular topic among online users.",
  area: "Entertainment & K-Pop",
  topic: "Celebrities",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/celebrity-1",
  publishedAt: "2026-08-30"
    },
{
  id: "WORLD001",
  title: "International News Update",
  content: "An international development has attracted global attention.",
  area: "World & Local",
  topic: "International News",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/world-1",
  publishedAt: "2026-08-30"
    },

{
  id: "WORLD002",
  title: "Malaysia Local News Update",
  content: "A local development has attracted attention in Malaysia.",
  area: "World & Local",
  topic: "Malaysia News",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/malaysia-1",
  publishedAt: "2026-08-30"
    },

{
  id: "WORLD003",
  title: "Political Development",
  content: "A political development has generated discussion among the public.",
  area: "World & Local",
  topic: "Politics",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/politics-1",
  publishedAt: "2026-08-30"
    },

{
  id: "WORLD004",
  title: "Social Issue Update",
  content: "A social issue has attracted public discussion and attention.",
  area: "World & Local",
  topic: "Social Issues",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/social-1",
  publishedAt: "2026-08-30"
    },

{
  id: "WORLD005",
  title: "Major Event Update",
  content: "A major event has attracted international attention.",
  area: "World & Local",
  topic: "Disasters & Major Events",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/event-1",
  publishedAt: "2026-08-30"
    },

{
  id: "BUS001",
  title: "Business Industry Update",
  content: "Businesses are adapting to changing market conditions.",
  area: "Business & Money",
  topic: "Business",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/business-1",
  publishedAt: "2026-08-30"
    },

{
  id: "BUS002",
  title: "Stock Market Update",
  content: "Financial markets continue to respond to new economic developments.",
  area: "Business & Money",
  topic: "Stocks & Markets",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/market-1",
  publishedAt: "2026-08-30"
    },

{
  id: "BUS003",
  title: "Startup Industry Update",
  content: "New startups are developing innovative products and services.",
  area: "Business & Money",
  topic: "Startups",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/startup-1",
  publishedAt: "2026-08-30"
    },

{
  id: "BUS004",
  title: "Personal Finance Update",
  content: "Consumers are becoming increasingly interested in managing personal finances.",
  area: "Business & Money",
  topic: "Personal Finance",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/finance-1",
  publishedAt: "2026-08-30"
    },

{
  id: "BUS005",
  title: "Economic Development",
  content: "Economic developments may influence businesses and consumers.",
  area: "Business & Money",
  topic: "Economy",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/economy-1",
  publishedAt: "2026-08-30"
    },
{
  id: "LIFE001",
  title: "Health and Wellness Update",
  content: "People are becoming more interested in healthy lifestyles and wellness.",
  area: "Life & Trends",
  topic: "Health & Wellness",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/health-1",
  publishedAt: "2026-08-30"
    },

{
  id: "LIFE002",
  title: "Education Technology Update",
  content: "Digital tools continue to influence education and learning.",
  area: "Life & Trends",
  topic: "Education",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/education-1",
  publishedAt: "2026-08-30"
    },

{
  id: "LIFE003",
  title: "Travel Trend Update",
  content: "New travel trends are influencing how people plan their trips.",
  area: "Life & Trends",
  topic: "Travel",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/travel-1",
  publishedAt: "2026-08-30"
    },

{
  id: "LIFE004",
  title: "Lifestyle Trend Update",
  content: "New lifestyle trends are gaining attention among younger audiences.",
  area: "Life & Trends",
  topic: "Lifestyle",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/lifestyle-1",
  publishedAt: "2026-08-30"
    },

{
  id: "LIFE005",
  title: "Social Trend Update",
  content: "A new social trend has attracted attention across online communities.",
  area: "Life & Trends",
  topic: "Social Trends",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/social-trend-1",
  publishedAt: "2026-08-30"
    },

];

