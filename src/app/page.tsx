"use client";

import { useEffect, useRef, useState } from "react";
import GlowCursor from "../components/GlowCursor";
import FactCheckResult from "../components/FactCheckResult";
import Navbar from "../components/Navbar";
import NewsCard from "../components/NewsCard";
import { toEvidenceSources } from "../data/evidenceSources";
import {
  defaultTrendingNews,
  toDefaultVerificationInput,
  type DefaultTrendingNews,
} from "../data/defaultTrending";

type TrendingItem = {
  category?: string;
  claim?: string;

  news?: {
    id?: string;
    title?: string;
    content?: string;
    url?: string;
    source?: string;
    publishedAt?: string;
    area?: string;
  };

  evidence?: Array<{
    evidenceIndex?: number;
    title?: string | null;
    content?: string | null;
    url?: string | null;
    source?: string | null;
    platform?: string | null;
    publishedAt?: string | null;
  }>;

  consensus?: {
    verdict?: "TRUE" | "FALSE" | "UNCERTAIN";
    consensusReached?: boolean;
    voteCounts?: {
      TRUE?: number;
      FALSE?: number;
      UNCERTAIN?: number;
    };
    totalModels?: number;
    totalVotes?: number;
    failedModels?: number;
    disagreement?: boolean;
  };

  truthScore?: {
    truthScore?: number | null;
    truthScoreLabel?: string;
    averageConfidence?: number;
    baseScore?: number;
    coverage?: number;
    reliability?: number;
    consensusType?: string;
    consensusFactor?: number;
    verdict?: string;
  };

  verification?: {
    results?: Array<{
      model?: string;
      requestId?: string;

      result?: {
        verdict?: string;
        confidence?: number;
        reasoning?: string;

        evidence?: Array<{
          evidenceIndex?: number;
          support?: string;
        }>;
      };
    }>;

    failures?: Array<{
      model?: string;
      status?: string;
      error?: string;
    }>;
  };
};

type NewsCardItem = {
  category: string;
  title: string;
  summary: string;
  content: string;

  status:
    | "Supported"
    | "Partially Supported"
    | "False"
    | "Unverified";

  sources: number;

  href?: string;
  truthScore?: number | null;
  truthScoreDetails?: TrendingItem["truthScore"];

  consensus?: TrendingItem["consensus"];
  verification?: TrendingItem["verification"];
  evidence?: TrendingItem["evidence"];
  news?: TrendingItem["news"];
  claim?: string;
};

function statusFromVerdict(
  verdict?: "TRUE" | "FALSE" | "UNCERTAIN",
): NewsCardItem["status"] {
  if (verdict === "TRUE") {
    return "Supported";
  }

  if (verdict === "FALSE") {
    return "False";
  }

  return "Unverified";
}

function defaultArticleToNewsCard(
  article: DefaultTrendingNews,
  result?: TrendingItem,
): NewsCardItem {
  return {
    category: article.category,
    title: article.title,
    summary: article.summary,
    content: article.content,
    status: statusFromVerdict(result?.consensus?.verdict),
    sources: result?.evidence?.length ?? article.sources,
    href: article.href,
    truthScore: result?.truthScore?.truthScore ?? null,
    truthScoreDetails: result?.truthScore,
    consensus: result?.consensus,
    verification: result?.verification,
    evidence: result?.evidence ?? toDefaultVerificationInput(article).evidence,
    news: {
      title: article.title,
      content: article.content,
      url: article.href,
      source: article.source,
      publishedAt: article.publishedAt,
      area: article.category,
    },
    claim: result?.claim ?? article.summary,
  };
}

