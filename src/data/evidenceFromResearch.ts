import type { Evidence } from "./evidence";
import type { RawResearchItem } from "./research/types";

export function createEvidenceFromResearch(
  item: RawResearchItem,
  factCheckId: string,
  sourceId: string,
  relevance: number,
  relationship: Evidence["relationship"],
): Evidence {
  return {
    id: `EV-${item.id}`,
    factCheckId,
    sourceId,
    content: item.content,
    relevance,
    relationship,
    publishedAt: item.publishedAt,
  };
}