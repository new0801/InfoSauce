import type { DailyArticle } from "./dailyTypes";

export function dailyCardTitle(article: Pick<DailyArticle, "title" | "headline" | "claim">): string {
  return article.headline?.trim() || article.claim?.trim() || article.title;
}
