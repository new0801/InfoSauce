type NewsCardProps = {
  category: string;
  source?: string;
  title: string;
  summary: string;
  content: string;
  status: "Supported" | "Partially Supported" | "False" | "Unverified";
  sources: number;
  href?: string;
  onReadMore?: () => void;

};

export default function NewsCard({
  category,
  source,
  title,
  summary,
  content,
  status,
  sources,
  href,
  onReadMore,
}: NewsCardProps) {
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

      {source && (
        <p className="mb-3 text-sm text-muted-foreground">
          Source: {source}
        </p>
      )}

      {/* Summary */}
      <p className="mb-5 text-base leading-7 text-muted-foreground">
        {summary}
      </p>

      {/* Verification + Sources */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {status === "Supported" && "🟢"}
          {status === "Partially Supported" && "🟡"}
          {status === "Unverified" && "🔴"}{" "}
          {status}
        </span>

        <span>
          Sources: {sources}
        </span>
      </div>

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
