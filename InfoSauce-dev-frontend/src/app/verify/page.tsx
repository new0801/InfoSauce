"use client";

import { useState } from "react";
import DemoModeNotice from "../../components/DemoModeNotice";
import FactCheckResult from "../../components/FactCheckResult";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import { DemoVerification, verifyDemoCase } from "../../lib/demo-api";

const evidence = [
  { title: "Earth Facts", source: "NASA Science", url: "https://science.nasa.gov/earth/facts/" },
  { title: "Earth Overview", source: "NASA Science", url: "https://science.nasa.gov/solar-system/planets/earth/overview/" },
];

export default function VerifyPage() {
  const [result, setResult] = useState<DemoVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await verifyDemoCase("earth-orbits-sun"));
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
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Stable verification case</p>
        <h1 className="mt-4 text-5xl leading-none sm:text-7xl">Sauce Verify</h1>
        <DemoModeNotice />
        <section className="glassmorphism mt-10 rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Prepared claim</p>
          <p className="mt-3 text-2xl">The Earth orbits the Sun.</p>
          <h2 className="mt-8 text-2xl">Prepared independent evidence</h2>
          <div className="mt-4 space-y-3">
            {evidence.map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
                <span className="block text-sm text-muted-foreground">{item.source}</span>
                <span className="mt-1 block">{item.title} →</span>
              </a>
            ))}
          </div>
          <button disabled={loading} onClick={verify} className="glassmorphism mt-8 rounded-full px-7 py-3 text-sm disabled:opacity-50">
            {loading ? "Verifying..." : "Verify with Gonka"}
          </button>
          {error && <p className="mt-5 text-rose-200">{error}</p>}
        </section>
        {result && (
          <>
            {result.verificationSummary.degraded && <p className="mt-6 text-sm text-muted-foreground">Verification completed with {result.verificationSummary.successfulModels} of {result.verificationSummary.configuredModels} models.</p>}
            <FactCheckResult accuracy={Math.round(result.truthScore.truthScore)} verdict={result.consensus.verdict} verificationTrace={result.verificationTrace} explanation={result.verification.results[0]?.result.reasoning || "No verification reasoning available."} sources={result.evidence.map((item) => item.source)} />
          </>
        )}
      </main>
    </GlowCursor>
  );
}
