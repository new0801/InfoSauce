import type { DailyArticle } from "./dailyTypes";

const storageKey = "infosauce:daily-articles";

export function saveDailyArticles(articles: DailyArticle[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey, JSON.stringify(articles));
}

export function replaceDailyArticle(article: DailyArticle, existingArticles = getDailyArticles()): DailyArticle[] {
  const articles = existingArticles.map((current) => current.id === article.id ? article : current);
  saveDailyArticles(articles);
  return articles;
}

export function getDailyArticle(id: string): DailyArticle | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) || "[]") as DailyArticle[];
    return stored.find((article) => article.id === id) || null;
  } catch {
    return null;
  }
}

export function getDailyArticles(): DailyArticle[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) || "[]");
    return Array.isArray(stored) ? stored as DailyArticle[] : [];
  } catch {
    return [];
  }
}
