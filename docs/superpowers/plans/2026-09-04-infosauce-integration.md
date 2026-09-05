# InfoSauce Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the existing InfoSauce UI, data/research API, Trending pipeline, and Express + Gonka verifier together from the root repository.

**Architecture:** The root Next.js app on port 3000 serves the existing UI, data API, and two thin same-origin proxy routes. The root Express app on port 3001 retains the existing Gonka pipeline and calls the Next data API through `DATA_API_URL`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Express 5, Node fetch, Vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-09-04-infosauce-integration-design.md`

## Global Constraints

- Preserve the existing InfoSauce UI appearance and `InfoSauce-dev-*` source directories.
- Reuse the existing research and Express domain implementations; no OCR, scraping, or new AI logic.
- Next.js runs on port 3000; Express runs on port 3001.
- Browser requests use same-origin `/api/integration/*` routes only.
- Do not hardcode secrets; use `AI_SERVICE_URL`, `DATA_API_URL`, and `GONKA_API_KEY` environment variables.

---

### Task 1: Establish root runtime dependencies and preserve existing source modules

**Files:**

- Modify: `package.json`, `backend/package.json`, `backend/.env.example`, `backend/src/server.js`, `backend/src/routes/verify.js`
- Create: root copies of existing `InfoSauce-dev-frontend/src/**`, `InfoSauce-dev-data/src/data/**`, `src/app/api/news/route.ts`, and missing complete Express services.

**Interfaces:**

- Consumes: the existing source implementations under the `InfoSauce-dev-*` directories.
- Produces: root Next UI/data modules and root Express category pipeline.

- [ ] Copy the existing frontend source tree, data source tree, data API route, and complete Express service files into equivalent root paths. Do not delete or rename originals.
- [ ] Replace the partial root Express route and server wiring with the complete existing implementations. The result mounts both `POST /api/verify` and `POST /api/category`, enables CORS, and uses `process.env.PORT || 3001`.
- [ ] Merge only source-required dependencies already present in the nested packages: `ogl`, `tsx`, `vitest`, and `cors`. Add a root Vitest test script and document `PORT=3001`, `DATA_API_URL=http://localhost:3000`, and empty `GONKA_API_KEY`.
- [ ] Run `npm run lint` after adoption to establish the initial static state.

### Task 2: Add same-origin proxy route contract tests and routes

**Files:**

- Create: `src/app/api/integration/[operation]/route.ts`
- Create: `src/app/api/integration/[operation]/route.test.ts`

**Interfaces:**

- Consumes: `AI_SERVICE_URL`, a JSON POST request, and either `category` or `verify` as the operation.
- Produces: the pass-through JSON response from `POST ${AI_SERVICE_URL}/api/{operation}`; an unavailable service returns HTTP 503 with `{ error: "AI service is unavailable" }`.

- [ ] Write a local HTTP-fixture contract test: `/category` forwards the exact JSON request body to `/api/category` and preserves a 200 JSON response; an unreachable `AI_SERVICE_URL` returns 503 with the documented error. The production break each test catches is missing forwarding or missing unavailable-service handling.
- [ ] Run `npm test -- src/app/api/integration/[operation]/route.test.ts` and confirm it fails because the proxy route is missing.
- [ ] Add the thin route: accept only `category` and `verify`; forward `request.json()` as JSON to the configured AI service; preserve upstream status/body; return 404 for other operations and 503 for network errors. Do not add data or Gonka logic.
- [ ] Re-run the focused proxy tests and confirm they pass.

### Task 3: Connect the existing frontend without redesigning it

**Files:**

- Modify: `src/app/page.tsx`, `src/app/daily/page.tsx`, `src/app/verify/page.tsx`

**Interfaces:**

- Consumes: `POST /api/integration/category`, `GET /api/news?query=`, and `POST /api/integration/verify`.
- Produces: real Trending and DailySauce data states; no fabricated Sauce Verify result.

- [ ] Change only the homepage Trending request target from `http://localhost:3000/api/category` to `/api/integration/category`; preserve its body, response mapping, carousel, and modal.
- [ ] On DailySauce Generate, query `/api/news?query=` using the selected category or search value; map returned `NewsItem` values into existing `NewsCard` props and show a visible request-error state. Preserve the existing layout and controls.
- [ ] Remove Sauce Verify’s fabricated timeout result. Keep its existing controls and show a validation message when no genuine `claim + sources + evidence` payload exists. Do not send fake data to the verifier.

### Task 4: Verify integrated boundaries and error paths

**Files:**

- Modify: `docs/superpowers/specs/2026-09-04-infosauce-integration-design.md` only if verification uncovers a material divergence.

**Interfaces:**

- Consumes: root Next server on port 3000 and root Express server on port 3001.
- Produces: evidence for API contracts, tests, lint/build, startup readiness, and external blockers.

- [ ] Run `npm test` for the adopted data tests and proxy route tests.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Start Next on port 3000 and Express with `PORT=3001 DATA_API_URL=http://localhost:3000`; confirm both root responses and proxy 503 behavior without a Gonka key.
- [ ] Request `/api/news?area=AI%20%26%20Technology`; request `/api/integration/category` with Express unavailable; then call direct `POST /api/verify` with invalid input and confirm the existing 400 contract.
- [ ] If Gonka credentials or research login are absent, record the exact blocked external dependency; do not substitute mock success.
