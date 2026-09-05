export type DailyEvidence = {
  evidenceIndex?: number;
  title?: string | null;
  content?: string | null;
  source?: string | null;
  url?: string | null;
  platform?: string | null;
  publishedAt?: string | null;
};

export type DailyArticle = {
  id: string;
  area: string;
  topic: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: string | null;
  platform?: string;
  claim?: string;
  headline?: string;
  factCheckable?: boolean;
  evidenceStatus?: "available" | "unavailable" | "timeout" | "not_applicable";
  verificationStatus?: "verified" | "not_verifiable" | "unavailable" | "failed" | "evidence_timeout" | "evidence_unavailable" | "gonka_http_error" | "gonka_auth_error" | "gonka_network_error" | "gonka_polling_error" | "gonka_timeout" | "gonka_failed";
  verificationUnavailable?: string;
  evidence?: DailyEvidence[];
  consensus?: { verdict?: "TRUE" | "FALSE" | "UNCERTAIN" };
  truthScore?: {
    truthScore?: number | null;
    truthScoreLabel?: string;
    averageConfidence?: number;
    consensusType?: string;
    consensusFactor?: number;
    verdict?: string;
  };
  verification?: {
    results?: Array<{
      model?: string;
      requestId?: string;
      result?: { reasoning?: string };
    }>;
    failures?: Array<{
      model?: string;
      requestId?: string;
      status?: string;
      error?: string;
      code?: string;
    }>;
  };
  verificationTrace?: Array<{
    stage: "claim_extraction" | "evidence_retrieval" | "evidence_selection" | "gonka_verification" | "daily_pipeline";
    status: string;
    code?: string;
    attempt?: string;
    evidenceCount?: number;
    selectedEvidenceCount?: number;
    requestIds?: string[];
    pollAttempts?: number;
  }>;
};

export type DailyResponse = {
  success?: boolean;
  articles?: DailyArticle[];
  unavailablePlatforms?: Array<{ platform: string; unavailable: string }>;
};
