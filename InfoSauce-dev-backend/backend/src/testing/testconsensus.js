const { calculateConsensus } = require("./services/consensus");

const results = [
    {
        model: "deepseek-ai/DeepSeek-V4-Flash-0731",
        result: {
            verdict: "FALSE",
            confidence: 0.99,
            reasoning: "The claim contradicts established scientific evidence."
        }
    },
    {
        model: "MiniMaxAI/MiniMax-M2.7",
        result: {
            verdict: "FALSE",
            confidence: 0.999,
            reasoning: "Multiple independent lines of evidence contradict the claim."
        }
    }
];

const consensus = calculateConsensus(results);

console.log("Consensus:");
console.dir(consensus, { depth: null });