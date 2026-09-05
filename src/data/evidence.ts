export type EvidenceRelationship =
  | "supporting"
  | "contradicting"
  | "neutral";

export interface Evidence {
  id: string;
  factCheckId: string;
  sourceId: string;
  content: string;
  relevance: number;
  relationship: EvidenceRelationship;
  publishedAt: string | null; 
}

export interface EvidenceSummary {
  total: number;
  supporting: number;
  contradicting: number;
  neutral: number;
  supportPercentage: number;
}


export const evidence: Evidence[] = [
  {
  id: "EV001",
  factCheckId: "FC001",
  sourceId: "SRC001",
  content: "Company X officially announced the launch of its new AI model.",
  relevance: 98,
  relationship: "supporting",
  publishedAt: "2026-08-29",
},
  {
  id: "EV001",
  factCheckId: "FC001",
  sourceId: "SRC001",
  content: "Company X officially announced the launch of its new AI model.",
  relevance: 98,
  relationship: "supporting",
  publishedAt: "2026-08-29",
  },

  {
  id: "EV003",
  factCheckId: "FC001",
  sourceId: "SRC003",
  content: "A social media post claimed that the AI model was not released.",
  relevance: 60,
  relationship: "contradicting",
  publishedAt: "2026-08-29",
},
];

export function calculateSupportPercentage(
  evidenceItems: Evidence[],
): number {
  if (evidenceItems.length === 0) return 0;

  const totalRelevance = evidenceItems.reduce(
    (total, item) => total + item.relevance,
    0,
  );

  if (totalRelevance === 0) return 0;

  const supportingRelevance = evidenceItems
    .filter((item) => item.relationship === "supporting")
    .reduce((total, item) => total + item.relevance, 0);

  return Math.round((supportingRelevance / totalRelevance) * 100);
}

export function findEvidenceById(id: string): Evidence | undefined {
  return evidence.find((item) => item.id === id);
}

export function getEvidenceForFactCheck(
  factCheckId: string,
): Evidence[] {
  return evidence.filter(
    (item) => item.factCheckId === factCheckId,
  );
}

export function summarizeEvidence(
  evidenceItems: Evidence[],
): EvidenceSummary {
  const supporting = evidenceItems.filter(
    (item) => item.relationship === "supporting",
  ).length;

  const contradicting = evidenceItems.filter(
    (item) => item.relationship === "contradicting",
  ).length;

  const neutral = evidenceItems.filter(
    (item) => item.relationship === "neutral",
  ).length;

  return {
    total: evidenceItems.length,
    supporting,
    contradicting,
    neutral,
    supportPercentage: calculateSupportPercentage(evidenceItems),
  };
}
