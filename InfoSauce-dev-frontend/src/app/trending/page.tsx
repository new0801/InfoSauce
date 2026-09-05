"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DemoModeNotice from "../../components/DemoModeNotice";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import { DemoTopic, fetchDemoTrending } from "../../lib/demo-api";

export default function TrendingPage() {
  const [topics, setTopics] = useState<DemoTopic[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDemoTrending()
      .then((data) => setTopics(data.topics))
      .catch(() => setError("Prepared trending topics are temporarily unavailable."));
  }, []);

  return (
    <GlowCursor className="relative min-h-screen bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA">
      <Navbar />
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Prepared topics</p>
        <h1 className="mt-4 text-5xl leading-none sm:text-7xl">Trending</h1>
        <DemoModeNotice />
        {error && <p className="mt-6 text-rose-200">{error}</p>}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {topics.map((topic) => (
            <article key={topic.id} className="glassmorphism rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">{topic.platform} · {topic.source}</p>
              <h2 className="mt-3 text-2xl">{topic.title}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">{topic.summary}</p>
              {topic.relatedArticleId && (
                <Link className="mt-5 inline-block text-sm underline underline-offset-4" href={`/daily/${topic.relatedArticleId}`}>
                  Explore prepared article →
                </Link>
              )}
            </article>
          ))}
        </div>
      </main>
    </GlowCursor>
  );
}
