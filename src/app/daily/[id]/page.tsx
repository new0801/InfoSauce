"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FactCheckResult from "../../../components/FactCheckResult";
import GlowCursor from "../../../components/GlowCursor";
import Navbar from "../../../components/Navbar";
import { getDailyArticle } from "../../../data/dailyArticleStore";
import { toEvidenceSources } from "../../../data/evidenceSources";
import type { DailyArticle } from "../../../data/dailyTypes";

function verificationMessage(article: DailyArticle): string {
  if (article.verificationStatus === "not_verifiable") return "Not verifiable: no factual claim could be extracted from this article.";
  if (article.verificationStatus === "gonka_timeout") return "Verification unavailable: Gonka timeout.";
  if (article.verificationStatus === "gonka_http_error") return "Verification unavailable: Gonka HTTP error.";
  if (article.verificationStatus === "gonka_auth_error") return "Verification unavailable: Gonka authentication error.";
  if (article.verificationStatus === "gonka_network_error") return "Verification unavailable: Gonka network error.";
  if (article.verificationStatus === "gonka_polling_error") return "Verification unavailable: Gonka polling error.";
  if (article.verificationStatus === "gonka_failed") return "Verification unavailable: all Gonka verification models failed.";
  if (article.verificationStatus === "evidence_timeout") return "Evidence unavailable: retrieval timed out.";
  if (article.verificationStatus === "evidence_unavailable") return `Evidence unavailable: ${article.verificationUnavailable || "No usable evidence was returned."}`;
  if (article.verificationStatus === "unavailable") return `Verification unavailable: ${article.verificationUnavailable || "The verification service did not return a result."}`;
  return article.verificationUnavailable || "No verification result is available for this article.";
}

function consensusMessage(type?: string): string | undefined {
  const messages: Record<string, string> = {
    agreement_true: "Models agree the evidence supports the claim.",
    agreement_false: "Models agree the evidence contradicts the claim.",
    agreement_uncertain: "Models agree the evidence is insufficient.",
    true_false_disagreement: "Models actively disagree.",
    partial_true_uncertain: "One model supports the claim; another finds the evidence insufficient.",
    partial_false_uncertain: "One model contradicts the claim; another finds the evidence insufficient.",
    single_model_only: "Only one model returned a valid verification result.",
  };
  return type ? messages[type] || type : undefined;
}

export default function DailyArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<DailyArticle | null | undefined>(undefined);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    router.replace("/daily");
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setArticle(getDailyArticle(decodeURIComponent(id)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);

  return (
    <GlowCursor className="relative isolate min-h-screen overflow-hidden bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA" trailLength={40} trailWidth={8} trailTaper={0.8} followSpeed={0.16} glowIntensity={1.9} glowSpread={1.2} hotspot={0.65} brightness={1.25} opacity={1} pulseSpeed={1.1} noiseStrength={0} idleFade idleTimeout={700} fadeDuration={900} blendMode="screen">
      <Navbar />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-28">
        <button type="button" onClick={goBack} className="mb-8 inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm text-muted-foreground transition hover:border-white/40 hover:text-foreground">
          ← Back
        </button>
        {article === undefined ? (
          <p className="text-muted-foreground">Loading DailySauce article…</p>
        ) : article === null ? (
          <section className="glassmorphism rounded-3xl p-8">
            <h1 className="text-4xl">DailySauce article unavailable</h1>
            <p className="mt-4 text-muted-foreground">Generate DailySauce again, then open the selected article from its card.</p>
            <Link href="/daily" className="mt-6 inline-block underline underline-offset-4">Back to DailySauce</Link>
          </section>
        ) : (
          <article className="trending-scrollbar glassmorphism rounded-3xl p-8 sm:p-14">
            <p className="mb-5 text-lg text-muted-foreground">{article.topic || article.area}</p>
            <h1 className="max-w-3xl text-4xl leading-tight tracking-[-0.02em] sm:text-5xl">{article.headline || article.title}</h1>

            <dl className="mt-8 grid gap-4 border-t border-white/15 pt-5 text-sm text-muted-foreground sm:grid-cols-2">
              <div><dt className="font-medium text-foreground">Platform</dt><dd>{article.platform || "Not provided"}</dd></div>
              <div><dt className="font-medium text-foreground">Source</dt><dd>{article.source}</dd></div>
              <div><dt className="font-medium text-foreground">Published date</dt><dd>{article.publishedAt || "Not provided"}</dd></div>
              {article.headline && article.headline !== article.title && <div className="sm:col-span-2"><dt className="font-medium text-foreground">Original title</dt><dd>{article.title}</dd></div>}
            </dl>

            <p className="mt-7 max-w-prose text-lg leading-8 text-muted-foreground">{article.content}</p>

            {article.claim && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl">Claim</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{article.claim}</p>
              </section>
            )}

            {article.verification?.results?.length ? (
              <FactCheckResult
                accuracy={Math.round(article.truthScore?.truthScore || 0)}
                verdict={article.truthScore?.verdict || article.consensus?.verdict || "UNCERTAIN"}
                truthScoreLabel={article.truthScore?.truthScoreLabel}
                consensus={consensusMessage(article.truthScore?.consensusType)}
                averageConfidence={article.truthScore?.averageConfidence}
                explanation={article.verification.results[0]?.result?.reasoning || "No verification reasoning available."}
                sources={toEvidenceSources(article.evidence)}
                verificationRequests={[...(article.verification.results || []), ...(article.verification.failures || [])].flatMap((item) =>
                  typeof item.model === "string" && typeof item.requestId === "string"
                    ? [{ model: item.model, requestId: item.requestId }]
                    : [],
                )}
              />
            ) : (
              <section className="glassmorphism mt-12 rounded-3xl p-6 sm:p-8">
                <h2 className="mb-3 text-3xl">Gonka AI Verification</h2>
                <p className="leading-7 text-muted-foreground">{verificationMessage(article)}</p>
              </section>
            )}

            {article.evidence && article.evidence.length > 0 && (
              <section className="mt-10">
                <h2 className="text-2xl">Evidence</h2>
                <div className="mt-5 space-y-4">
                  {article.evidence.map((item, index) => (
                    <article key={item.url || index} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>Evidence {index + 1}</span>
                        <span aria-hidden="true">•</span>
                        <span>{item.source || item.platform || "Source unavailable"}</span>
                      </div>
                      {item.title && <h3 className="mt-3 text-lg">{item.title}</h3>}
                      {item.content && <p className="mt-2 max-w-prose leading-7 text-muted-foreground">{item.content}</p>}
                      {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm underline underline-offset-4">View evidence source</a>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <a href={article.url} target="_blank" rel="noopener noreferrer" className="mt-10 inline-block rounded-full border border-white/20 px-6 py-3 text-sm underline underline-offset-4">
              Read Original Source
            </a>
          </article>
        )}
      </main>
    </GlowCursor>
  );
}
