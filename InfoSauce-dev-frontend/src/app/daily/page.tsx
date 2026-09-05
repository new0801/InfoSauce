"use client";

import { useEffect, useRef, useState } from "react";
import GlowCursor from "../../components/GlowCursor";
import FactCheckResult from "../../components/FactCheckResult";
import Navbar from "../../components/Navbar";
import NewsCard from "../../components/NewsCard";

const categories = [
  "AI & Technology",
  "Entertainment & K-Pop",
  "World & Local",
  "Business & Money",
];

type BackendResult = {
  id: string | null;
  title: string;
  content: string;
  source: string;
  sourceType?: string;
  url: string;
  publishedAt?: string | null;

  claim: string;

  verdict: "TRUE" | "FALSE" | "UNCERTAIN";
  truthScore: number;

  consensus: {
    verdict: "TRUE" | "FALSE" | "UNCERTAIN";
    voteCounts?: {
      TRUE?: number;
      FALSE?: number;
      UNCERTAIN?: number;
    };
    totalModels?: number;
    totalVotes?: number;
    failedModels?: string[];
    consensusReached?: boolean;
    disagreement?: boolean;
  };

  reasoning: string[];

  evidence: Array<{
    evidenceIndex?: number;
    title?: string | null;
    content?: string | null;
    url?: string | null;
    source?: string | null;
    platform?: string | null;
    publishedAt?: string | null;
  }>;

  requestIds?: Array<{
    model: string;
    requestId: string;
  }>;
};

function convertVerdictToStatus(
  verdict: BackendResult["verdict"]
): "Supported" | "Partially Supported" | "False" | "Unverified" {
  if (verdict === "TRUE") {
    return "Supported";
  }

  if (verdict === "FALSE") {
    return "False";
  }

  return "Unverified";
}

function getSummary(result: BackendResult) {
  if (result.claim) {
    return result.claim;
  }

  if (result.content) {
    return result.content.slice(0, 180) + "...";
  }

  return "No summary available.";
}

function getDisplayCategory(
  selectedCategory: string,
  result: BackendResult
) {
  if (selectedCategory) {
    return selectedCategory;
  }

  if (result.source) {
    return result.source;
  }

  return "Daily Sauce";
}

function getExplanation(result: BackendResult) {
  if (!result.reasoning || result.reasoning.length === 0) {
    return "The claim was checked against the available evidence.";
  }

  return result.reasoning.join(" ");
}

function getVerdictLabel(
  verdict: BackendResult["verdict"]
) {
  if (verdict === "TRUE") {
    return "Mostly Accurate";
  }

  if (verdict === "FALSE") {
    return "False";
  }

  return "Unverified";
}

