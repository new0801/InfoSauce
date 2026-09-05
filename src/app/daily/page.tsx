"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import NewsCard from "../../components/NewsCard";
import { getDailyArticles, saveDailyArticles, replaceDailyArticle } from "../../data/dailyArticleStore";
import { dailyCardTitle } from "../../data/dailyPresentation";
import { isRetryableDailyVerification, prioritizeDailyArticles } from "../../data/dailyVerification";
import type { DailyArticle, DailyResponse } from "../../data/dailyTypes";

const categories = [
  "AI & Technology",
  "K-Pop & Entertainment",
  "World & Local",
  "Business & Lifestyle",
  "Sports & Gaming",
];

function verificationStateLabel(article: DailyArticle): string {
  if (article.verificationStatus === "verified") return "Verified by Gonka";
  if (article.verificationStatus === "not_verifiable") return "Not verifiable — no factual claim could be extracted";
  if (article.verificationStatus === "gonka_timeout") return "Verification unavailable — Gonka timeout";
  if (article.verificationStatus === "gonka_http_error") return "Verification unavailable — Gonka HTTP error";
  if (article.verificationStatus === "gonka_auth_error") return "Verification unavailable — Gonka authentication error";
  if (article.verificationStatus === "gonka_network_error") return "Verification unavailable — Gonka network error";
  if (article.verificationStatus === "gonka_polling_error") return "Verification unavailable — Gonka polling error";
  if (article.verificationStatus === "gonka_failed") return "Verification unavailable — all Gonka verification models failed";
  if (article.verificationStatus === "evidence_timeout") return "Evidence unavailable — retrieval timed out";
  if (article.verificationStatus === "evidence_unavailable") return "Evidence unavailable";
  return `Verification unavailable${article.verificationUnavailable ? ` — ${article.verificationUnavailable}` : ""}`;
}

