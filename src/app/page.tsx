"use client";

import { useEffect, useRef, useState } from "react";
import GlowCursor from "../components/GlowCursor";
import FactCheckResult from "../components/FactCheckResult";
import Navbar from "../components/Navbar";
import NewsCard from "../components/NewsCard";

const trendingNews = [
  { category: "🤖 AI & Technology", title: "New AI Model Released", summary: "A new AI model is gaining attention across the technology community.", content: "The new AI model is being discussed across multiple technology communities and social media platforms.", status: "Supported" as const, sources: 4, href: "/daily#news-ai-001" },
  { category: "🎵 K-Pop & Entertainment", title: "Major K-Pop Update", summary: "A major K-pop topic is currently receiving attention online.", content: "The topic is receiving attention across multiple social media platforms and entertainment communities.", status: "Supported" as const, sources: 6, href: "/daily#news-kpop-001" },
  { category: "🌍 World & Local", title: "Major World News", summary: "An important development is receiving attention around the world.", content: "Multiple sources are reporting on this development.", status: "Partially Supported" as const, sources: 5, href: "/daily#news-world-001" },
  { category: "📱 Social Media", title: "Platform Policy Change", summary: "A platform update is prompting conversations online.", content: "Users and experts are discussing the possible impact of the newly announced platform policy.", status: "Partially Supported" as const, sources: 3, href: "/daily#news-social-001" },
  { category: "💼 Business", title: "Market Watch", summary: "A business story is gaining traction across newsrooms.", content: "The developing story is being covered by several business and financial news sources.", status: "Supported" as const, sources: 5, href: "/daily#news-business-001" },
  { category: "🎬 Culture", title: "New Release Sparks Discussion", summary: "A new release is drawing reactions from audiences.", content: "Commentary and reviews continue to emerge across culture and entertainment outlets.", status: "Partially Supported" as const, sources: 4, href: "/daily#news-culture-001" },
  { category: "🔬 Science", title: "Research Update", summary: "A research update is being shared widely online.", content: "The findings are receiving attention from science writers and interested communities.", status: "Unverified" as const, sources: 2, href: "/daily#news-science-001" },
  { category: "🏙️ Local", title: "Community Story", summary: "A local story is getting people talking today.", content: "The update has prompted discussion among local readers and community pages.", status: "Supported" as const, sources: 4, href: "/daily#news-local-001" },
];

