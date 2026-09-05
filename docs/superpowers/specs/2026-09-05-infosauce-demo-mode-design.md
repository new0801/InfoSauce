# InfoSauce stable public demo mode

## Goal

Provide a judge-friendly Vercel deployment that presents InfoSauce's Trending,
Daily Sauce, article-detail, and Sauce Verify experiences without depending on
OpenCLI, mcporter, browser sessions, or live social-media retrieval. Research
and evidence are prepared and clearly labelled as demo material. Gonka
verification remains a real, server-side request.

## Scope and branch safety

This work is restricted to the existing `demo-web` branch. It uses the
completed InfoSauce flows on `integration2` as the behavioral and UI reference,
without switching to, merging, or editing that branch. Existing unrelated
working-tree changes to `backend/src/server.js` and the untracked
`backend/eng.traineddata` file remain untouched.

## Architecture

The demo catalog is owned by the Express backend. It contains only prepared
display data: topics, article metadata, claims, evidence title/source/URL/date,
and whether an item is eligible for live fact checking. The browser never sends
arbitrary evidence or an authoritative truth score.

```
Browser caseId
  -> /api/demo/verify/:caseId
  -> server-owned prepared claim + evidence
  -> existing prepareAiInput
  -> existing verifyClaim
  -> existing consensus and Truth Score output
  -> response with real model results and real Gonka request IDs
```

No demo endpoint calls `researchAll`, `retrieveEvidence`, OpenCLI, mcporter,
or a social platform adapter.

## Backend components

- `src/data/demo/`: structured catalog of prepared Trending topics, Daily
  articles, and stable evidence records. All output is explicitly marked
  `demoMode: true`.
- `src/routes/demo.js`: read-only endpoints for Trending, Daily listing, and
  Daily detail, plus a verify endpoint that accepts only a known case ID.
- Existing `prepareAiInput`, `verifyClaim`, consensus, Truth Score, strict
  parser, and degraded-model behavior are reused unchanged.

The verify endpoint returns `0/2` failures honestly, retains existing failure
categories, and never fabricates a model result, request ID, or verdict.

## Frontend components and pages

Existing `Navbar`, visual styling, and `FactCheckResult` are reused. The demo
branch adds the smallest pages/components required for:

1. Home: product overview, three entry points, and visible Demo Mode notice.
2. Trending: prepared topic cards from the demo API.
3. Daily Sauce: prepared article cards with their claim, source, and workflow
   status; no live feed generation control.
4. Daily article detail: prepared claim/evidence and a `Verify with Gonka`
   action for eligible items.
5. Sauce Verify: a preloaded Earth-orbits-the-Sun demo case that sends only its
   server-owned case ID, then renders the live result through `FactCheckResult`.

Each page displays this notice near its primary content:

> Demo Mode — Research and evidence are pre-collected for stability.
> Verification is performed live through Gonka.

`VERIFIED` means a live fact-check completed in the current browser session;
the factual verdict remains the existing TRUE/FALSE/MIXED/etc. value. Static
cards may initially show `UNVERIFIED` or `NOT VERIFIABLE`, but never invented
Gonka results or request IDs.

## Failure handling and security

- Unknown, non-verifiable, or malformed case IDs receive a safe 404/422 response.
- A one-model result renders as the existing degraded valid outcome; two failed
  models render a verification failure without fake data.
- `GONKA_API_KEY` is read only by the backend environment. It is not placed in
  Next public variables, static data, client requests, logs, or source control.
- Prepared evidence is shown as pre-collected, never presented as a live
  retrieval result.

## Tests and verification

Tests are written first for catalog lookup, unsafe/unknown case rejection,
server-owned evidence selection, verifier invocation, full/degraded/failed
model result mapping, and frontend Demo Mode/result states. Then run the
authoritative frontend TypeScript/lint/build checks and relevant backend tests.
A local manual check will cover all five pages and one real Gonka request using
the Earth demo case, when a valid local `GONKA_API_KEY` is available.

## Deployment

The demo Vercel project needs only `GONKA_API_KEY` for live verification. It
does not require OpenCLI, mcporter, browser cookies, platform credentials, or
`DATA_API_URL` for its static demo path. Existing full/local pipelines remain
unchanged and may continue to use their existing configuration.
