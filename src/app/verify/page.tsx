"use client";

import { useState } from "react";
import GlowCursor from "../../components/GlowCursor";
import Navbar from "../../components/Navbar";
import UploadBox from "../../components/UploadBox";
import ScreenshotPreview from "../../components/ScreenshotPreview";
import FactCheckResult from "../../components/FactCheckResult";

export default function VerifyPage() {
  const [image, setImage] = useState<File | null>(null);
  const [link, setLink] = useState("");

  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const sources = [
    "Source 1",
    "Source 2",
    "Source 3",
  ];

  function handleImageUpload(file: File | null) {
    setImage(file);
    setShowResult(false);
    setError("");
  }

  function handleVerify() {
    setError("");
    setShowResult(false);
    setIsLoading(true);

    // Temporary mock verification
    // Later this will be replaced by the Backend API
    setTimeout(() => {
      setIsLoading(false);
      setShowResult(true);
    }, 1500);
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
            Paste a news article or social media link
            you want to verify.
          </p>

          <input
            type="url"
            placeholder="https://example.com/article"
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setShowResult(false);
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
        <div className="mt-8 text-center">
          <button
            disabled={(!image && !link) || isLoading}
            onClick={handleVerify}
            className="glassmorphism rounded-full px-8 py-4 text-sm font-medium text-foreground transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "Verifying..."
              : "Sauce Verify"}
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Checking your information...
          </p>
        )}

        {/* Fact Check Result */}
        {showResult && !isLoading && (
          <FactCheckResult
            accuracy={87}
            verdict="Mostly Accurate"
            explanation="The main claim appears to be supported by multiple reliable sources. However, some details may require further verification."
            sources={sources}
          />
        )}
      </section>
    </GlowCursor>
  );
}
