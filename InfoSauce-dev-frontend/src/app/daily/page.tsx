"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DemoModeNotice from "../../components/DemoModeNotice";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import { DemoArticle, fetchDemoDaily } from "../../lib/demo-api";

export default function DailyPage() {
  const [articles, setArticles] = useState<DemoArticle[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDemoDaily()
      .then((data) => setArticles(data.articles))
      .catch(() => setError("Prepared Daily Sauce articles are temporarily unavailable."));
  }, []);

  return (
    <GlowCursor className="relative min-h-screen bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA">
      <Navbar />
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Prepared daily briefing</p>
        <h1 className="mt-4 text-5xl leading-none sm:text-7xl">Daily Sauce</h1>
        <DemoModeNotice />
        <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border border-white/10 px-3 py-1">VERIFIED after live Gonka completion</span>
          <span className="rounded-full border border-white/10 px-3 py-1">UNVERIFIED</span>
          <span className="rounded-full border border-white/10 px-3 py-1">NOT VERIFIABLE</span>
        </div>
        {error && <p className="mt-6 text-rose-200">{error}</p>}
        <div className="mt-10 space-y-5">
          {articles.map((article) => (
            <article key={article.id} className="glassmorphism rounded-3xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{article.platform} · {article.source}</p>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">{article.verificationStatus}</span>
              </div>
              <h2 className="mt-4 text-3xl">{article.title}</h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{article.summary}</p>
              {article.claim && <p className="mt-5 rounded-2xl bg-white/5 p-4 text-sm">Claim: {article.claim}</p>}
              <Link className="mt-6 inline-block rounded-full border border-white/15 px-5 py-2 text-sm hover:scale-[1.03]" href={`/daily/${article.id}`}>
                View prepared evidence →
              </Link>
            </article>
          ))}
        </div>
      </main>
    </GlowCursor>
  );
}
