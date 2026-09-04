export const categories = {
  "AI & Technology": [
    "AI",
    "Emerging Technology",
    "Apps",
    "Gadgets",
    "Cybersecurity",
    "Tech Companies"
  ],

  "Entertainment & K-Pop": [
    "K-Pop",
    "K-Drama",
    "Movies",
    "Music",
    "Celebrities",
    "Viral Entertainment"
  ],

  "World & Local": [
    "International News",
    "Malaysia News",
    "Politics",
    "Social Issues",
    "International Relations",
    "Disasters & Major Events"
  ],

  "Business & Money": [
    "Business",
    "Stocks & Markets",
    "Jobs & Careers",
    "Startups",
    "Personal Finance",
    "Economy"
  ],

  "Life & Trends": [
    "Health & Wellness",
    "Education",
    "Travel",
    "Lifestyle",
    "Sports",
    "Food",
    "Social Trends"
  ]
} as const;

export type CategoryArea = keyof typeof categories;
export type CategoryTopic = (typeof categories)[CategoryArea][number];

export function isCategoryArea(value: string): value is CategoryArea {
  return value in categories;
}

export function isCategoryTopic(value: string): value is CategoryTopic {
  return Object.values(categories).some((topics) => topics.includes(value as never));
}
