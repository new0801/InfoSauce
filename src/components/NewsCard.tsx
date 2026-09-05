type NewsCardProps = {
  category: string;
  title: string;
  summary: string;
  content: string;
  status: "Supported" | "Partially Supported" | "False" | "Unverified" | "Verified" | "Not verifiable";
  sources: number;
  platform?: string;
  verificationState?: string;
  href?: string;
  onReadMore?: () => void;
  onRetryVerification?: () => void;
  retrying?: boolean;
  retryError?: string;
};

export default function NewsCard({
  category,
  title,
  summary,
  status,
  sources,
  platform,
  verificationState,
  href,
  onReadMore,
  onRetryVerification,
  retrying = false,
  retryError,
}: NewsCardProps) {
  const platformLabel = platform === "twitter" ? "X" : platform;

  return (
    <article className="glassmorphism rounded-2xl p-6 text-foreground transition-transform duration-300 hover:-translate-y-1">
      {/* Category */}
      <h3 className="mb-3 text-lg text-muted-foreground">
        {category}
      </h3>

      {/* Title */}
      <h2 className="mb-3 text-3xl leading-none">
        {title}
      </h2>

      {/* Summary */}
      <p className="mb-5 text-base leading-7 text-muted-foreground">
        {summary}
      </p>

      {platform && (
        <p className="mb-4 text-sm text-muted-foreground">
          Platform: {platformLabel}
        </p>
      )}

      {verificationState && (
        <p className="mb-4 text-sm text-muted-foreground">
          {verificationState}
        </p>
      )}

      {/* Verification + Sources */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {status === "Supported" && "🟢"}
          {status === "Verified" && "🟢"}
          {status === "Partially Supported" && "🟡"}
          {status === "Unverified" && "🔴"}{" "}
          {status === "Not verifiable" && "⚪"}
          {status}
        </span>

        <span>
          Sources: {sources}
        </span>
      </div>

      {onRetryVerification && (
        <div className="mt-4">
          <button type="button" disabled={retrying} onClick={onRetryVerification} className="text-sm text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">
            {retrying ? "Verifying..." : "↻ Retry verification"}
          </button>
          {retryError && <p className="mt-2 text-sm text-muted-foreground">{retryError}</p>}
        </div>
      )}

      {/* Only Trending needs Read More */}
      {onReadMore ? (
        <button type="button" onClick={onReadMore} className="mt-4 inline-block text-sm text-foreground underline underline-offset-4">
          Read More
        </button>
      ) : href && (
        <a
          href={href}
          className="mt-4 inline-block text-sm text-foreground underline underline-offset-4"
        >
          Read More
        </a>
      )}
    </article>
  );
}
