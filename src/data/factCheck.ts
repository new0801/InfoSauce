export interface FactCheck {
  id: string;
  newsId: string;
  claim: string;
  verdict: "True" | "False" | "Misleading" | "Unverified";
  confidence: number;
  reason: string;
  evidenceIds: string[];
  checkedAt: string;
}

export const factChecks: FactCheck[] = [
  {
    id: "FC001",
    newsId: "AI001",
    claim: "Company X released a new AI model.",
    verdict: "True",
    confidence: 92,
    reason: "The claim is supported by multiple reliable sources.",
    evidenceIds: ["EV001", "EV002"],
    checkedAt: "2026-08-30",
  },
];