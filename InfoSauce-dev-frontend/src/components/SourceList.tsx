type SourceListProps = {
  sources: string[];
};

export default function SourceList({
  sources,
}: SourceListProps) {
  return (
    <section>
      <h3 className="mb-3 text-2xl text-foreground">
        Sources
      </h3>

      <ul className="space-y-2 text-muted-foreground">
        {sources.map((source, index) => (
          <li
            key={`${source}-${index}`}
            className="text-sm leading-relaxed"
          >
            • {source}
          </li>
        ))}
      </ul>
    </section>
  );
}
