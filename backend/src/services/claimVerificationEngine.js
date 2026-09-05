const { retrieveEvidence } = require("./evidence");
const { selectEvidence } = require("./evidenceselector");
const { prepareAiInput } = require("./prepareAIInput");
const { verifyClaim } = require("./verifier");
const { calculateConsensus } = require("./consensus");
const { calculateTruthScore } = require("./truthscore");

const defaults = { retrieveEvidence, selectEvidence, prepareAiInput, verifyClaim, calculateConsensus, calculateTruthScore };
const trace = (items, stage, status, details = {}) => items.push({ stage, status, ...details });

function failure(claim, verificationTrace, evidenceStatus, verificationStatus, verificationUnavailable, extras = {}) {
  return { claim, factCheckable: false, evidenceStatus, verificationStatus, verificationUnavailable, verificationTrace, ...extras };
}

async function verifyExtractedClaim(claim, options = {}, dependencies = defaults) {
  const verificationTrace = options.verificationTrace || [];
  const article = options.article || { id: "user-input", title: claim, content: options.content || claim, source: "Sauce Verify", sourceType: "user_input", url: "" };
  let retrieved;
  try {
    trace(verificationTrace, "evidence_retrieval", "started");
    retrieved = await dependencies.retrieveEvidence(claim, { articles: options.evidenceArticles, article });
  } catch (error) {
    trace(verificationTrace, "evidence_retrieval", "failed", { code: error?.code || "evidence_retrieval_error" });
    trace(verificationTrace, "evidence_selection", "not_applicable");
    trace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
    const timedOut = error?.code === "EVIDENCE_TIMEOUT";
    return failure(claim, verificationTrace, timedOut ? "timeout" : "failed", timedOut ? "evidence_timeout" : "failed", error?.message || "Evidence retrieval is unavailable.");
  }
  const candidates = retrieved?.evidence || [];
  if (!candidates.length) {
    trace(verificationTrace, "evidence_retrieval", "unavailable");
    trace(verificationTrace, "evidence_selection", "not_applicable");
    trace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
    return failure(claim, verificationTrace, "evidence_unavailable", "skipped", "No supporting evidence was available.");
  }
  trace(verificationTrace, "evidence_retrieval", "completed", { evidenceCandidateCount: candidates.length });
  let selection;
  try {
    trace(verificationTrace, "evidence_selection", "started");
    selection = await dependencies.selectEvidence(claim, candidates);
  } catch (error) {
    trace(verificationTrace, "evidence_selection", "failed", { code: error?.code || "evidence_selection_error" });
    trace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
    const timedOut = error?.code === "GONKA_TIMEOUT";
    return failure(claim, verificationTrace, timedOut ? "timeout" : "failed", timedOut ? "gonka_timeout" : "failed", error?.message || "Evidence selection failed.");
  }
  const indexes = selection?.results?.[0]?.selectedEvidence;
  const evidence = Array.isArray(indexes) ? indexes.map(index => candidates[index]).filter(Boolean) : [];
  if (!evidence.length) {
    trace(verificationTrace, "evidence_selection", "unavailable");
    trace(verificationTrace, "gonka_verification", "not_applicable", { pollAttempts: 0 });
    return failure(claim, verificationTrace, "evidence_unavailable", "skipped", "No relevant evidence was selected.", { evidenceSelection: selection, evidence });
  }
  trace(verificationTrace, "evidence_selection", "completed", { selectedEvidenceCount: evidence.length });
  const input = dependencies.prepareAiInput(article, evidence);
  input.claim = claim;
  input.evidence = evidence;
  try {
    trace(verificationTrace, "gonka_verification", "started");
    const verification = await dependencies.verifyClaim(input);
    const consensus = dependencies.calculateConsensus(verification);
    const truthScore = dependencies.calculateTruthScore(verification.results, consensus);
    const requestIds = [...(verification.results || []), ...(verification.failures || [])].map(item => item.requestId).filter(Boolean);
    trace(verificationTrace, "gonka_verification", "completed", { requestIds });
    return { claim, factCheckable: true, evidenceStatus: "available", verificationStatus: "completed", evidence, evidenceSelection: selection, verification, consensus, truthScore, verificationTrace };
  } catch (error) {
    trace(verificationTrace, "gonka_verification", "failed", { code: error?.code || "gonka_verification_error" });
    return failure(claim, verificationTrace, "available", "failed", error?.message || "Gonka verification failed.", { evidence, evidenceSelection: selection });
  }
}

module.exports = { verifyExtractedClaim };
