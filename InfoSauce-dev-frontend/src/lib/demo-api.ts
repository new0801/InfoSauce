export type EvidenceSource = {
  title: string;
  source: string;
  url: string;
  content: string;
  publishedAt: string | null;
};

export type DemoArticle = {
  id: string;
  demoMode: true;
  title: string;
  summary: string;
  source: string;
  platform: string;
  url: string | null;
  publishedAt: string | null;
  claim: string | null;
  evidence: EvidenceSource[];
  verifiable: boolean;
  verificationStatus: "UNVERIFIED" | "NOT VERIFIABLE";
};

export type DemoTopic = {
  id: string;
  demoMode: true;
  title: string;
  summary: string;
  source: string;
  platform: string;
  relatedArticleId: string | null;
};

export type DemoVerification = {
  claim: string;
  evidence: EvidenceSource[];
  verification: {
    results: Array<{
      model: string;
      requestId: string;
      result: {
        verdict: string;
        confidence: number;
        reasoning: string;
      };
    }>;
    failures: Array<{ model: string; status: string; category: string }>;
  };
  verificationTrace: Array<{ model: string; requestId: string }>;
  verificationSummary: {
    mode: "full" | "degraded";
    degraded: boolean;
    successfulModels: number;
    configuredModels: number;
    failedModels: number;
  };
  consensus: { verdict: string };
  truthScore: { truthScore: number };
};

type DemoResponse<T> = T & { success: boolean; demoMode: boolean; notice: string };

async function requestDemo<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.error?.message || "The demo request could not be completed.");
  }

  return data as T;
}

export async function fetchDemoTrending() {
  return requestDemo<DemoResponse<{ topics: DemoTopic[] }>>("/api/demo/trending");
}

export async function fetchDemoDaily() {
  return requestDemo<DemoResponse<{ articles: DemoArticle[] }>>("/api/demo/daily");
}

export async function fetchDemoArticle(id: string) {
  return requestDemo<DemoResponse<{ article: DemoArticle }>>(
    `/api/demo/daily/${encodeURIComponent(id)}`
  );
}

export async function verifyDemoCase(caseId: string) {
  return requestDemo<DemoResponse<DemoVerification>>(
    `/api/demo/verify/${encodeURIComponent(caseId)}`,
    { method: "POST" }
  );
}
