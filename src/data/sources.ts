export type SourceType = "official" | "news" | "social_media";

export interface Source {
  id: string;
  name: string;
  platform: string;
  url: string;
  sourceType: SourceType;
  credibility?: number;
}

export const sources: Source[] = [
  {
    id: "SRC001",
    name: "Example Official Website",
    platform: "Official Website",
    url: "https://example.com",
    sourceType: "official",
    credibility: 95,
  },
  {
    id: "SRC002",
    name: "Example News Website",
    platform: "News Website",
    url: "https://example.com/news",
    sourceType: "news",
    credibility: 85,
  },
  {
    id: "SRC003",
    name: "Example Social Media",
    platform: "X",
    url: "https://example.com/social",
    sourceType: "social_media",
    credibility: 70,
  },
];

export function findSourceById(id: string): Source | undefined {
  return sources.find((source) => source.id === id);
}

export function getSourceCredibility(source: Source): number {
  if (source.credibility !== undefined) {
    return source.credibility;
  }

  switch (source.sourceType) {
    case "official":
      return 95;
    case "news":
      return 85;
    case "social_media":
      return 70;
    default:
      return 50;
  }
}
