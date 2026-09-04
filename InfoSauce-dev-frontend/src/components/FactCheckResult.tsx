import SourceList from "./SourceList";

type FactCheckResultProps = {
  accuracy: number;
  verdict: string;
  explanation: string;
  sources: string[];
};

export default function FactCheckResult({
  accuracy,
  verdict,
  explanation,
  sources,
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
        </div>

        <div className="flex">
          <strong className="w-28 shrink-0 text-muted-foreground">
            Verdict
          </strong>

          <span className="mr-3">
            :
          </span>

          <span>
            {verdict}
          </span>
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
