import SourceList from "./SourceList";
import type { EvidenceSource } from "./SourceList";

type FactCheckResultProps = {
  accuracy: number;
  verdict: string;
  truthScoreLabel?: string;
  consensus?: string;
  averageConfidence?: number;
  verificationMode?: "full" | "degraded";
  successfulModels?: number;
  configuredModels?: number;
  explanation: string;
  sources: EvidenceSource[];
  verificationRequests: Array<{
    model: string;
    requestId: string;
  }>;
};

export default function FactCheckResult({
  accuracy,
  verdict,
  truthScoreLabel,
  verificationMode,
  successfulModels,
  configuredModels,
  explanation,
  sources,
  verificationRequests,
}: FactCheckResultProps) {
  return (
    <section className="glassmorphism mt-12 rounded-3xl p-6 sm:p-8">
      <h2 className="mb-8 text-3xl">
        Fact Check Result
      </h2>

      {/* Accuracy + Verdict */}
      <div className="space-y-4 rounded-2xl bg-white/10 p-5">
        <div className="flex">
          <strong className="relative flex w-32 shrink-0 text-muted-foreground">
            Truth Score
            <span tabIndex={0} title="Truth Score shows how strongly the available evidence supports the claim." aria-label="Truth Score explanation" className="absolute left-[5.8rem] -top-1 cursor-help text-[10px] text-foreground/80">
              ⓘ
            </span>
          </strong>

          <span className="mr-3">
            :
          </span>

          <span>
            {accuracy}%
          </span>
          {truthScoreLabel && <span className="ml-3 text-sm text-muted-foreground">{truthScoreLabel}</span>}
        </div>

        <div className="flex">
          <strong className="w-32 shrink-0 text-muted-foreground">
            Verdict
          </strong>

          <span className="mr-3">
            :
          </span>

          <span>
            {verdict}
          </span>
        </div>

        {verificationMode === "degraded" &&
          typeof successfulModels === "number" &&
          typeof configuredModels === "number" && (
          <p className="text-sm text-muted-foreground">
            Verification completed with {successfulModels} of {configuredModels} models.
          </p>
        )}

        <div className="border-t border-white/10 pt-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            On-Chain Proof
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            Gonka Router ID:
          </p>

          {verificationRequests.length > 0 ? (
            <ul className="space-y-2 text-sm text-foreground">
              {verificationRequests.map((request) => (
                <li key={`${request.model}-${request.requestId}`} className="break-all">
                  <span className="text-muted-foreground">
                    {request.model}:
                  </span>{" "}
                  {request.requestId}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No Gonka Router ID was returned for this result.
            </p>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-8">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Explanation:
        </p>

        <p className="leading-7 text-muted-foreground">
          {explanation}
        </p>
      </div>

      {/* Sources */}
      <div className="mt-8">
        <SourceList sources={sources} />
      </div>
    </section>
  );
}
