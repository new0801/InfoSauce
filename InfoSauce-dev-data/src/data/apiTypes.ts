import { NewsItem } from "./news";

export interface NewsListResponse {
  data: NewsItem[];
  count: number;
}

export interface NewsDetailResponse {
  data: NewsItem;
}

export interface ErrorResponse {
  error: string;
}
