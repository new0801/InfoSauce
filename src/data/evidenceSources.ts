export type EvidenceSourceInput = {
  title?: string | null;
  source?: string | null;
  url?: string | null;
  publishedAt?: string | null;
};

export function toEvidenceSources(evidence: EvidenceSourceInput[] | null | undefined) {
  return (evidence || []).map((item) => ({
    ...(typeof item.title === "string" ? { title: item.title } : {}),
    ...(typeof item.source === "string" ? { source: item.source } : {}),
    ...(typeof item.url === "string" ? { url: item.url } : {}),
    ...(typeof item.publishedAt === "string" ? { publishedAt: item.publishedAt } : {}),
  }));
}
