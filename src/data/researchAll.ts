import type { NewsItem } from "./news";
import { normalizeRawResearchItem } from "./normalizeNews";
import { searchBilibili } from "./research/bilibili";
import { searchExa } from "./research/exa";
import { searchReddit } from "./research/reddit";
import { searchTwitter } from "./research/twitter";
import type { RawResearchItem, ResearchPlatform, ResearchSearchResult } from "./research/types";
import { searchXhs } from "./research/xhs";
import { searchYouTube } from "./research/youtube";

export interface UnavailablePlatform {
  platform: ResearchPlatform;
  unavailable: string;
}

export interface ResearchAllResult {
  query: string;
  platformResults: ResearchSearchResult[];
  rawItems: RawResearchItem[];
  news: NewsItem[];
  unavailablePlatforms: UnavailablePlatform[];
}

type SearchFunction = (query: string) => Promise<ResearchSearchResult>;

const platformSearches: Array<{ platform: ResearchPlatform; search: SearchFunction }> = [
  { platform: "twitter", search: searchTwitter },
  { platform: "reddit", search: searchReddit },
  { platform: "youtube", search: searchYouTube },
  { platform: "bilibili", search: searchBilibili },
  { platform: "xhs", search: searchXhs },
  { platform: "exa", search: searchExa },
];

export async function researchAll(query: string): Promise<ResearchAllResult> {
  const platformResults = await Promise.all(
    platformSearches.map(({ platform, search }) =>
      search(query).catch((error): ResearchSearchResult => ({
        platform,
        items: [],
        unavailable: error instanceof Error ? error.message : "The integration command failed.",
      })),
    ),
  );

  const rawItems = platformResults.flatMap((result) => result.items);
  const news = rawItems.flatMap((item) => {
    const normalized = normalizeRawResearchItem(item);
    return normalized.ok ? [normalized.item] : [];
  });

  const unavailablePlatforms = platformResults.flatMap((result) =>
    result.unavailable ? [{ platform: result.platform, unavailable: result.unavailable }] : [],
  );

  return { query, platformResults, rawItems, news, unavailablePlatforms };
}