export default function DailyPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [results, setResults] = useState<BackendResult[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [expandedResult, setExpandedResult] =
    useState<BackendResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTouchedRef = useRef(false);

  const scrollToGenerate = () => {
    searchRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        window.scrollTo({
          top: 96,
          behavior: "smooth",
        }),
      350
    );

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    const timer = window.setTimeout(() => {
      if (!searchTouchedRef.current) {
        scrollToGenerate();
      }
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [selectedCategory]);

  useEffect(() => {
    if (!searchQuery.trim()) return;

    const timer = window.setTimeout(
      scrollToGenerate,
      2000
    );

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const today = new Date().toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  async function generateDailySauce() {
    const cleanQuery =
      searchQuery.trim() ||
      selectedCategory.trim();

    if (!cleanQuery) {
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setHasGenerated(true);
    setExpandedResult(null);

    try {
      console.log(
        "Daily Sauce query:",
        cleanQuery
      );

      const response = await fetch(
        "https://infosauce-backend.onrender.com/api/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: cleanQuery,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Daily Sauce request failed."
        );
      }

      if (
        !data ||
        !Array.isArray(data.results)
      ) {
        throw new Error(
          "Backend returned an invalid Daily Sauce response."
        );
      }

      setResults(data.results);

      console.log(
  "Daily Sauce results:",
  JSON.stringify(results, null, 2)
);
    } catch (requestError) {
      console.error(
        "Daily Sauce error:",
        requestError
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while generating Daily Sauce."
      );
    } finally {
      setLoading(false);
    }
  }

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
    >
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

      {/* Header */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <h1 className="animate-fade-rise text-5xl leading-[0.95] tracking-[-2.46px] sm:text-7xl">
          Your DailySauce
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Choose what you care about. We&apos;ll
          bring you the information you shouldn&apos;t
          miss.
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
                onClick={() => {
                  searchTouchedRef.current =
                    false;

                  setSelectedCategory(
                    (current) =>
                      current === category
                        ? ""
                        : category
                  );

                  setHasGenerated(false);
                  setResults([]);
                  setError("");
                }}
                aria-pressed={isSelected}
                className={`rounded-full px-5 py-3 text-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  isSelected
                    ? "glassmorphism glassmorphism--deep font-medium text-foreground shadow-lg"
                    : "glassmorphism glassmorphism--deep text-muted-foreground hover:scale-[1.03] hover:text-foreground"
                }`}
              >
                {category ===
                  "AI & Technology" &&
                  "🤖 "}

                {category ===
                  "Entertainment & K-Pop" &&
                  "🎵 "}

                {category ===
                  "World & Local" &&
                  "🌍 "}

                {category ===
                  "Business & Money" &&
                  "💰 "}

                {category}
                {isSelected && " ✓"}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          ref={searchRef}
          className="mx-auto mt-20 max-w-2xl text-center"
        >
          <label
            htmlFor="daily-search"
            className="mb-5 inline-block rounded-full bg-white/10 px-5 py-2 text-3xl text-foreground sm:text-4xl"
            style={{
              fontFamily:
                "var(--font-display)",
            }}
          >
            Search news or related information
          </label>

          <input
            id="daily-search"
            type="search"
            value={searchQuery}
            onFocus={() => {
              searchTouchedRef.current =
                true;
            }}
            onChange={(event) => {
              setSearchQuery(
                event.target.value
              );
              setHasGenerated(false);
              setResults([]);
              setError("");
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !loading &&
                (selectedCategory ||
                  searchQuery.trim())
              ) {
                generateDailySauce();
              }
            }}
            placeholder="e.g. AI, K-pop, technology"
            className="glassmorphism glassmorphism--deep w-full rounded-2xl px-5 py-4 text-left text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-white/50"
          />
        </div>

        {/* Generate */}
        <div className="mt-24 flex flex-col items-center gap-6 text-center">
          <h2 className="text-4xl sm:text-5xl">
            Generate Your Daily News
          </h2>

          <button
            type="button"
            disabled={
              loading ||
              (!selectedCategory &&
                !searchQuery.trim())
            }
            onClick={generateDailySauce}
            className="glassmorphism glassmorphism--deep rounded-full px-7 py-3 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "Generating..."
              : "Generate"}
          </button>
        </div>
      </section>

      {/* Daily News Results */}
      <section className="frosted-news relative z-10 mx-auto mb-16 max-w-4xl rounded-[2rem] px-6 py-10 sm:p-10">
        <h2 className="mb-6 text-3xl">
          Your Daily News
        </h2>

        {/* Loading */}
        {loading && (
          <div className="glassmorphism rounded-2xl p-6 text-center text-muted-foreground">
            <p className="text-lg">
              Finding relevant news and
              fact-checking the results...
            </p>

            <p className="mt-2 text-sm">
              This may take a while because each
              story is being verified against
              evidence.
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="glassmorphism rounded-2xl p-6">
            <p className="text-lg">
              Unable to generate Daily Sauce.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        )}

        {/* No results */}
        {!loading &&
          !error &&
          hasGenerated &&
          results.length === 0 && (
            <p className="glassmorphism rounded-2xl p-6 text-muted-foreground">
              No relevant fact-checkable news
              was found for this search.
            </p>
          )}

        {/* Results */}
        {!loading &&
          !error &&
          results.length > 0 && (
            <div className="space-y-6">
              {results.map((item, index) => {
                const status =
                  convertVerdictToStatus(
                    item.verdict
                  );

                return (
                  <article
                    key={
                      item.id ||
                      `${item.url}-${index}`
                    }
                    className="space-y-4"
                  >
                    <NewsCard
                      category={getDisplayCategory(
                        selectedCategory,
                        item
                      )}
                      title={item.title}
                      summary={getSummary(item)}
                      content={item.content}
                      status={status}
                      sources={
                        item.evidence?.length ||
                        0
                      }
                      onReadMore={() =>
                        setExpandedResult(item)
                      }
                    />

                    {false &&
                      (item.requestIds?.length ?? 0) > 0 && (
                        <details className="glassmorphism rounded-2xl p-5">
                          <summary className="cursor-pointer text-sm text-muted-foreground">
                            Verification details
                          </summary>

                          <div className="mt-4 space-y-2 text-sm">
                            {item.requestIds?.map(
                              (request) => (
                                <div
                                  key={
                                    request.requestId
                                  }
                                  className="break-all"
                                >
                                  <span className="font-medium">
                                    {
                                      request.model
                                    }
                                  </span>

                                  <span className="text-muted-foreground">
                                    {" "}
                                    —{" "}
                                    {
                                      request.requestId
                                    }
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </details>
                      )}
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {expandedResult && (
        <section
          className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/15 p-6 sm:p-10"
          aria-modal="true"
          role="dialog"
          aria-label="Daily news investigation"
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
              <div className="mb-10">
                <button
                  type="button"
                  onClick={() => setExpandedResult(null)}
                  aria-label="Close article"
                  className="glassmorphism glassmorphism--deep rounded-full px-4 py-2 text-sm text-foreground"
                >
                  × Close
                </button>
              </div>

              <p className="mb-5 text-lg text-muted-foreground">
                {getDisplayCategory(selectedCategory, expandedResult)}
              </p>
              <h2 className="max-w-3xl text-5xl leading-[0.95] sm:text-7xl">
                {expandedResult.title}
              </h2>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-muted-foreground">
                {getSummary(expandedResult)}
              </p>
              <p className="mt-6 max-w-3xl leading-8 text-muted-foreground">
                {expandedResult.content}
              </p>

              <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{convertVerdictToStatus(expandedResult.verdict)}</span>
                <span>Evidence sources: {expandedResult.evidence.length}</span>
              </div>

              <FactCheckResult
                accuracy={Math.round(expandedResult.truthScore)}
                verdict={getVerdictLabel(expandedResult.verdict)}
                verificationTrace={expandedResult.requestIds ?? []}
                explanation={getExplanation(expandedResult)}
                sources={expandedResult.evidence.map(
                  (evidenceItem, evidenceIndex) =>
                    evidenceItem.source ||
                    evidenceItem.title ||
                    `Source ${evidenceIndex + 1}`
                )}
              />

              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="mb-2 text-sm uppercase tracking-wider text-muted-foreground">
                  Claim being checked
                </p>
                <p className="leading-7">{expandedResult.claim}</p>
              </div>

              {expandedResult.evidence.length > 0 && (
                <div className="mt-10">
                  <h3 className="mb-5 text-2xl">Evidence</h3>
                  <div className="space-y-4">
                    {expandedResult.evidence.map((evidenceItem, index) => (
                      <div
                        key={
                          evidenceItem.evidenceIndex ??
                          evidenceItem.url ??
                          index
                        }
                        className="rounded-2xl border border-white/10 bg-white/5 p-5"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Evidence {index + 1}
                          </span>
                          {evidenceItem.source && (
                            <span className="text-sm text-muted-foreground">
                              • {evidenceItem.source}
                            </span>
                          )}
                        </div>
                        {evidenceItem.title && (
                          <h4 className="text-lg">{evidenceItem.title}</h4>
                        )}
                        {evidenceItem.content && (
                          <p className="mt-2 leading-7 text-muted-foreground">
                            {evidenceItem.content}
                          </p>
                        )}
                        {evidenceItem.url && (
                          <a
                            href={evidenceItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block text-sm underline underline-offset-4"
                          >
                            View source →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedResult.url && (
                <div className="mt-10 border-t border-white/15 pt-8">
                  <a
                    href={expandedResult.url}
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
