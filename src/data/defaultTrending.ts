export type DefaultTrendingNews = {
  category: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  platform: string;
  href: string;
  publishedAt: string;
  factCheck: {
    result: "verified";
    summary: string;
    evidence: Array<{ source: string; url: string }>;
  };
  status: "Unverified";
  sources: number;
};

export type DefaultVerificationInput = {
  claim: string;
  title: string;
  content: string;
  sources: string[];
  evidence: Array<{
    title: string;
    content: string;
    url: string;
    source: string;
    platform: string;
    publishedAt: string;
  }>;
};

/**
 * Local articles shown immediately while the live Trending verification
 * pipeline runs in the background.
 */
export const defaultTrendingNews: DefaultTrendingNews[] = [
  {
    category: "AI & Technology",
    title: "Daybreak for Frontline Defenders: $1B to protect essential services",
    summary: "OpenAI announced a $1 billion global commitment to subsidized Daybreak access, training, technical support, and partnerships for organisations protecting essential services.",
    content: "The announcement describes expanded access to frontier AI cyber capabilities for authorised defenders, alongside training, technical support, and partnerships.",
    source: "OpenAI",
    platform: "official announcement",
    href: "https://openai.com/index/daybreak-for-frontline-defenders/",
    publishedAt: "2026-09-03",
    factCheck: {
      result: "verified",
      summary: "The funding commitment and programme scope are stated in OpenAI's September 3 announcement.",
      evidence: [{ source: "OpenAI", url: "https://openai.com/index/daybreak-for-frontline-defenders/" }],
    },
    status: "Unverified",
    sources: 1,
  },
  {
    category: "K-pop & Entertainment",
    title: "[NOTICE] LE SSERAFIM ‘Made My Night’ Release",
    summary: "SOURCE MUSIC announced LE SSERAFIM's second single, ‘Made My Night,’ with a September 11, 2026 release date in South Korea and an October 9 date for other regions.",
    content: "The official Weverse notice also states that pre-orders opened on August 28, 2026 (KST).",
    source: "SOURCE MUSIC / Weverse",
    platform: "official artist notice",
    href: "https://weverse.io/lesserafim/notice/38724",
    publishedAt: "2026-08-28",
    factCheck: {
      result: "verified",
      summary: "Release and pre-order dates are stated in SOURCE MUSIC's official LE SSERAFIM notice.",
      evidence: [{ source: "SOURCE MUSIC / Weverse", url: "https://weverse.io/lesserafim/notice/38724" }],
    },
    status: "Unverified",
    sources: 1,
  },
  {
    category: "World & Local",
    title: "Macao Chief Executive begins working visit to Malaysia",
    summary: "Malaysia's Foreign Ministry announced Sam Hou Fai's working visit to Malaysia from September 2 to 5, 2026; Macao's government separately confirmed his arrival in Kuala Lumpur.",
    content: "The two government notices confirm the visit dates and the visit's purpose of strengthening Macao–Malaysia relations and practical cooperation.",
    source: "Ministry of Foreign Affairs Malaysia",
    platform: "government release",
    href: "https://www.kln.gov.my/web/guest/post/working-visit-of-his-excellency-sam-hou-fai-chief-executive-of-the-macao-special-administrative-region-of-the-peoples-republic-of-china-to-malaysia-2-5-september-2026",
    publishedAt: "2026-09-02",
    factCheck: {
      result: "verified",
      summary: "The visit is confirmed by both Malaysia's Foreign Ministry and the Macao SAR Government.",
      evidence: [
        { source: "Ministry of Foreign Affairs Malaysia", url: "https://www.kln.gov.my/web/guest/post/working-visit-of-his-excellency-sam-hou-fai-chief-executive-of-the-macao-special-administrative-region-of-the-peoples-republic-of-china-to-malaysia-2-5-september-2026" },
        { source: "Macao SAR Government", url: "https://www.gov.mo/en/news/408197/" },
      ],
    },
    status: "Unverified",
    sources: 2,
  },
  {
    category: "Business & Lifestyle",
    title: "Global Economy in Crosscurrents of War and Technology",
    summary: "The IMF's July 2026 World Economic Outlook update projects global growth of 3.0% in 2026 and 3.4% in 2027, while describing an uneven outlook shaped by war and technology investment.",
    content: "The IMF says the war shock weighs on energy importers and vulnerable economies, while AI-driven demand supports countries integrated into the technology value chain.",
    source: "International Monetary Fund",
    platform: "official economic outlook",
    href: "https://www.imf.org/en/publications/weo",
    publishedAt: "2026-07-08",
    factCheck: {
      result: "verified",
      summary: "The figures and outlook are published in the IMF's World Economic Outlook listing and July 2026 update.",
      evidence: [{ source: "International Monetary Fund", url: "https://www.imf.org/en/publications/weo" }],
    },
    status: "Unverified",
    sources: 1,
  },
  {
    category: "Sport & Gaming",
    title: "State of Play & State of Play Japan: all announcements, trailers",
    summary: "Sony's September 3 State of Play recap covered announcements and trailers for more than 30 games across two broadcasts.",
    content: "The official recap includes new game reveals, release updates, and PlayStation Plus announcements from the State of Play and State of Play Japan shows.",
    source: "PlayStation.Blog",
    platform: "official publisher news",
    href: "https://blog.playstation.com/2026/09/03/state-of-play-state-of-play-japan-all-announcements-trailers/",
    publishedAt: "2026-09-03",
    factCheck: {
      result: "verified",
      summary: "Sony Interactive Entertainment's official recap states that the two shows contained news on more than 30 games.",
      evidence: [{ source: "PlayStation.Blog", url: "https://blog.playstation.com/2026/09/03/state-of-play-state-of-play-japan-all-announcements-trailers/" }],
    },
    status: "Unverified",
    sources: 1,
  },
];

/**
 * Maps a local default article to the existing Express /api/verify contract.
 * The Gonka verifier receives only the article's real, listed source evidence.
 */
export function toDefaultVerificationInput(
  article: DefaultTrendingNews,
): DefaultVerificationInput {
  return {
    claim: article.summary,
    title: article.title,
    content: article.content,
    sources: article.factCheck.evidence.map(
      (item) => `${item.source}: ${item.url}`,
    ),
    evidence: article.factCheck.evidence.map((item) => ({
      title: article.title,
      content: article.content,
      url: item.url,
      source: item.source,
      platform: article.platform,
      publishedAt: article.publishedAt,
    })),
  };
}
