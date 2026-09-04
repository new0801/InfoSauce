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

const news = [
  {
    id: "news-ai-001",
    category: "AI & Technology",
    displayCategory: "🤖 AI & Technology",
    title: "New AI Model Released",
    summary:
      "A new AI model is gaining attention across the technology community.",
    content:
      "The new AI model introduces improvements in reasoning, coding, and multimodal capabilities.",
    status: "Supported" as const,
    sources: 4,
  },
  {
    id: "news-kpop-001",
    category: "K-Pop & Entertainment",
    displayCategory: "🎵 K-Pop & Entertainment",
    title: "Major K-Pop Update",
    summary:
      "A major K-pop topic is currently receiving attention online.",
    content:
      "The topic has been discussed across multiple online communities and social media platforms.",
    status: "Supported" as const,
    sources: 6,
  },
  {
    id: "news-world-001",
    category: "World & Local",
    displayCategory: "🌍 World & Local",
    title: "Major World News",
    summary:
      "Here's an important development happening around the world.",
    content:
      "Multiple sources are reporting on this development. Some details have been independently confirmed while others are still being verified.",
    status: "Partially Supported" as const,
    sources: 5,
  },
  {
    id: "news-business-001",
    category: "Business & Lifestyle",
    displayCategory: "💰 Business & Lifestyle",
    title: "Important Business Update",
    summary:
      "A business and lifestyle story that may affect people's everyday lives.",
    content:
      "This story covers an important development in business and lifestyle.",
    status: "Supported" as const,
    sources: 4,
  },
  {
    id: "news-sports-001",
    category: "Sports & Gaming",
    displayCategory: "⚽ Sports & Gaming",
    title: "Latest Sports & Gaming Update",
    summary:
      "An important update from the world of sports and gaming.",
    content:
      "The latest development is receiving attention from sports and gaming communities.",
    status: "Supported" as const,
    sources: 5,
  },
];

export default function DailyPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
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

  const generatedNews = news.filter((item) => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || [item.title, item.summary, item.content, item.category].some((value) => value.toLowerCase().includes(query));
  });

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
          Choose what you care about. We'll bring you
          the information you shouldn't miss.
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
            onClick={() => setHasGenerated(true)}
            className="glassmorphism glassmorphism--deep rounded-full px-7 py-3 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate
          </button>
        </div>
      </section>

      <section className="frosted-news relative z-10 mx-auto mb-16 max-w-4xl rounded-[2rem] px-6 py-10 sm:p-10">
          <h2 className="mb-6 text-3xl">Your Daily News</h2>
          {hasGenerated && (generatedNews.length === 0 ? (
            <p className="glassmorphism rounded-2xl p-6 text-muted-foreground">No matching news found for this search yet.</p>
          ) : (
            <div className="space-y-6">
              {generatedNews.map((item) => (
                <article key={item.id} id={item.id}>
                  <NewsCard category={item.displayCategory} title={item.title} summary={item.summary} content={item.content} status={item.status} sources={item.sources} />
                  <FactCheckResult
                    accuracy={item.status === "Supported" ? 92 : 78}
                    verdict={item.status === "Supported" ? "Mostly Accurate" : "Partially Verified"}
                    explanation="This topic has been checked against the available supporting sources. Some details may still need further verification."
                    sources={[`Source 1 (${item.sources} references)`, "Source 2"]}
                  />
                </article>
              ))}
            </div>
          ))}
        </section>
    </GlowCursor>
  );
}
