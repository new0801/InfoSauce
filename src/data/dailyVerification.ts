import type { DailyArticle } from "./dailyTypes";

const retryableStatuses = new Set<DailyArticle["verificationStatus"]>([
  "gonka_timeout",
  "gonka_http_error",
  "gonka_network_error",
  "gonka_polling_error",
  "gonka_failed",
  "failed",
]);

export function isRetryableDailyVerification(article: DailyArticle): boolean {
  return retryableStatuses.has(article.verificationStatus);
}

export function prioritizeDailyArticles(articles: DailyArticle[], retryingIds: Iterable<string> = []): DailyArticle[] {
  const retrying = new Set(retryingIds);
  const priority = (article: DailyArticle) => {
    if (article.verificationStatus === "verified") return 1;
    if (retrying.has(article.id)) return 2;
    if (isRetryableDailyVerification(article)) return 3;
    return 4;
  };

  return articles
    .map((article, index) => ({ article, index }))
    .sort((left, right) => priority(left.article) - priority(right.article) || left.index - right.index)
    .map(({ article }) => article);
}
