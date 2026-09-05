import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FactCheckResult from "./FactCheckResult";
import SourceList from "./SourceList";

describe("FactCheckResult", () => {
  it("keeps verification internals out of the result display", () => {
    const markup = renderToStaticMarkup(
      <FactCheckResult
        accuracy={93}
        verdict="TRUE"
        truthScoreLabel="Very strongly supported"
        consensus="Models agree the evidence supports the claim"
        averageConfidence={0.85}
        explanation="The evidence supports the claim."
        sources={[{ title: "OpenAI", source: "OpenAI" }]}
        verificationRequests={[
          { model: "deepseek-ai/DeepSeek-V4-Flash-0731", requestId: "req-deepseek" },
          { model: "MiniMaxAI/MiniMax-M2.7", requestId: "req-minimax" },
        ]}
      />,
    );

    const text = markup.replace(/<[^>]*>/g, "");

    expect(text).toContain("On-Chain Proof");
    expect(text).toContain("Gonka Router ID");
    expect(text).toContain("Very strongly supported");
    expect(text).not.toContain("Consensus");
    expect(text).not.toContain("Models agree the evidence supports the claim");
    expect(text).not.toContain("Average Confidence");
    expect(text).not.toContain("85%");
    expect(text).toContain("deepseek-ai/DeepSeek-V4-Flash-0731: req-deepseek");
    expect(text).toContain("MiniMaxAI/MiniMax-M2.7: req-minimax");
  });

  it("uses the same label column width for Truth Score and Verdict", () => {
    const markup = renderToStaticMarkup(
      <FactCheckResult
        accuracy={93}
        verdict="TRUE"
        explanation="The evidence supports the claim."
        sources={[]}
        verificationRequests={[]}
      />,
    );

    expect(markup.match(/w-32 shrink-0/g)).toHaveLength(2);
    expect(markup).not.toContain("w-28 shrink-0");
  });

  it("does not render a consensus label when a consensus enum is provided", () => {
    const markup = renderToStaticMarkup(
      <FactCheckResult
        accuracy={87}
        verdict="TRUE"
        consensus="single_model_only"
        explanation="The evidence supports the claim."
        sources={[]}
        verificationRequests={[]}
      />,
    );

    const text = markup.replace(/<[^>]*>/g, "");

    expect(text).not.toContain("Consensus");
    expect(text).not.toContain("Limited consensus");
    expect(text).not.toContain("single_model_only");
  });

  it("does not render a full-agreement label when a consensus enum is provided", () => {
    const markup = renderToStaticMarkup(
      <FactCheckResult accuracy={94} verdict="TRUE" consensus="agreement_true" explanation="Supported." sources={[]} verificationRequests={[]} />,
    );
    const text = markup.replace(/<[^>]*>/g, "");
    expect(text).not.toContain("Consensus");
    expect(text).not.toContain("Full agreement — True");
    expect(text).not.toContain("agreement_true");
  });

  it("shows a concise degraded verification status without provider error details", () => {
    const markup = renderToStaticMarkup(
      <FactCheckResult
        accuracy={87}
        verdict="TRUE"
        consensus="single_model_only"
        verificationMode="degraded"
        successfulModels={1}
        configuredModels={2}
        explanation="The evidence supports the claim."
        sources={[]}
        verificationRequests={[]}
      />,
    );

    const text = markup.replace(/<[^>]*>/g, "");

    expect(text).toContain("Verification completed with 1 of 2 models.");
    expect(text).not.toContain("GONKA_TIMEOUT");
    expect(text).not.toContain("provider detail");
  });

  it("renders structured evidence with its title, attribution, date, and link", () => {
    const markup = renderToStaticMarkup(
      <SourceList
        sources={[{
          title: "Earth Facts",
          source: "NASA",
          url: "https://science.nasa.gov/earth/facts/",
          publishedAt: "2025-01-02T00:00:00.000Z",
        }]}
      />,
    );

    expect(markup).toContain("Earth Facts");
    expect(markup).toContain("NASA");
    expect(markup).toContain("Jan 2, 2025");
    expect(markup).toContain('href="https://science.nasa.gov/earth/facts/"');
  });
});
