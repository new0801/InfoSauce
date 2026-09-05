"use client";

import { useState } from "react";
import { createWorker } from "tesseract.js";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import UploadBox from "../../components/UploadBox";
import ScreenshotPreview from "../../components/ScreenshotPreview";
import FactCheckResult from "../../components/FactCheckResult";

const BACKEND_URL = "https://infosauce-backend.onrender.com";
const SOCIAL_MEDIA_HOSTS = [
  "reddit.com", "x.com", "twitter.com", "instagram.com", "facebook.com",
  "tiktok.com", "youtube.com", "youtu.be", "bilibili.com", "xiaohongshu.com", "xhslink.com",
];

type VerifyResult = {
  claim: string;
  consensus: { verdict: string };
  truthScore: { truthScore: number };
  verificationTrace?: { model: string; requestId: string }[];
  verification: {
    results: Array<{ result: { reasoning: string } }>;
  };
  evidence: Array<{
    source?: string | null;
    title?: string | null;
    url?: string | null;
  }>;
};

export default function VerifyPage() {
  const [image, setImage] = useState<File | null>(null);
  const [link, setLink] = useState("");

  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);

  function clearVerification() {
    setImage(null);
    setLink("");
    setShowResult(false);
    setError("");
    setResult(null);
    setUploadResetKey((key) => key + 1);
  }

  function isSocialMediaUrl(value: string) {
    try {
      const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
      return SOCIAL_MEDIA_HOSTS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  function selectScreenshotClaim(text: string) {
    const headline = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .find(
        (line) =>
          line.length >= 30 &&
          line.length <= 240 &&
          !line.startsWith("r/") &&
          !line.includes("http")
      );

    return headline || text.replace(/\s+/g, " ").trim();
  }

  function handleImageUpload(file: File | null) {
    setImage(file);
    if (file) setLink("");
    setShowResult(false);
    setError("");
    setResult(null);
  }

  async function handleVerify() {
    setError("");
    setShowResult(false);
    setIsLoading(true);
    setResult(null);

    try {
      let body: Record<string, unknown>;

      if (image) {
        const worker = await createWorker("eng");

        try {
          const {
            data: { text },
          } = await worker.recognize(image);
          const extractedText = text.replace(/\s+/g, " ").trim();

          if (!extractedText) {
            throw new Error(
              "No readable text was found in this screenshot. Please upload a clearer image."
            );
          }

          body = {
            type: "text",
            content: extractedText,
            claim: selectScreenshotClaim(text),
            skipClaimExtraction: true,
          };
        } finally {
          await worker.terminate();
        }
      } else {
        const socialUrl = link.trim();

        if (!isSocialMediaUrl(socialUrl)) {
          throw new Error("Enter a valid social media post URL or upload a screenshot.");
        }

        body = { type: "url", content: socialUrl };
      }

body = { caseId: "VERIFY001" };

      const response = await fetch(`${BACKEND_URL}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message || "Sauce Verify could not complete this check.");
      }

      setResult(data);
      setShowResult(true);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Sauce Verify could not complete this check."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <GlowCursor className="relative isolate min-h-screen overflow-hidden bg-background text-foreground" color="#67E8F9" secondaryColor="#A78BFA" trailLength={40} trailWidth={8} trailTaper={0.8} followSpeed={0.16} glowIntensity={1.9} glowSpread={1.2} hotspot={0.65} brightness={1.25} opacity={1} pulseSpeed={1.1} noiseStrength={0} idleFade idleTimeout={700} fadeDuration={900} blendMode="screen">
      <video aria-hidden="true" autoPlay loop muted playsInline className="fixed inset-0 z-0 h-screen w-screen object-cover">
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>
      <Navbar />

      {/* Header */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <h1 className="animate-fade-rise text-5xl leading-[0.95] tracking-[-2.46px] sm:text-7xl">
          Sauce Verify
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Not sure if it's true? Let SauceVerify check it
          for you.
        </p>
      </section>

      {/* Main Verify Section */}
      <section className="glassmorphism relative z-10 mx-auto mb-16 max-w-4xl rounded-3xl px-6 py-10 sm:p-10">
        <h2 className="animate-fade-rise-delay-2 mb-14 text-center text-3xl">
          What do you want to verify?
        </h2>

        {/* Screenshot */}
        <section>
          <h3 className="mb-5 text-2xl">
            📷 Upload Screenshot
          </h3>

          <UploadBox
            key={uploadResetKey}
            onFileSelect={handleImageUpload}
          />

          {image && (
            <ScreenshotPreview image={image} />
          )}
        </section>

        {/* Divider */}
        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/20" />

          <span className="text-sm font-medium text-muted-foreground">
            OR
          </span>

          <div className="h-px flex-1 border-t" />
        </div>

        {/* Link */}
        <section>
          <h3 className="mb-5 text-2xl">
            🔗 Paste a Link
          </h3>

          <p className="mb-3 text-muted-foreground">
            Paste a social media post link you want to verify.
          </p>

          <input
            type="url"
            placeholder="https://reddit.com/r/example/comments/..."
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              if (event.target.value.trim()) setImage(null);
              setShowResult(false);
              setError("");
              setResult(null);
            }}
            className="glassmorphism w-full rounded-2xl px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-white/50"
          />
        </section>

        {/* Error */}
        {error && (
          <div className="glassmorphism mt-6 rounded-2xl p-4">
            <p className="font-medium">
              Something went wrong.
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Verify Button */}
        <div className="mt-8 flex justify-center gap-3">
          <button
            disabled={(!image && !link) || isLoading}
            onClick={handleVerify}
            className="glassmorphism rounded-full px-8 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "Verifying..."
              : "Sauce Verify"}
          </button>

          <button
            type="button"
            onClick={clearVerification}
            disabled={isLoading || (!image && !link && !result)}
            className="glassmorphism rounded-full px-8 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Checking your information...
          </p>
        )}

        {/* Fact Check Result */}
        {showResult && !isLoading && result && (
          <>
            <FactCheckResult
              accuracy={Math.round(result.truthScore.truthScore)}
              verdict={result.consensus.verdict}
              verificationTrace={result.verificationTrace ?? []}
              explanation={
                result.verification.results[0]?.result.reasoning ??
                "No verification reasoning available."
              }
              sources={result.evidence.map(
                (item, index) =>
                  item.source || item.title || item.url || `Evidence ${index + 1}`
              )}
            />

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-2 text-sm uppercase tracking-wider text-muted-foreground">
                Claim being checked
              </p>
              <p className="leading-7">{result.claim}</p>
            </div>
          </>
        )}
      </section>
    </GlowCursor>
  );
}
