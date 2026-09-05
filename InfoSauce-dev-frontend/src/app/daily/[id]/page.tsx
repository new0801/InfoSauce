"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DemoModeNotice from "../../../components/DemoModeNotice";
import FactCheckResult from "../../../components/FactCheckResult";
import GlowCursor from "../../../components/GlowCursor";
import Navbar from "../../../components/Navbar";
import {
  DemoArticle,
  DemoVerification,
  fetchDemoArticle,
  verifyDemoCase,
} from "../../../lib/demo-api";

export default function DailyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [article, setArticle] = useState<DemoArticle | null>(null);
  const [result, setResult] = useState<DemoVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDemoArticle(id)
      .then((data) => setArticle(data.article))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "This demo article is unavailable."));
  }, [id]);

  async function verify() {
    if (!article?.verifiable) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await verifyDemoCase(article.id));
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Live Gonka verification could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlowCursor className="relative min-h-screen bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA">
      <Navbar />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <Link href="/daily" className="text-sm underline underline-offset-4">← Daily Sauce</Link>
        {error && !article ? <p className="mt-8 text-rose-200">{error}</p> : null}
        {article && (
          <>
            <p className="mt-8 text-sm text-muted-foreground">{article.platform} · {article.source}</p>
            <h1 className="mt-4 text-5xl leading-none sm:text-7xl">{article.title}</h1>
            <DemoModeNotice />
            <p className="mt-8 text-lg leading-8 text-muted-foreground">{article.summary}</p>
            <section className="glassmorphism mt-8 rounded-3xl p-6">
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Prepared claim</p>
              <p className="mt-3 text-xl">{article.claim || "This item does not contain a concrete factual claim."}</p>
              <p className="mt-5 text-sm text-muted-foreground">Status: {result ? "VERIFIED" : article.verificationStatus}</p>
            </section>
            {article.evidence.length > 0 && (
              <section className="mt-10">
                <h2 className="text-3xl">Prepared evidence</h2>
                <div className="mt-5 space-y-4">
                  {article.evidence.map((evidence) => (
                    <article key={evidence.url} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm text-muted-foreground">{evidence.source}</p>
                      <h3 className="mt-2 text-xl">{evidence.title}</h3>
                      <p className="mt-3 leading-7 text-muted-foreground">{evidence.content}</p>
                      <a className="mt-4 inline-block text-sm underline underline-offset-4" target="_blank" rel="noreferrer" href={evidence.url}>View source →</a>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {article.verifiable ? (
              <button disabled={loading} onClick={verify} className="glassmorphism mt-10 rounded-full px-7 py-3 text-sm disabled:opacity-50">
                {loading ? "Verifying..." : "Verify with Gonka"}
              </button>
            ) : (
              <p className="mt-10 rounded-2xl border border-white/10 p-5 text-muted-foreground">NOT VERIFIABLE — this prepared item has no stable factual claim/evidence case.</p>
            )}
            {error && article && <p className="mt-5 text-rose-200">{error}</p>}
            {result && (
              <>
                {result.verificationSummary.degraded && <p className="mt-6 text-sm text-muted-foreground">Verification completed with {result.verificationSummary.successfulModels} of {result.verificationSummary.configuredModels} models.</p>}
                <FactCheckResult accuracy={Math.round(result.truthScore.truthScore)} verdict={result.consensus.verdict} verificationTrace={result.verificationTrace} explanation={result.verification.results[0]?.result.reasoning || "No verification reasoning available."} sources={result.evidence.map((item) => item.source)} />
              </>
            )}
          </>
        )}
      </main>
    </GlowCursor>
  );
}