export default function Home() {
  const trendingRef = useRef<HTMLDivElement>(null);

  const [activeTrending, setActiveTrending] = useState(0);

  const [expandedNews, setExpandedNews] =
    useState<NewsCardItem | null>(null);

  const [defaultVerificationResults, setDefaultVerificationResults] =
    useState<Record<string, TrendingItem>>({});
  const [defaultVerificationLoading, setDefaultVerificationLoading] =
    useState<Record<string, boolean>>({});
  const [defaultVerificationErrors, setDefaultVerificationErrors] =
    useState<Record<string, string>>({});

  const defaultTrendingResults: NewsCardItem[] =
    defaultTrendingNews.map((article) =>
      defaultArticleToNewsCard(
        article,
        defaultVerificationResults[article.href],
      ),
    );

  // Saved default data is the sole source of Trending content on page load.
  const trendingResults: NewsCardItem[] = defaultTrendingResults;

  const verifyDefaultNews = async (article: DefaultTrendingNews) => {
    if (
      defaultVerificationLoading[article.href] ||
      defaultVerificationResults[article.href]
    ) {
      return;
    }

    setDefaultVerificationLoading((current) => ({
      ...current,
      [article.href]: true,
    }));
    setDefaultVerificationErrors((current) => {
      const { [article.href]: _removed, ...remaining } = current;
      return remaining;
    });

    try {
      const response = await fetch("/api/integration/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toDefaultVerificationInput(article)),
      });
      const data = (await response.json()) as TrendingItem & {
        success?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || `Verification returned ${response.status}`,
        );
      }

      setDefaultVerificationResults((current) => ({
        ...current,
        [article.href]: data,
      }));
      setExpandedNews((current) =>
        current?.href === article.href
          ? defaultArticleToNewsCard(article, data)
          : current,
      );
    } catch (error) {
      setDefaultVerificationErrors((current) => ({
        ...current,
        [article.href]:
          error instanceof Error
            ? error.message
            : "Verification is unavailable. Please try again later.",
      }));
    } finally {
      setDefaultVerificationLoading((current) => ({
        ...current,
        [article.href]: false,
      }));
    }
  };

  /*
   * Move the carousel to a specific story.
   */
  const goToTrending = (index: number) => {
    const total = trendingResults.length;

    if (total === 0) {
      return;
    }

    const nextIndex =
      (index + total) % total;

    const card =
      trendingRef.current?.children[
        nextIndex
      ] as HTMLElement | undefined;

    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });

    setActiveTrending(nextIndex);
  };

  const showPreviousTrending = () => {
    goToTrending(
      activeTrending - 1
    );
  };

  const showNextTrending = () => {
    goToTrending(
      activeTrending + 1
    );
  };

  /*
   * Automatically move to the next
   * trending story every 4 seconds.
   */
  useEffect(() => {
    if (trendingResults.length <= 1) {
      return;
    }

    const timer =
      window.setTimeout(
        () =>
          goToTrending(
            activeTrending + 1
          ),
        4000
      );

    return () =>
      window.clearTimeout(timer);
  }, [
    activeTrending,
    trendingResults.length,
  ]);

  /*
   * Keep the active carousel index
   * valid when the result count changes.
   */
  useEffect(() => {
    if (
      trendingResults.length > 0 &&
      activeTrending >=
        trendingResults.length
    ) {
      setActiveTrending(0);
    }
  }, [
    activeTrending,
    trendingResults.length,
  ]);

  return (
    <GlowCursor
      className="relative isolate min-h-screen overflow-hidden bg-background text-foreground"
      color="#67E8F9"
      secondaryColor="#A78BFA"
      trailLength={40}
      trailWidth={8}
      trailTaper={0.8}
      followSpeed={0.16}
      glowIntensity={1.9}
      glowSpread={1.2}
      hotspot={0.65}
      brightness={1.25}
      opacity={1}
      pulseSpeed={1.1}
      noiseStrength={0}
      idleFade
      idleTimeout={700}
      fadeDuration={900}
      blendMode="screen"
      enabled={!expandedNews}
    >
      {/* Background video */}
      <video
        aria-hidden="true"
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 z-0 h-screen w-screen object-cover"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      <Navbar />

      {/* =========================
          HERO
      ========================== */}

      <section className="relative z-10 mx-auto flex min-h-[65vh] max-w-7xl flex-col items-center justify-start px-6 pt-[18vh] text-center">
        <h1 className="animate-fade-rise max-w-[90vw] text-[clamp(4rem,7.5vw,8rem)] leading-[0.95] tracking-[-2.46px]">
          InfoSauce
        </h1>

        <p className="animate-fade-rise-delay mt-8 text-lg text-muted-foreground sm:text-xl">
          Stay informed. Skip the noise.
        </p>

        <p className="animate-fade-rise-delay mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Get the information you shouldn't miss
          and verify what you see online.
        </p>
      </section>

      {/* =========================
          MAIN OPTIONS
      ========================== */}

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 text-center">
        <h2 className="sr-only">
          What do you want to do?
        </h2>

        <div className="animate-fade-rise-delay-2 flex flex-wrap justify-center gap-4">
          <a href="/daily">
            <button
              type="button"
              className="glassmorphism rounded-full px-8 py-4 text-sm text-foreground transition-transform hover:scale-[1.03]"
            >
              📰 Daily Sauce
            </button>
          </a>

          <a href="/verify">
            <button
              type="button"
              className="glassmorphism rounded-full px-8 py-4 text-sm text-foreground transition-transform hover:scale-[1.03]"
            >
              🔍 Sauce Verify
            </button>
          </a>
        </div>
      </section>

      {/* =========================
          TRENDING TODAY
      ========================== */}

      <section className="glassmorphism relative z-10 mx-auto mt-14 mb-16 max-w-6xl rounded-3xl p-6 sm:mt-20 sm:p-10">
        <h2 className="mb-2 text-3xl">
          🔥 Trending Today
        </h2>

        <p className="mb-6 text-muted-foreground">
          See what people are talking about today.
        </p>

        {/* Carousel */}

        {trendingResults.length > 0 && (
          <>
            <div
              ref={trendingRef}
              className="trending-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scroll-smooth"
            >
              {trendingResults.map(
                (news, index) => (
                  <div
                    key={
                      news.href ||
                      `${news.title}-${index}`
                    }
                    className="w-[85vw] max-w-[420px] shrink-0 snap-start"
                  >
                    <NewsCard
                      {...news}
                      onReadMore={() => {
                        setExpandedNews(news);

                        const defaultArticle =
                          defaultTrendingNews.find(
                            (article) => article.href === news.href,
                          );

                        if (defaultArticle) {
                          void verifyDefaultNews(defaultArticle);
                        }
                      }}
                    />
                  </div>
                )
              )}
            </div>

            {/* Carousel controls */}

            {trendingResults.length > 1 && (
              <div className="absolute bottom-3 right-6 z-20 flex gap-3 sm:bottom-4 sm:right-8">
                <button
                  type="button"
                  onClick={
                    showPreviousTrending
                  }
                  aria-label="Show previous trending stories"
                  className="glassmorphism grid size-11 place-items-center rounded-full text-2xl leading-none text-foreground transition-transform hover:scale-110"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={
                    showNextTrending
                  }
                  aria-label="Show next trending stories"
                  className="glassmorphism grid size-11 place-items-center rounded-full text-2xl leading-none text-foreground transition-transform hover:scale-110"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* =========================
          INVESTIGATION MODAL
      ========================== */}

      {expandedNews && (
        <section
          className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/15 p-6 sm:p-10"
          aria-modal="true"
          role="dialog"
          aria-label="News investigation"
        >
          <GlowCursor
            className="expanded-news w-full max-w-5xl overflow-hidden rounded-[2rem]"
            color="#67E8F9"
            secondaryColor="#A78BFA"
            trailLength={40}
            trailWidth={8}
            trailTaper={0.8}
            followSpeed={0.16}
            glowIntensity={1.9}
            glowSpread={1.2}
            hotspot={0.65}
            brightness={1.25}
            opacity={1}
            pulseSpeed={1.1}
            noiseStrength={0}
            idleFade
            idleTimeout={700}
            fadeDuration={900}
            blendMode="screen"
          >
            <article className="trending-scrollbar max-h-[calc(100vh-5rem)] overflow-y-auto p-8 sm:p-14">

              {/* Close */}

              <div className="mb-10">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedNews(null)
                  }
                  aria-label="Close article"
                  className="glassmorphism glassmorphism--deep rounded-full px-4 py-2 text-sm text-foreground"
                >
                  × Close
                </button>
              </div>

              {/* Category */}

              <p className="mb-5 text-lg text-muted-foreground">
                {expandedNews.category}
              </p>

              {/* Title */}

              <h2 className="max-w-3xl text-5xl leading-[0.95] sm:text-7xl">
                {expandedNews.title}
              </h2>

              {/* Summary */}

              <p className="mt-7 max-w-2xl text-xl leading-8 text-muted-foreground">
                {expandedNews.summary}
              </p>

              {/* Content */}

              <p className="mt-6 max-w-3xl leading-8 text-muted-foreground">
                {expandedNews.content}
              </p>

              {/* Basic metadata */}

              <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {expandedNews.status}
                </span>

                <span>
                  Evidence sources:{" "}
                  {expandedNews.sources}
                </span>
              </div>

              {/* Fact check */}

              {expandedNews.verification?.results?.length ? (
                <FactCheckResult
                  accuracy={
                    expandedNews.truthScore != null
                      ? Math.round(
                          expandedNews.truthScore
                        )
                      : 0
                  }

                  verdict={
                    expandedNews.truthScoreDetails?.verdict ??
                    expandedNews.consensus?.verdict ??
                    "UNCERTAIN"
                  }

                  truthScoreLabel={expandedNews.truthScoreDetails?.truthScoreLabel}

                  consensus={expandedNews.truthScoreDetails?.consensusType}

                  averageConfidence={expandedNews.truthScoreDetails?.averageConfidence}

                  explanation={
                    expandedNews.verification
                      ?.results?.[0]?.result
                      ?.reasoning ??
                    "No verification reasoning available."
                  }

                  sources={toEvidenceSources(expandedNews.evidence)}

                  verificationRequests={
                    expandedNews.verification.results
                      .filter(
                        (item): item is {
                          model: string;
                          requestId: string;
                        } =>
                          typeof item.model === "string" &&
                          typeof item.requestId === "string",
                      )
                      .map((item) => ({
                        model: item.model,
                        requestId: item.requestId,
                      }))
                  }
                />
              ) : (
                <section className="glassmorphism mt-12 rounded-3xl p-6 sm:p-8">
                  <h2 className="mb-3 text-3xl">
                    Gonka AI Verification
                  </h2>
                  <p className="leading-7 text-muted-foreground">
                    {expandedNews.href &&
                    defaultVerificationLoading[expandedNews.href]
                      ? "Checking this article against its supplied evidence…"
                      : expandedNews.href &&
                          defaultVerificationErrors[expandedNews.href]
                        ? `Verification unavailable: ${defaultVerificationErrors[expandedNews.href]}`
                        : "No Gonka AI verification result is available for this article yet."}
                  </p>
                </section>
              )}

              {/* Claim */}

              {expandedNews.claim && (
                <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="mb-2 text-sm uppercase tracking-wider text-muted-foreground">
                    Claim being checked
                  </p>

                  <p className="leading-7">
                    {expandedNews.claim}
                  </p>
                </div>
              )}

              {/* Evidence */}

              {expandedNews.evidence &&
                expandedNews.evidence.length > 0 && (
                  <div className="mt-10">
                    <h3 className="mb-5 text-2xl">
                      Evidence
                    </h3>

                    <div className="space-y-4">
                      {expandedNews.evidence.map(
                        (item, index) => (
                          <div
                            key={
                              item.evidenceIndex ??
                              index
                            }
                            className="rounded-2xl border border-white/10 bg-white/5 p-5"
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                Evidence{" "}
                                {index + 1}
                              </span>

                              {item.source && (
                                <span className="text-sm text-muted-foreground">
                                  •{" "}
                                  {item.source}
                                </span>
                              )}
                            </div>

                            {item.title && (
                              <h4 className="text-lg">
                                {item.title}
                              </h4>
                            )}

                            {item.content && (
                              <p className="mt-2 leading-7 text-muted-foreground">
                                {item.content}
                              </p>
                            )}

                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-block text-sm underline underline-offset-4"
                              >
                                View source →
                              </a>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Original article */}

              {expandedNews.news?.url && (
                <div className="mt-10 border-t border-white/15 pt-8">
                  <a
                    href={
                      expandedNews.news.url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glassmorphism inline-flex rounded-full px-6 py-3 text-sm transition-transform hover:scale-[1.03]"
                  >
                    Read Original Article →
                  </a>
                </div>
              )}
            </article>
          </GlowCursor>
        </section>
      )}
    </GlowCursor>
  );
}
