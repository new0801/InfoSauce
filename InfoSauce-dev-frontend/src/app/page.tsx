"use client";

import { useEffect, useRef, useState } from "react";
import GlowCursor from "../components/GlowCursor";
import FactCheckResult from "../components/FactCheckResult";
import Navbar from "../components/Navbar";
import NewsCard from "../components/NewsCard";

const BACKEND_URL = "http://localhost:3000";
const CARD_SUMMARY_MAX_LENGTH = 240;
const EVIDENCE_PREVIEW_MAX_LENGTH = 400;

function getCardSummary(content?: string, claim?: string) {
  const text = (content || claim || "No summary available.")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= CARD_SUMMARY_MAX_LENGTH) {
    return text;
  }

  const truncated = text
    .slice(0, CARD_SUMMARY_MAX_LENGTH)
    .replace(/\s+\S*$/, "")
    .trim();

  return `${truncated || text.slice(0, CARD_SUMMARY_MAX_LENGTH)}…`;
}

function getEvidencePreview(content: string) {
  const text = content.replace(/\s+/g, " ").trim();

  if (text.length <= EVIDENCE_PREVIEW_MAX_LENGTH) {
    return text;
  }

  const truncated = text
    .slice(0, EVIDENCE_PREVIEW_MAX_LENGTH)
    .replace(/\s+\S*$/, "")
    .trim();

  return `${truncated || text.slice(0, EVIDENCE_PREVIEW_MAX_LENGTH)}…`;
}

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
    truthScore?: number;
    averageConfidence?: number;
    baseScore?: number;
    coverage?: number;
    reliability?: number;
    consensusFactor?: number;
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

  verificationTrace?: Array<{
    model?: string;
    requestId?: string;
  }>;
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
  consensus?: TrendingItem["consensus"];
  verification?: TrendingItem["verification"];
  verificationTrace?: {
    model: string;
    requestId: string;
  }[];
  evidence?: TrendingItem["evidence"];
  news?: TrendingItem["news"];
  claim?: string;
};

export default function Home() {
  const trendingRef = useRef<HTMLDivElement>(null);
  const categoryFetched = useRef(false);

  const [activeTrending, setActiveTrending] = useState(0);

  const [expandedNews, setExpandedNews] =
    useState<NewsCardItem | null>(null);

  const [categoryResults, setCategoryResults] =
    useState<TrendingItem[]>([]);

  /*
   * Convert backend results into the format
   * expected by NewsCard.
   */
  const trendingResults: NewsCardItem[] =
    categoryResults.map((item) => {
      const verdict = item.consensus?.verdict;

      let status: NewsCardItem["status"];

      if (verdict === "TRUE") {
        status = "Supported";
      } else if (verdict === "FALSE") {
        status = "False";
      } else {
        status = "Unverified";
      }

      return {
        category:
          item.category ||
          item.news?.area ||
          item.news?.source ||
          "Trending",

        title:
          item.news?.title ||
          item.claim ||
          "Untitled Story",

        summary:
          getCardSummary(
            item.news?.content,
            item.claim
          ),

        content:
          item.news?.content ||
          "No additional information available.",

        status,

        sources:
          item.evidence?.length ?? 0,

        href:
          item.news?.url ||
          undefined,

        truthScore:
          item.truthScore?.truthScore ??
          null,

        consensus:
          item.consensus,

        verification:
          item.verification,

        verificationTrace:
          item.verificationTrace
            ?.filter(
              (trace): trace is { model: string; requestId: string } =>
                Boolean(trace.model && trace.requestId)
            ) ??
          item.verification?.results
            ?.filter(
              (result): result is { model: string; requestId: string } =>
                Boolean(result.model && result.requestId)
            ) ??
          [],

        evidence:
          item.evidence || [],

        news:
          item.news,

        claim:
          item.claim,
      };
    });

  /*
   * Fetch category results from the backend.
   */
  const fetchCategoryResults = async (areas: string[]) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/category`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            areas,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Category results:", data);

      setCategoryResults(
        Array.isArray(data.results)
          ? data.results
          : []
      );

      setActiveTrending(0);
    } catch (error) {
      console.error(
        "Failed to fetch category results:",
        error
      );

      setCategoryResults([]);
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
   * Load trending stories when the
   * homepage opens.
   *
   * categoryFetched prevents React
   * Strict Mode from making the
   * request twice during development.
   */
  useEffect(() => {
    if (categoryFetched.current) {
      return;
    }

    categoryFetched.current = true;

    fetchCategoryResults([
      "AI & Technology",
      "Entertainment & K-Pop",
      "World & Local",
      "Business & Money",
    ]);
  }, []);
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

        {/* Loading / empty state */}

        {trendingResults.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">
              Finding reliable trending stories...
            </p>
          </div>
        )}

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
                      onReadMore={() =>
                        setExpandedNews(news)
                      }
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

              <FactCheckResult
                accuracy={
                  expandedNews.truthScore != null
                    ? Math.round(
                        expandedNews.truthScore
                      )
                    : 0
                }

                verdict={
                  expandedNews.consensus
                    ?.verdict ??
                  "UNCERTAIN"
                }

                verificationTrace={expandedNews.verificationTrace ?? []}

                explanation={
                  expandedNews.verification
                    ?.results?.[0]?.result
                    ?.reasoning ??
                  "No verification reasoning available."
                }

                sources={
                  expandedNews.evidence
                    ?.map(
                      (item) =>
                        item.source ||
                        item.url ||
                        item.platform
                    )
                    .filter(
                      (
                        source
                      ): source is string =>
                        Boolean(source)
                    ) ?? []
                }
              />

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
                                {getEvidencePreview(item.content)}
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
