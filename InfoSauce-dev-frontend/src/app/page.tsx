"use client";

import { useEffect, useState } from "react";
import DemoModeNotice from "../components/DemoModeNotice";
import GlowCursor from "../components/GlowCursor";
import Navbar from "../components/Navbar";
import { DemoTopic, fetchDemoTrending } from "../lib/demo-api";

export default function Home() {
  const [topics, setTopics] = useState<DemoTopic[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDemoTrending()
      .then((data) => setTopics(data.topics))
      .catch(() => setError("Prepared trending topics are temporarily unavailable."));
  }, []);

  return (
    <GlowCursor className="relative isolate min-h-screen overflow-hidden bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA">
      <Navbar />
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <section className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">InfoSauce demo</p>
          <h1 className="mt-4 text-5xl leading-[0.95] tracking-[-2.46px] sm:text-7xl">Stay informed. Skip the noise.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
            Explore prepared research, review evidence, and run a real multi-model verification through Gonka.
          </p>
          <DemoModeNotice />
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="glassmorphism rounded-full px-6 py-3 text-sm hover:scale-[1.03]" href="/trending">Trending</a>
            <a className="glassmorphism rounded-full px-6 py-3 text-sm hover:scale-[1.03]" href="/daily">Daily Sauce</a>
            <a className="glassmorphism rounded-full px-6 py-3 text-sm hover:scale-[1.03]" href="/verify">Sauce Verify</a>
          </div>
        </section>

        <section className="glassmorphism mt-16 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl">Trending</h2>
              <p className="mt-2 text-muted-foreground">Prepared topics from clearly labelled reference sources.</p>
            </div>
            <a className="text-sm underline underline-offset-4" href="/trending">View all topics</a>
          </div>
          {error && <p className="mt-6 text-sm text-rose-200">{error}</p>}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {topics.map((topic) => (
              <article key={topic.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-muted-foreground">{topic.platform} · {topic.source}</p>
                <h3 className="mt-3 text-xl">{topic.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{topic.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </GlowCursor>
  );
}
