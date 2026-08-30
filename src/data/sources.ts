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
