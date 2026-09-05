const sharp = require("sharp");
const { createWorker } = require("tesseract.js");
const { extractClaim } = require("./claimextractor");
const { verifyExtractedClaim } = require("./claimVerificationEngine");

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const formats = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
let workerPromise;

function failure(message, status = "failed") { return { success: false, stage: "content_extraction", status, message }; }
function signatureMatches(buffer, mime) {
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}
async function recognize(buffer) {
  workerPromise ||= createWorker("eng");
  const worker = await workerPromise;
  const result = await worker.recognize(buffer);
  return result.data.text;
}
async function verifyImageUpload(file, dependencies = {}) {
  const started = Date.now();
  if (!file || !Buffer.isBuffer(file.buffer)) return failure("Unsupported image format.", "unsupported");
  if (!Object.values(formats).includes(file.mimetype)) return failure("Unsupported image format.", "unsupported");
  if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) return failure("Image upload exceeds the 5 MiB limit.");
  if (!signatureMatches(file.buffer, file.mimetype)) return failure("The image format does not match its declared type.");
  let metadata;
  try { metadata = await sharp(file.buffer, { failOn: "error" }).metadata(); } catch { return failure("The uploaded image is invalid or corrupt."); }
  if (formats[metadata.format] !== file.mimetype) return failure("The image format does not match its declared type.");
  console.log(`[IMAGE] validationMs=${Date.now() - started} format=${metadata.format} size=${file.size}`);
  let text;
  const ocrStarted = Date.now();
  try { text = await (dependencies.recognize || recognize)(file.buffer); } catch { return failure("Text extraction from this image failed."); }
  console.log(`[IMAGE] ocrMs=${Date.now() - ocrStarted} textLength=${typeof text === "string" ? text.trim().length : 0}`);
  if (typeof text !== "string" || text.trim().length < 3) return failure("No readable text was detected in this image.");
  const extractedText = text.trim();
  const claimStarted = Date.now();
  let claim;
  try { claim = await (dependencies.extractClaim || extractClaim)(extractedText); } catch { return { success: false, stage: "claim_extraction", status: "failed", message: "Claim extraction failed." }; }
  console.log(`[IMAGE] claimExtractionMs=${Date.now() - claimStarted}`);
  if (!claim?.hasClaim || !claim.claim?.trim()) return { success: false, stage: "claim_extraction", status: "not_verifiable", message: "No verifiable factual claim was found." };
  const result = await (dependencies.verifyExtractedClaim || verifyExtractedClaim)(claim.claim.trim(), { content: extractedText });
  console.log(`[IMAGE] totalMs=${Date.now() - started}`);
  return { success: result.verificationStatus === "completed", input: { type: "image", fileName: file.originalname, mimeType: file.mimetype, size: file.size }, extraction: { textDetected: true, textLength: extractedText.length }, claimStatus: "completed", claim: { hasClaim: true, text: claim.claim.trim() }, ...result };
}
module.exports = { verifyImageUpload, MAX_UPLOAD_BYTES };
