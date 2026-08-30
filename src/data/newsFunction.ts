import { news, NewsItem } from "./news";

export function getNewsByArea(area: string): NewsItem[] {
  return news.filter((item) => item.area === area);
}

export function getNewsByTopic(topic: string): NewsItem[] {
  return news.filter((item) => item.topic === topic);
}

export function getNewsById(id: string): NewsItem | undefined {
  return news.find((item) => item.id === id);
}