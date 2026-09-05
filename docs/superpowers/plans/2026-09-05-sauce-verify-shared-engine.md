# Sauce Verify Shared Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing Sauce Verify page to a real text verification API while making DailySauce and Sauce Verify use one claim-to-verdict engine.

**Architecture:** Extract DailySauce's post-claim stages into a backend service that accepts a factual claim and evidence-search options, then returns evidence, Gonka model results, consensus, Truth Score, and a stage trace. Daily keeps its article-specific claim extraction and presentation adapter; `/api/verify` normalizes text input, extracts a claim, and uses the same engine. The existing Next proxy remains the browser boundary.

**Tech Stack:** Next.js 16, React 19, TypeScript, Express 5, CommonJS services, Vitest.

**Spec:** User-approved Sauce Verify integration design in this task.

## Global Constraints

- Preserve the Sauce Verify page's current layout, styling, components, and image/link controls.
- Text input must be genuinely verified; URL and image extraction return explicit unsupported states.
- Do not fabricate extracted content, evidence, Gonka responses, confidence, or request IDs.
- Reuse the configured Gonka models, consensus implementation, and Truth Score implementation.
- Browser requests must go through `POST /api/integration/verify`.
- DailySauce must continue to use the same verification engine.

---

### Task 1: Extract the shared claim verification engine

**Files:**
- Create: `backend/src/services/claimVerificationEngine.js`
- Modify: `backend/src/services/dailyPipeline.js`
- Test: `backend/src/services/claimVerificationEngine.test.js`

**Interfaces:**
- Produces: `verifyExtractedClaim(claim, { evidenceArticles? }, dependencies?)`.
- Returns either a completed verification object or an explicit `claimStatus`, `evidenceStatus`, `verificationStatus`, `verificationUnavailable`, and `verificationTrace`.

- [ ] Write failing tests for selected evidence leading to Gonka/consensus/Truth Score and for no selected evidence returning `evidence_unavailable` without Gonka.
- [ ] Run `npm test -- backend/src/services/claimVerificationEngine.test.js` and confirm RED.
- [ ] Move the evidence retrieval, selection, preparation, Gonka, consensus, Truth Score, and trace logic from `dailyPipeline.js` into `verifyExtractedClaim`.
- [ ] Adapt `verifyDailyArticle` to call the engine after Daily's existing claim extraction, retaining Daily-specific headline/status data.
- [ ] Run the engine and Daily pipeline tests and confirm GREEN.

### Task 2: Normalize Sauce Verify input in Express

**Files:**
- Modify: `backend/src/routes/verify.js`
- Test: `backend/src/routes/verify.test.js`

**Interfaces:**
- Consumes: `{ type: "text" | "url" | "image", content: string }`.
- Produces: the shared-engine result with input metadata and explicit stage/status failures.

- [ ] Write failing route tests for text input forwarding its extracted claim to the engine, non-verifiable text, and explicit URL/image unsupported responses.
- [ ] Run `npm test -- backend/src/routes/verify.test.js` and confirm RED.
- [ ] Replace the legacy `/verify` prebuilt-claim branch with input validation, text claim extraction, and shared-engine invocation; leave category behavior unchanged.
- [ ] Run route and engine tests and confirm GREEN.

### Task 3: Integrate the existing Sauce Verify page

**Files:**
- Modify: `src/app/verify/page.tsx`
- Create: `src/app/verify/page.test.tsx`
- Modify: `src/components/FactCheckResult.tsx` only if its existing props cannot render the normalized response.

**Interfaces:**
- Browser submits `{ type: "text", content }`, `{ type: "url", content }`, or `{ type: "image", content: file.name }` to `/api/integration/verify`.
- Page maps returned `verification`, `truthScore`, `consensus`, evidence, and failure stage to its existing result/error regions.

- [ ] Write a failing UI test for text submission, disabled duplicate submit, and a returned Truth Score/verdict render.
- [ ] Run `npm test -- src/app/verify/page.test.tsx` and confirm RED.
- [ ] Add a text input, loading state, fetch handler, error mapping, and result mapping without changing the page's visual structure.
- [ ] Keep URL/image controls; submit their real input type and show backend unsupported messages.
- [ ] Run the page test and confirm GREEN.

### Task 4: Verify the integration

**Files:**
- Test: `src/app/api/integration/[operation]/route.test.ts`
- Test: `backend/src/services/dailyPipeline.test.js`

- [ ] Add proxy coverage for the Sauce Verify text payload and upstream failure pass-through.
- [ ] Run `npm test` and fix only regressions from this integration.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Exercise the local page with a controlled backend response to confirm its existing Verify button sends the normalized request and renders the returned verdict/Truth Score.
