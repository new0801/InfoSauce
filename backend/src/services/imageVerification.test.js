import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { verifyImageUpload } = require("./imageVerification");

const dependencies = (overrides = {}) => ({
  recognize: vi.fn().mockResolvedValue("The Earth orbits the Sun."),
  extractClaim: vi.fn().mockResolvedValue({ hasClaim: true, claim: "The Earth orbits the Sun." }),
  verifyExtractedClaim: vi.fn().mockResolvedValue({ verificationStatus: "completed", evidenceStatus: "available", verification: { successfulModels: 1, configuredModels: 2, mode: "degraded" } }),
  ...overrides,
});
const image = async (format, mimeType) => ({ originalname: `claim.${format}`, mimetype: mimeType, buffer: await sharp({ create: { width: 100, height: 60, channels: 3, background: "white" } }).toFormat(format).toBuffer(), size: 500 });

describe("verifyImageUpload", () => {
  it.each([["png", "image/png"], ["jpeg", "image/jpeg"], ["webp", "image/webp"]])("validates %s bytes and sends OCR text through the shared verifier", async (format, mime) => {
    const deps = dependencies(); const result = await verifyImageUpload(await image(format, mime), deps);
    expect(deps.extractClaim).toHaveBeenCalledWith("The Earth orbits the Sun.");
    expect(deps.verifyExtractedClaim).toHaveBeenCalledWith("The Earth orbits the Sun.", expect.any(Object));
    expect(result).toMatchObject({ success: true, input: { type: "image", mimeType: mime }, extraction: { textDetected: true, textLength: 25 } });
  });
  it("rejects unsupported, mismatched, corrupt, and oversized input", async () => {
    await expect(verifyImageUpload({ originalname: "x.gif", mimetype: "image/gif", buffer: Buffer.from("GIF89a"), size: 6 })).resolves.toMatchObject({ status: "unsupported" });
    await expect(verifyImageUpload({ ...(await image("png", "image/jpeg")) })).resolves.toMatchObject({ status: "failed" });
    await expect(verifyImageUpload({ originalname: "x.png", mimetype: "image/png", buffer: Buffer.from("not-image"), size: 9 })).resolves.toMatchObject({ status: "failed" });
    await expect(verifyImageUpload({ ...(await image("png", "image/png")), size: 5 * 1024 * 1024 + 1 })).resolves.toMatchObject({ status: "failed" });
  });
  it("distinguishes no text and OCR failures", async () => {
    await expect(verifyImageUpload(await image("png", "image/png"), dependencies({ recognize: vi.fn().mockResolvedValue("   ") }))).resolves.toMatchObject({ message: "No readable text was detected in this image." });
    await expect(verifyImageUpload(await image("png", "image/png"), dependencies({ recognize: vi.fn().mockRejectedValue(new Error("ocr")) }))).resolves.toMatchObject({ message: "Text extraction from this image failed." });
  });
});