export default function DailyPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedNews, setGeneratedNews] = useState<DailyArticle[]>([]);
  const [unavailablePlatforms, setUnavailablePlatforms] = useState<Array<{ platform: string; unavailable: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTouchedRef = useRef(false);

  const scrollToGenerate = () => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => window.scrollTo({ top: 96, behavior: "smooth" }), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedArticles = getDailyArticles();
      if (savedArticles.length > 0) {
        setGeneratedNews(savedArticles);
        setHasGenerated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    const timer = window.setTimeout(() => {
      if (!searchTouchedRef.current) scrollToGenerate();
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [selectedCategory]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = window.setTimeout(scrollToGenerate, 2000);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function generateNews() {
    const query = searchQuery.trim() || selectedCategory;
    if (!query) return;

    setHasGenerated(true);
    setIsLoading(true);
    setRequestError("");

    try {
      const response = await fetch("/api/integration/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error(`Daily verification returned ${response.status}`);

      const data = (await response.json()) as DailyResponse;
      const articles = Array.isArray(data.articles) ? data.articles : [];
      const rankedArticles = prioritizeDailyArticles(articles);
      setGeneratedNews(rankedArticles);
      setUnavailablePlatforms(data.unavailablePlatforms || []);
      saveDailyArticles(rankedArticles);
    } catch (error) {
      setGeneratedNews([]);
      setUnavailablePlatforms([]);
      setRequestError(error instanceof Error ? error.message : "Unable to load daily news right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function retryVerification(article: DailyArticle) {
    if (retryingIds.includes(article.id) || !isRetryableDailyVerification(article)) return;

    setRetryingIds((ids) => [...ids, article.id]);
    setRetryErrors((errors) => ({ ...errors, [article.id]: "" }));
    try {
      const response = await fetch("/api/integration/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryArticleId: article.id, article }),
      });
      const data = await response.json() as { article?: DailyArticle; message?: string };
      if (data.article) {
        setGeneratedNews((current) => {
          const cached = replaceDailyArticle(data.article!, current);
          const updated = prioritizeDailyArticles(cached);
          return updated;
        });
      }
      if (!response.ok || !data.article || data.article.verificationStatus !== "verified") {
        setRetryErrors((errors) => ({ ...errors, [article.id]: data.message || data.article?.verificationUnavailable || "Verification timed out. Try again." }));
      }
    } catch {
      setRetryErrors((errors) => ({ ...errors, [article.id]: "Verification timed out. Try again." }));
    } finally {
      setRetryingIds((ids) => ids.filter((id) => id !== article.id));
    }
  }

  const visibleNews = prioritizeDailyArticles(generatedNews, retryingIds);

  return (
    <GlowCursor className="relative isolate min-h-screen overflow-hidden bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA" trailLength={40} trailWidth={8} trailTaper={0.8} followSpeed={0.16} glowIntensity={1.9} glowSpread={1.2} hotspot={0.65} brightness={1.25} opacity={1} pulseSpeed={1.1} noiseStrength={0} idleFade idleTimeout={700} fadeDuration={900} blendMode="screen">
      <video aria-hidden="true" autoPlay loop muted playsInline className="fixed inset-0 z-0 h-screen w-screen object-cover">
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>
      <Navbar />

      {/* Header */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <h1 className="animate-fade-rise text-5xl leading-[0.95] tracking-[-2.46px] sm:text-7xl">
          Your DailySauce
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Choose what you care about. We&apos;ll bring you
          the information you shouldn&apos;t miss.
        </p>

        <p className="animate-fade-rise-delay mt-3 text-sm text-muted-foreground">
          {today}
        </p>
      </section>

      {/* Category Selection */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-12">
        <h2 className="mb-5 text-3xl">
          Choose Your Interests
        </h2>

        <div className="animate-fade-rise-delay-2 flex flex-wrap gap-3">
          {categories.map((category) => {
            const isSelected =
              selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => { searchTouchedRef.current = false; setSelectedCategory((current) => current === category ? "" : category); setHasGenerated(false); }}
                aria-pressed={isSelected}
                className={`rounded-full px-5 py-3 text-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  isSelected
                    ? "glassmorphism glassmorphism--deep font-medium text-foreground shadow-lg"
                    : "glassmorphism glassmorphism--deep text-muted-foreground hover:scale-[1.03] hover:text-foreground"
                }`}
              >
                {category === "AI & Technology" &&
                  "🤖 "}
                {category === "K-Pop & Entertainment" &&
                  "🎵 "}
                {category === "World & Local" &&
                  "🌍 "}
                {category === "Business & Lifestyle" &&
                  "💰 "}
                {category === "Sports & Gaming" &&
                  "⚽ "}

                {category}

                {isSelected && " ✓"}
              </button>
            );
          })}
        </div>

        <div ref={searchRef} className="mx-auto mt-20 max-w-2xl text-center">
          <label htmlFor="daily-search" className="mb-5 inline-block rounded-full bg-white/10 px-5 py-2 text-3xl text-foreground sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Search news or related information
          </label>
          <input
            id="daily-search"
            type="search"
            value={searchQuery}
            onFocus={() => { searchTouchedRef.current = true; }}
            onChange={(event) => { setSearchQuery(event.target.value); setHasGenerated(false); }}
            placeholder="e.g. AI, K-pop, technology"
            className="glassmorphism glassmorphism--deep w-full rounded-2xl px-5 py-4 text-left text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-white/50"
          />
        </div>

        <div className="mt-24 flex flex-col items-center gap-6 text-center">
          <h2 className="text-4xl sm:text-5xl">Generate Your Daily News</h2>
          <button
            type="button"
            disabled={!selectedCategory && !searchQuery.trim()}
            onClick={generateNews}
            className="glassmorphism glassmorphism--deep rounded-full px-7 py-3 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate
          </button>
        </div>
      </section>

      <section className="frosted-news relative z-10 mx-auto mb-16 max-w-4xl rounded-[2rem] px-6 py-10 sm:p-10">
          <h2 className="mb-6 text-3xl">Your Daily News</h2>
          {hasGenerated && (isLoading ? (
            <p className="glassmorphism rounded-2xl p-6 text-muted-foreground">Finding your daily news...</p>
          ) : requestError ? (
            <p className="glassmorphism rounded-2xl p-6 text-muted-foreground">{requestError}</p>
          ) : visibleNews.length === 0 ? (
            <p className="glassmorphism rounded-2xl p-6 text-muted-foreground">No matching news found for this search yet.</p>
          ) : (
            <div className="space-y-6">
              {visibleNews.map((item) => (
                <article key={item.id} id={item.id}>
                  <NewsCard
                    category={item.topic || item.area}
                    title={dailyCardTitle(item)}
                    summary={item.content}
                    content={item.content}
                    platform={item.platform}
                    verificationState={verificationStateLabel(item)}
                    status={item.verificationStatus === "verified" ? "Verified" : item.verificationStatus === "not_verifiable" ? "Not verifiable" : "Unverified"}
                    sources={item.evidence?.length ?? 0}
                    onRetryVerification={isRetryableDailyVerification(item) ? () => retryVerification(item) : undefined}
                    retrying={retryingIds.includes(item.id)}
                    retryError={retryErrors[item.id]}
                    onReadMore={() => router.push(`/daily/${encodeURIComponent(item.id)}`)}
                  />
                </article>
              ))}
            </div>
          ))}
          {hasGenerated && unavailablePlatforms.length > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              Unavailable platforms: {unavailablePlatforms.map((item) => item.platform).join(", ")}
            </p>
          )}
        </section>
    </GlowCursor>
  );
}
