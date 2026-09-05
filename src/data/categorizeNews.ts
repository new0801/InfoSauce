import { categories, type CategoryArea, type CategoryTopic } from "./categories";

export interface NewsCategory {
  area: CategoryArea;
  topic: CategoryTopic;
}

const topicKeywords: Record<CategoryTopic, readonly string[]> = {
  "AI": ["artificial intelligence", " ai ", "chatgpt", "openai", "llm", "model"],
  "Emerging Technology": ["robotics", "quantum", "semiconductor", "blockchain"],
  "Apps": ["app", "application", "software", "platform"],
  "Gadgets": ["phone", "smartphone", "laptop", "device", "wearable"],
  "Cybersecurity": ["cyber", "security", "hack", "breach", "malware", "ransomware"],
  "Tech Companies": ["google", "microsoft", "apple", "meta", "amazon", "nvidia"],
  "K-Pop": ["k-pop", "kpop", "idol", "comeback"],
  "K-Drama": ["k-drama", "kdrama", "korean drama"],
  "Movies": ["movie", "film", "cinema"],
  "Music": ["music", "album", "song", "concert"],
  "Celebrities": ["celebrity", "actor", "actress"],
  "Viral Entertainment": ["viral", "meme", "trend"],
  "International News": ["international", "global", "world", "foreign"],
  "Malaysia News": ["malaysia", "malaysian", "kuala lumpur"],
  "Politics": ["election", "government", "politics", "minister", "parliament"],
  "Social Issues": ["inequality", "rights", "protest", "community"],
  "International Relations": ["diplomacy", "sanctions", "treaty", "bilateral"],
  "Disasters & Major Events": ["earthquake", "flood", "wildfire", "disaster", "emergency"],
  "Business": ["business", "company", "industry", "corporate"],
  "Stocks & Markets": ["stock", "market", "shares", "nasdaq", "investor"],
  "Jobs & Careers": ["job", "hiring", "career", "layoff"],
  "Startups": ["startup", "founder", "funding", "venture capital"],
  "Personal Finance": ["budget", "saving", "debt", "mortgage"],
  "Economy": ["economy", "inflation", "gdp", "interest rate"],
  "Health & Wellness": ["health", "wellness", "medical", "fitness"],
  "Education": ["education", "school", "university", "learning"],
  "Travel": ["travel", "flight", "tourism", "hotel"],
  "Lifestyle": ["lifestyle", "fashion", "beauty", "home"],
  "Sports": ["sport", "football", "basketball", "olympic"],
  "Food": ["food", "restaurant", "recipe", "cooking"],
  "Social Trends": ["social media", "culture", "society"],
};

const defaultCategory: NewsCategory = { area: "World & Local", topic: "International News" };

// Prefer specific safety/security matches over the broader AI keyword when both occur.
const topicOrder: CategoryTopic[] = [
  "Cybersecurity",
  ...((Object.keys(topicKeywords) as CategoryTopic[]).filter((topic) => topic !== "Cybersecurity")),
];

export function categorizeNews(title: string, content: string): NewsCategory {
  const searchableText = ` ${title} ${content} `.toLowerCase();
  const topic = topicOrder.find((candidate) =>
    topicKeywords[candidate].some((keyword) => searchableText.includes(keyword)),
  );

  if (!topic) return defaultCategory;
  const area = (Object.keys(categories) as CategoryArea[]).find((candidate) =>
    (categories[candidate] as readonly CategoryTopic[]).includes(topic),
  );

  return area ? { area, topic } : defaultCategory;
}
