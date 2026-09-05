import { researchAll } from "./researchAll";

async function main() {
  console.log("Starting research...");

  const result = await researchAll("AI");

  console.log("\nQuery:");
  console.log(result.query);

  console.log("\nPlatforms:");
  console.log(
    result.platformResults.map((item) => ({
      platform: item.platform,
      items: item.items.length,
      unavailable: item.unavailable ?? null,
    })),
  );

  console.log("\nUnavailable platforms:");
  console.log(result.unavailablePlatforms);

  console.log("\nRaw items:", result.rawItems.length);
  console.log("Normalized news:", result.news.length);

  console.log("\nFirst 3 normalized news:");
  console.dir(result.news.slice(0, 3), { depth: null });
}

main().catch(console.error);
