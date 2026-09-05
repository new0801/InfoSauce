import SourceList from "./SourceList";
import { getVerdictFromTruthScore } from "../lib/articleData";

type FactCheckResultProps = {
  accuracy: number;
  explanation: string;
  sources: string[];
  verificationTrace?: {
  model: string;
  requestId: string;
}[];
};



export default function FactCheckResult({
  accuracy,
  explanation,
  sources,
  verificationTrace = [],
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
            <span
              tabIndex={0}
              title="Truth Score shows how strongly the available evidence supports the claim."
              aria-label="Truth Score explanation"
              className="absolute left-[5.8rem] -top-1 cursor-help text-[10px] text-foreground/80"
            >
              ⓘ
            </span>
          </strong>

          <span className="mr-3">
            :
          </span>

          <span>
            {accuracy}%
          </span>
        </div>

        <div className="flex">
          <strong className="w-28 shrink-0 text-muted-foreground">
            Verdict
          </strong>

          <span className="mr-3">
            :
          </span>

          <span>
            {getVerdictFromTruthScore(accuracy)}
          </span>
        </div>

        <div className="border-t border-white/10 pt-4">
          <strong className="mb-3 block text-muted-foreground">
            Gonka Request IDs
          </strong>

          <div className="space-y-2">
            {verificationTrace.length > 0 ? (
              verificationTrace.map((trace) => (
                <div
                  key={`${trace.model}-${trace.requestId}`}
                  className="rounded-xl bg-white/5 p-3 text-sm"
                >
                  <p className="break-all text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {trace.model}:
                    </span>{" "}
                    {trace.requestId}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No Gonka verification request ID available.
              </p>
            )}
          </div>
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
