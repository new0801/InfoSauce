export type EvidenceSource = {
  title?: string;
  source?: string;
  url?: string;
  publishedAt?: string | null;
};

type SourceListProps = {
  sources: EvidenceSource[];
};

function domainFromUrl(url?: string) {
  if (!url) return "";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formattedDate(publishedAt?: string | null) {
  if (!publishedAt) return "";
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function SourceList({
  sources,
}: SourceListProps) {
  return (
    <section>
      <h3 className="mb-3 text-2xl text-foreground">
        Sources
      </h3>

      <ul className="space-y-2 text-muted-foreground">
        {sources.map((source, index) => {
          const domain = domainFromUrl(source.url);
          const attribution = [source.source, domain]
            .filter((value, valueIndex, values) => value && values.indexOf(value) === valueIndex)
            .join(" · ");
          const date = formattedDate(source.publishedAt);

          return (
          <li
            key={source.url || `${source.title}-${index}`}
            className="text-sm leading-relaxed"
          >
            <span className="mr-1">•</span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white/80"
              >
                {source.title || source.url}
              </a>
            ) : (
              <span className="text-foreground">{source.title || source.source || "Evidence source"}</span>
            )}
            {(attribution || date) && (
              <span className="ml-2 text-muted-foreground">
                {attribution}{attribution && date ? " · " : ""}{date}
              </span>
            )}
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 break-all text-xs text-muted-foreground underline decoration-white/20 underline-offset-2 hover:text-foreground"
              >
                {source.url}
              </a>
            )}
          </li>
          );
        })}
      </ul>
    </section>
  );
}
