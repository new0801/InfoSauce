export interface Evidence {
  id: string;
  factCheckId: string;
  sourceId: string;
  content: string;
  relevance: number;
  publishedAt: string;
}

export const evidence: Evidence[] = [
  {
    id: "EV001",
    factCheckId: "FC001",
    sourceId: "SRC001",
    content: "Company X officially announced the launch of its new AI model.",
    relevance: 98,
    publishedAt: "2026-08-29",
  },
  {
    id: "EV002",
    factCheckId: "FC001",
    sourceId: "SRC002",
    content: "A technology news website reported the same AI model launch.",
    relevance: 90,
    publishedAt: "2026-08-29",
  },
];
