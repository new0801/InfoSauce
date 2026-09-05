import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = [
  "../src/app/page.tsx",
  "../src/app/daily/page.tsx",
  "../src/app/verify/page.tsx",
  "../src/components/FactCheckResult.tsx",
];

const sources = await Promise.all(
  files.map((file) => readFile(new URL(file, import.meta.url), "utf8"))
);

for (const source of sources) {
  assert.match(source, /getVerdictFromTruthScore/);
}

assert.doesNotMatch(sources[0], /expandedNews\.consensus\s*\?\.verdict/);
assert.doesNotMatch(sources[1], /getVerdictLabel|convertVerdictToStatus/);
assert.doesNotMatch(sources[2], /result\.consensus\.verdict/);

console.log("public verdict display regression check passed");
