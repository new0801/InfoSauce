export interface ResearchItem {
  id: string;
  title: string;
  content: string;
  url: string;

  platform: string;
  author?: string;
  publishedAt?: string;

  mainCategory?: string;
  subCategory?: string;

  contentType?: string;

  engagement?: {
    score?: number;
    comments?: number;
    likes?: number;
    views?: number;
  };
}
