export type Verdict = "TRUE" | "FALSE" | "UNCERTAIN";

export type EvidenceItem = {
  evidenceIndex?: number;
  title?: string | null;
  content?: string | null;
  url?: string | null;
  source?: string | null;
  platform?: string | null;
  publishedAt?: string | null;
};

export type VerificationTrace = {
  model: string;
  requestId: string;
};

type RawRecord = Record<string, unknown>;

export type DailyResult = {
  id: string | null;
  title: string;
  content: string;
  source: string;
  sourceType?: string;
  url: string;
  publishedAt?: string | null;
  claim: string;
  verdict: Verdict;
  truthScore: number;
  consensus: { verdict: Verdict };
  reasoning: string[];
  evidence: EvidenceItem[];
  requestIds: VerificationTrace[];
};

export type TrendingResult = {
  category: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  claim: string;
  verdict: Verdict;
  truthScore: number;
  consensus: { verdict: Verdict };
  evidence: EvidenceItem[];
  requestIds: VerificationTrace[];
  reasoning: string;
};

function asRecord(value: unknown): RawRecord {
  return value !== null && typeof value === "object"
    ? (value as RawRecord)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asVerdict(value: unknown): Verdict {
  return value === "TRUE" || value === "FALSE" || value === "UNCERTAIN"
    ? value
    : "UNCERTAIN";
}

function asScore(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const nestedScore = asRecord(value).truthScore;
  return typeof nestedScore === "number" && Number.isFinite(nestedScore)
    ? nestedScore
    : 0;
}

function asEvidence(value: unknown): EvidenceItem[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is EvidenceItem => item !== null && typeof item === "object"
      )
    : [];
}

function asRequestIds(value: unknown): VerificationTrace[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const trace = asRecord(item);
    const model = asText(trace.model);
    const requestId = asText(trace.requestId);

    return model && requestId ? [{ model, requestId }] : [];
  });
}

function asReasoning(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function verdictFrom(item: RawRecord): Verdict {
  const consensus = asRecord(item.consensus);
  return asVerdict(item.verdict ?? consensus.verdict);
}

export function normalizeDailyResult(value: unknown): DailyResult {
  const item = asRecord(value);
  const verdict = verdictFrom(item);
  const consensus = asRecord(item.consensus);

  return {
    id: typeof item.id === "string" ? item.id : null,
    title: asText(item.title) || "Untitled Story",
    content: asText(item.content),
    source: asText(item.source),
    sourceType: asText(item.sourceType) || undefined,
    url: asText(item.url),
    publishedAt: asText(item.publishedAt) || null,
    claim: asText(item.claim),
    verdict,
    truthScore: asScore(item.truthScore),
    consensus: { verdict: asVerdict(consensus.verdict ?? verdict) },
    reasoning: asReasoning(item.reasoning),
    evidence: asEvidence(item.evidence),
    requestIds: asRequestIds(item.requestIds),
  };
}

export function normalizeTrendingItem(value: unknown): TrendingResult {
  const item = asRecord(value);
  const news = asRecord(item.news);
  const verdict = verdictFrom(item);
  const consensus = asRecord(item.consensus);
  const verification = asRecord(item.verification);
  const verificationResults = Array.isArray(verification.results)
    ? verification.results
    : [];
  const requestIds = asRequestIds(item.verificationTrace);
  const fallbackRequestIds = asRequestIds(verificationResults);
  const reasoning = verificationResults
    .map((result) => asText(asRecord(asRecord(result).result).reasoning))
    .find(Boolean);

  return {
    category: asText(item.category) || asText(news.area) || "Trending",
    title: asText(news.title) || asText(item.claim) || "Untitled Story",
    content: asText(news.content) || asText(item.claim),
    source: asText(news.source),
    url: asText(news.url) || undefined,
    claim: asText(item.claim),
    verdict,
    truthScore: asScore(item.truthScore),
    consensus: { verdict: asVerdict(consensus.verdict ?? verdict) },
    evidence: asEvidence(item.evidence),
    requestIds: requestIds.length > 0 ? requestIds : fallbackRequestIds,
    reasoning: reasoning || "No verification reasoning available.",
  };
}
