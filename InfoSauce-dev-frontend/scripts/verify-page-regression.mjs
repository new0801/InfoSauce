import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/app/verify/page.tsx", import.meta.url),
  "utf8"
);

assert.match(source, /sources\?: string\[\]/);
assert.match(source, /verificationTrace=\{result\.verification\.results\.map/);
assert.match(source, /sources=\{result\.sources \?\? \[\]\}/);
assert.match(source, /accuracy=\{roundedTruthScore\}/);
assert.match(source, /getVerdictFromTruthScore.*articleData/);
assert.doesNotMatch(source, /verificationTrace=\{result\.verificationTrace/);
assert.doesNotMatch(source, /verdict=\{result\.consensus\.verdict\}/);

console.log("Sauce Verify result mapping regression check passed");