export default function Home() {
  const trendingRef = useRef<HTMLDivElement>(null);
  const [activeTrending, setActiveTrending] = useState(0);
  const [expandedNews, setExpandedNews] = useState<(typeof trendingNews)[number] | null>(null);

  const goToTrending = (index: number) => {
    const nextIndex = (index + trendingNews.length) % trendingNews.length;
    const card = trendingRef.current?.children[nextIndex] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActiveTrending(nextIndex);
  };

  const showPreviousTrending = () => {
    goToTrending(activeTrending - 1);
  };

  const showNextTrending = () => goToTrending(activeTrending + 1);

  useEffect(() => {
    const timer = window.setTimeout(() => goToTrending(activeTrending + 1), 4000);
    return () => window.clearTimeout(timer);
  }, [activeTrending]);

  return (
    <GlowCursor className="relative isolate min-h-screen overflow-hidden bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA" trailLength={40} trailWidth={8} trailTaper={0.8} followSpeed={0.16} glowIntensity={1.9} glowSpread={1.2} hotspot={0.65} brightness={1.25} opacity={1} pulseSpeed={1.1} noiseStrength={0} idleFade idleTimeout={700} fadeDuration={900} blendMode="screen" enabled={!expandedNews}>
      <video aria-hidden="true" autoPlay loop muted playsInline className="fixed inset-0 z-0 h-screen w-screen object-cover">
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>
      <Navbar />

      {/* Hero */}
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

      {/* Main Options */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 text-center">
        <h2 className="sr-only">
          What do you want to do?
        </h2>

        <div className="animate-fade-rise-delay-2 flex flex-wrap justify-center gap-4">
          <a href="/daily">
            <button className="glassmorphism rounded-full px-8 py-4 text-sm text-foreground transition-transform hover:scale-[1.03]">
              📰 Daily Sauce
            </button>
          </a>

          <a href="/verify">
            <button className="glassmorphism rounded-full px-8 py-4 text-sm text-foreground transition-transform hover:scale-[1.03]">
              🔍 Sauce Verify
            </button>
          </a>
        </div>
      </section>

      {/* Trending Today */}
      <section className="glassmorphism relative z-10 mx-auto mt-14 mb-16 max-w-6xl rounded-3xl p-6 sm:mt-20 sm:p-10">
        <h2 className="mb-2 text-3xl">
          🔥 Trending Today
        </h2>

        <p className="mb-6 text-muted-foreground">
          See what people are talking about today.
        </p>

        <div ref={trendingRef} className="trending-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scroll-smooth">
          {trendingNews.map((news) => (
            <div key={news.href} className="w-[85vw] max-w-[420px] shrink-0 snap-start">
              <NewsCard {...news} onReadMore={() => setExpandedNews(news)} />
            </div>
          ))}
        </div>
        <div className="absolute bottom-3 right-6 z-20 flex gap-3 sm:bottom-4 sm:right-8">
          <button type="button" onClick={showPreviousTrending} aria-label="Show previous trending stories" className="glassmorphism grid size-11 place-items-center rounded-full text-2xl leading-none text-foreground transition-transform hover:scale-110">
            ‹
          </button>
          <button type="button" onClick={showNextTrending} aria-label="Show next trending stories" className="glassmorphism grid size-11 place-items-center rounded-full text-2xl leading-none text-foreground transition-transform hover:scale-110">
            ›
          </button>
        </div>
      </section>
      {expandedNews && (
        <section className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/15 p-6 sm:p-10" aria-modal="true" role="dialog">
          <GlowCursor className="expanded-news w-full max-w-5xl overflow-hidden rounded-[2rem]" color="#67E8F9" secondaryColor="#A78BFA" trailLength={40} trailWidth={8} trailTaper={0.8} followSpeed={0.16} glowIntensity={1.9} glowSpread={1.2} hotspot={0.65} brightness={1.25} opacity={1} pulseSpeed={1.1} noiseStrength={0} idleFade idleTimeout={700} fadeDuration={900} blendMode="screen">
          <article className="trending-scrollbar max-h-[calc(100vh-5rem)] overflow-y-auto p-8 sm:p-14">
            <div className="mb-10">
              <button type="button" onClick={() => setExpandedNews(null)} aria-label="Close article" className="glassmorphism glassmorphism--deep rounded-full px-4 py-2 text-sm text-foreground">× Close</button>
            </div>
            <p className="mb-5 text-lg text-muted-foreground">{expandedNews.category}</p>
            <h2 className="max-w-3xl text-5xl leading-[0.95] sm:text-7xl">{expandedNews.title}</h2>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-muted-foreground">{expandedNews.summary}</p>
            <p className="mt-6 max-w-3xl leading-8 text-muted-foreground">{expandedNews.content}</p>
            <div className="mt-10 flex items-center justify-between border-t border-white/15 pt-5 text-sm text-muted-foreground">
              <span>{expandedNews.status}</span><span>Sources: {expandedNews.sources}</span>
            </div>
            <FactCheckResult
              accuracy={expandedNews.status === "Supported" ? 92 : expandedNews.status === "Partially Supported" ? 78 : 65}
              verdict={expandedNews.status === "Supported" ? "Mostly Accurate" : expandedNews.status === "Partially Supported" ? "Partially Verified" : "Needs Verification"}
              explanation="This topic has been checked against the available supporting sources. Some details may still need further verification."
              sources={[`Source 1 (${expandedNews.sources} references)`, "Source 2"]}
            />
          </article>
          </GlowCursor>
        </section>
      )}
    </GlowCursor>
  );
}
