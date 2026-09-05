"use client";

import { useRef, useState } from "react";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import UploadBox from "../../components/UploadBox";
import ScreenshotPreview from "../../components/ScreenshotPreview";
import FactCheckResult from "../../components/FactCheckResult";
import { createClearedVerificationSession } from "./verificationSession";

export default function VerifyPage() {
  const [image, setImage] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [imageResetKey, setImageResetKey] = useState(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  function handleImageUpload(file: File | null) {
    setImage(file);
    setError("");
  }

  function handleClear() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    const cleared = createClearedVerificationSession();
    setText(cleared.text);
    setLink(cleared.link);
    setImage(cleared.image);
    setResult(cleared.result);
    setError(cleared.error);
    setLoading(cleared.loading);
    setImageResetKey((value) => value + 1);
  }

  async function handleVerify() {
    if (loading) return;
    const input = text.trim()
      ? { type: "text", content: text.trim() }
      : link.trim()
        ? { type: "url", content: link.trim() }
        : image
          ? { type: "image" }
          : null;
    if (!input) return;
    setLoading(true);
    setError("");
    setResult(null);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const request = image && !text.trim() && !link.trim()
        ? { body: (() => { const form = new FormData(); form.append("image", image); return form; })() }
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) };
      const response = await fetch("/api/integration/verify", { method: "POST", signal: controller.signal, ...request });
      const data = await response.json();
      if (requestControllerRef.current !== controller) return;
      if (!response.ok || !data.success) {
        setError(data.message || data.verificationUnavailable || data.error?.message || "Verification failed.");
      } else {
        setResult(data);
      }
    } catch (requestError) {
      if (requestControllerRef.current === controller && !(requestError instanceof DOMException && requestError.name === "AbortError")) {
        setError("Could not reach the verification service.");
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
      }
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

        <section>
          <h3 className="mb-5 text-2xl">✍️ Paste Text</h3>
          <p className="mb-3 text-muted-foreground">Paste a factual statement you want Sauce Verify to check.</p>
          <textarea value={text} onChange={(event) => { setText(event.target.value); setError(""); }} placeholder="Amazon was only $43 per share at its 2008 low." className="glassmorphism min-h-28 w-full rounded-2xl px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-white/50" />
        </section>

        {/* Screenshot */}
        <section>
          <h3 className="mb-5 text-2xl">
            📷 Upload Screenshot
          </h3>

          <UploadBox
            onFileSelect={handleImageUpload}
            resetKey={imageResetKey}
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
            Paste a news article or social media link
            you want to verify.
          </p>

          <input
            type="url"
            placeholder="https://example.com/article"
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setError("");
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
            disabled={loading || (!image && !link && !text.trim())}
            onClick={handleVerify}
            className="glassmorphism rounded-full px-8 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Sauce Verify"}
          </button>
          {(image || link || text || result || error || loading) && (
            <button
              type="button"
              onClick={handleClear}
              className="glassmorphism rounded-full px-6 py-4 text-sm font-medium text-muted-foreground transition-transform hover:scale-[1.03] hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {result && (
          <FactCheckResult
            accuracy={Math.round(result.truthScore?.truthScore ?? 0)}
            verdict={result.truthScore?.verdict || result.consensus?.verdict || "UNCERTAIN"}
            truthScoreLabel={result.truthScore?.truthScoreLabel}
            consensus={result.truthScore?.consensusType}
            averageConfidence={result.truthScore?.averageConfidence}
            verificationMode={result.verification?.mode}
            successfulModels={result.verification?.successfulModels}
            configuredModels={result.verification?.configuredModels}
            explanation={result.verification?.results?.[0]?.result?.reasoning || "No verification reasoning available."}
            sources={(result.evidence || []).map((item: { title?: string; source?: string; url?: string; publishedAt?: string | null }) => ({
              title: item.title,
              source: item.source,
              url: item.url,
              publishedAt: item.publishedAt,
            })).filter((item: { title?: string; source?: string; url?: string }) => item.title || item.source || item.url)}
            verificationRequests={[...(result.verification?.results || []), ...(result.verification?.failures || [])].flatMap((item: any) => item.model && item.requestId ? [{ model: item.model, requestId: item.requestId }] : [])}
          />
        )}

      </section>
    </GlowCursor>
  );
}
