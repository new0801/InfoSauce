const { calculateTruthScore } = require("./services/truthscore");

console.log(
    calculateTruthScore({
        verdict: "TRUE",
        confidence: 1
    })
);

console.log(
    calculateTruthScore({
        verdict: "FALSE",
        confidence: 1
    })
);

console.log(
    calculateTruthScore({
        verdict: "TRUE",
        confidence: 0.8
    })
);

console.log(
    calculateTruthScore({
        verdict: "FALSE",
        confidence: 0.8
    })
);

console.log(
    calculateTruthScore({
        verdict: "UNCERTAIN",
        confidence: 0.9
    })
);