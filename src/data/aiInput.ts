export interface AIInput {
  newsId: string;
  title: string;
  content: string;
  claim: string;
  sources: string[];
  evidence: string[];
}

export const aiInputs: AIInput[] = [
  {
    newsId: "AI001",
    title: "Company X Releases New AI Model",
    content: "Company X announced the release of a new AI model.",
    claim: "Company X released a new AI model.",
    sources: ["SRC001", "SRC002"],
    evidence: ["EV001", "EV002"],
  },
];
