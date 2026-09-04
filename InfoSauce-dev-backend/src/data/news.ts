export type NewsItem = {
  id: string;
  title: string;
  content: string;
  topic: string;
  source: string;
  sourceType: "official" | "news" | "social";
  url: string;
  publishedAt: string;
};

export const news: NewsItem[] = [
  {
    id: "AI001",
    title: "AI Technology Update",
    content: "Artificial intelligence continues to develop across different industries.",
    topic: "AI",
    source: "Example News",
    sourceType: "news",
    url: "https://example.com/ai-1",
    publishedAt: "2026-08-30"
    },
    {
  id: "AI002",
  title: "AI Research Development",
  content: "Researchers are exploring new applications of artificial intelligence in different fields.",
  topic: "AI",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/ai-2",
  publishedAt: "2026-08-30"
    },
    {
  id: "AI003",
  title: "AI Tools Continue to Evolve",
  content: "New artificial intelligence tools are being developed for productivity and creative tasks.",
  topic: "AI",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/ai-3",
  publishedAt: "2026-08-30"
},
{
  id: "AI004",
  title: "AI in Everyday Applications",
  content: "Artificial intelligence is increasingly being integrated into everyday digital applications.",
  topic: "AI",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/ai-4",
  publishedAt: "2026-08-30"
},
{
  id: "AI005",
  title: "AI Industry Trends",
  content: "Companies are continuing to explore new ways to apply artificial intelligence technology.",
  topic: "AI",
  source: "Example News",
  sourceType: "news",
  url: "https://example.com/ai-5",
  publishedAt: "2026-08-30"
}
];

