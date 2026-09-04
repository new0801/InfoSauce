import { news, NewsItem } from "./news";
import { sources } from "./sources";
import { factChecks } from "./factCheck";
import { evidence } from "./evidence";

export function getNewsByArea(area: string): NewsItem[] {
  return news.filter((item) => item.area === area);
}

export function getNewsByTopic(topic: string): NewsItem[] {
  return news.filter((item) => item.topic === topic);
}

export function getNewsById(id: string): NewsItem | undefined {
  return news.find((item) => item.id === id);
}

export function getSourceById(id: string) {
  return sources.find((source) => source.id === id);
}

export function getFactCheckByNewsId(newsId: string) {
  return factChecks.find((factCheck) => factCheck.newsId === newsId);
}

export function getEvidenceByFactCheckId(factCheckId: string) {
  return evidence.filter(
    (item) => item.factCheckId === factCheckId
  );
}

export function getFactCheckDetails(newsId: string) {
  const factCheck = getFactCheckByNewsId(newsId);

  if (!factCheck) {
    return null;
  }

  const factCheckEvidence = getEvidenceByFactCheckId(factCheck.id);

  const evidenceWithSources = factCheckEvidence.map((item) => ({
    ...item,
    source: getSourceById(item.sourceId),
  }));

  return {
    ...factCheck,
    evidence: evidenceWithSources,
  };
}