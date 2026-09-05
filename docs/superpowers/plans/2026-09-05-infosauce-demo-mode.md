# InfoSauce Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build a stable InfoSauce public demo from prepared server-owned research/evidence while keeping Gonka verification live and server-side.

**Architecture:** Express owns a fixed catalog and exposes same-origin /api/demo endpoints. The Next pages fetch only these endpoints; Verify sends caseId, then the backend resolves prepared claim/evidence and calls the existing prepareAiInput then verifyClaim flow. Vercel routes /api to Express and all frontend calls are relative.

**Tech Stack:** Next.js 16/React 19/TypeScript, Express CommonJS, Node built-in tests, existing Gonka verifier/consensus/Truth Score/FactCheckResult, Vercel services.

**Spec:** docs/superpowers/specs/2026-09-05-infosauce-demo-mode-design.md

## Global Constraints

- Work only on demo-web. Do not switch, merge, or modify integration2.
- Preserve unrelated backend/src/server.js and backend/eng.traineddata changes.
- Demo API calls use only same-origin /api/demo paths; never localhost.
- Browser sends only caseId. Server-owned prepared evidence is the only input.
- Do not call researchAll, retrieveEvidence, OpenCLI, mcporter, social adapters, DATA_API_URL, or live search from demo code.
- Keep Gonka server-side. Never expose or commit GONKA_API_KEY, and never fabricate a model result or request ID.
- Keep existing parser, consensus, Truth Score, model settings, and degraded behavior unchanged.
- Every primary page displays: Demo Mode — Research and evidence are pre-collected for stability. Verification is performed live through Gonka.
- VERIFIED means live fact-check completion, not TRUE.

---

### Task 1: Server-owned demo catalog

**Files:**
- Create: InfoSauce-dev-backend/backend/src/data/demo/catalog.js
- Create: InfoSauce-dev-backend/backend/src/data/demo/catalog.test.js
- Modify: InfoSauce-dev-backend/backend/package.json

**Interfaces:**
- listTrending(), listDailyArticles(), getDailyArticle(id), getVerifiableCase(caseId)
- getVerifiableCase returns { id, claim, article, evidence }, with evidence title/source/url/content.
- Unknown and non-verifiable IDs return null.

- [ ] **Step 1: Write failing test**

~~~js
const test = require("node:test");
const assert = require("node:assert/strict");
const { getVerifiableCase, listDailyArticles } = require("./catalog");

test("Earth case resolves stable server-owned evidence", () => {
  const item = getVerifiableCase("earth-orbits-sun");
  assert.equal(item.claim, "The Earth orbits the Sun.");
  assert.ok(item.evidence.length >= 2);
  assert.ok(item.evidence.every(({ title, source, url, content }) =>
    Boolean(title && source && url && content)
  ));
});

test("NOT VERIFIABLE item cannot become a Gonka case", () => {
  const item = listDailyArticles().find((entry) =>
    entry.verificationStatus === "NOT VERIFIABLE"
  );
  assert.equal(getVerifiableCase(item.id), null);
});
~~~

- [ ] **Step 2: Run RED**

Run from InfoSauce-dev-backend/backend:

~~~bash
node --test src/data/demo/catalog.test.js
~~~

Expected: fail because catalog does not exist.

- [ ] **Step 3: Implement catalog**

Create prepared, visibly demo-labelled Trending/Daily records. Earth uses independent stable science sources and fixed evidence snippets. Include initial UNVERIFIED and NOT VERIFIABLE records; include no static Gonka output/request IDs.

- [ ] **Step 4: Run GREEN**

Run: node --test src/data/demo/catalog.test.js. Expected: pass.

- [ ] **Step 5: Commit**

~~~bash
git add InfoSauce-dev-backend/backend/src/data/demo/catalog.js InfoSauce-dev-backend/backend/src/data/demo/catalog.test.js InfoSauce-dev-backend/backend/package.json
git commit -m "feat: add server-owned demo catalog"
~~~

### Task 2: Demo API and live verifier reuse

**Files:**
- Create: InfoSauce-dev-backend/backend/src/routes/demo.js
- Create: InfoSauce-dev-backend/backend/src/routes/demo.test.js
- Modify: InfoSauce-dev-backend/backend/src/app.js

**Interfaces:**
- GET /api/demo/trending, GET /api/demo/daily, GET /api/demo/daily/:id, POST /api/demo/verify/:caseId.
- Verify resolves a catalog case server-side, calls existing prepareAiInput and verifyClaim.
- Client body claim/evidence/verdict/score values are ignored.

- [ ] **Step 1: Write failing API tests**

~~~js
test("unknown case returns a safe 404", async () => {
  const response = await request(app).post("/api/demo/verify/not-a-case");
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "DEMO_CASE_NOT_FOUND");
});

test("Earth response uses server-owned evidence", async () => {
  const response = await request(app).post("/api/demo/verify/earth-orbits-sun");
  assert.equal(response.status, 200);
  assert.equal(response.body.claim, "The Earth orbits the Sun.");
  assert.ok(response.body.evidence.length >= 2);
});
~~~

Use a local HTTP server around real Express behavior. Only inject the slow network verifier through a router factory. The fake returns a complete production-shaped results/failures/consensus/truthScore/summary payload; assert API output, not mock calls.

- [ ] **Step 2: Run RED**

Run: node --test src/routes/demo.test.js. Expected: fail because route is absent.

- [ ] **Step 3: Implement minimal router**

Register demoRouter at /api/demo. Resolve case ID; pass catalog evidence to prepareAiInput; set catalog claim; call existing verifyClaim. Return request IDs only when Gonka returns them. Unknown/non-verifiable IDs get safe errors; full/degraded/failed semantics remain existing behavior.

- [ ] **Step 4: Run GREEN**

Run: node --test src/routes/demo.test.js. Expected: pass without a real model.

- [ ] **Step 5: Commit**

~~~bash
git add InfoSauce-dev-backend/backend/src/routes/demo.js InfoSauce-dev-backend/backend/src/routes/demo.test.js InfoSauce-dev-backend/backend/src/app.js
git commit -m "feat: add live Gonka demo verification route"
~~~

### Task 3: Same-origin Vercel routing

**Files:**
- Create: vercel.json
- Modify: InfoSauce-dev-backend/backend/src/app.js only if Vercel tracing needs a path-safe router import
- Test: InfoSauce-dev-backend/backend/src/routes/demo.test.js

**Interfaces:**
- API rewrites to InfoSauce-dev-backend/backend Express src/app.js.
- Non-API rewrites to InfoSauce-dev-frontend.
- Demo has no data service and no DATA_API_URL binding.

- [ ] **Step 1: Add failing exported-app test**

~~~js
test("exported Vercel app exposes demo Daily", async () => {
  const response = await request(app).get("/api/demo/daily");
  assert.equal(response.status, 200);
  assert.equal(response.body.demoMode, true);
});
~~~

- [ ] **Step 2: Run RED**

Run: node --test src/routes/demo.test.js. Expected: fail before registration.

- [ ] **Step 3: Add Vercel services/rewrites**

Configure frontend root, Express backend root/entrypoint/file inclusion, and API-first ordered rewrites. Do not add OpenCLI/mcporter/data service/public key/backend URL.

- [ ] **Step 4: Run GREEN**

~~~bash
npm test
node --test src/routes/demo.test.js
~~~

Run from InfoSauce-dev-backend/backend. Expected: pass.

- [ ] **Step 5: Commit**

~~~bash
git add vercel.json InfoSauce-dev-backend/backend/src/app.js InfoSauce-dev-backend/backend/src/routes/demo.test.js
git commit -m "chore: route demo API through Vercel backend"
~~~

### Task 4: Demo client primitives

**Files:**
- Create: InfoSauce-dev-frontend/src/lib/demo-api.ts
- Create: InfoSauce-dev-frontend/src/components/DemoModeNotice.tsx
- Modify: InfoSauce-dev-frontend/src/components/FactCheckResult.tsx only for safe existing response presentation
- Test: frontend existing convention, or a narrow pure helper test if no runner exists

**Interfaces:**
- fetchDemoTrending(), fetchDemoDaily(), fetchDemoArticle(id), verifyDemoCase(caseId) call relative /api/demo endpoints.
- DemoModeNotice renders exact required notice.
- FactCheckResult accepts only a live verification response.

- [ ] **Step 1: Write failing test**

~~~ts
test("verification uses same-origin API", async () => {
  await verifyDemoCase("earth-orbits-sun");
  expect(fetch).toHaveBeenCalledWith(
    "/api/demo/verify/earth-orbits-sun",
    expect.objectContaining({ method: "POST" })
  );
});
~~~

- [ ] **Step 2: Run RED**

Run existing narrow frontend test command. Expected: helper absent.

- [ ] **Step 3: Implement helper/notice**

Align types with existing verifier response. Add no NEXT_PUBLIC secret, backend URL, live research fallback, or client-side evidence selection.

- [ ] **Step 4: Run GREEN**

Run same focused test command. Expected: pass.

- [ ] **Step 5: Commit**

~~~bash
git add InfoSauce-dev-frontend/src/lib/demo-api.ts InfoSauce-dev-frontend/src/components/DemoModeNotice.tsx InfoSauce-dev-frontend/src/components/FactCheckResult.tsx
git commit -m "feat: add demo mode client primitives"
~~~

### Task 5: Demo pages

**Files:**
- Modify: InfoSauce-dev-frontend/src/app/page.tsx
- Modify: InfoSauce-dev-frontend/src/app/daily/page.tsx
- Create: InfoSauce-dev-frontend/src/app/daily/[id]/page.tsx
- Modify: InfoSauce-dev-frontend/src/app/verify/page.tsx
- Modify: InfoSauce-dev-frontend/src/components/Navbar.tsx

**Interfaces:**
- Home fetches prepared Trending and links to the three product functions.
- Daily lists prepared articles and links to /daily/:id.
- Detail and Verify call verifyDemoCase(caseId), then map only real output into FactCheckResult.

- [ ] **Step 1: Write failing page behavior tests**

~~~tsx
test("non-verifiable Daily item offers no Gonka action", () => {
  render(<DailyDetail article={notVerifiableArticle} />);
  expect(screen.queryByRole("button", { name: "Verify with Gonka" })).toBeNull();
  expect(screen.getByText("NOT VERIFIABLE")).toBeInTheDocument();
});

test("live completion marks the current article VERIFIED", async () => {
  render(<DailyDetail article={earthArticle} />);
  await user.click(screen.getByRole("button", { name: "Verify with Gonka" }));
  expect(await screen.findByText("VERIFIED")).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run RED**

Run focused frontend test command. Expected: demo pages absent.

- [ ] **Step 3: Implement minimal demo UI**

Preserve existing visual components. Use demo helper instead of live research. Render notice, prepared claim/evidence, loading/error UI, and FactCheckResult only after a real result. Show VERIFIED only after live completion.

- [ ] **Step 4: Run GREEN**

Run focused tests, TypeScript, lint. Expected: pass.

- [ ] **Step 5: Commit**

~~~bash
git add InfoSauce-dev-frontend/src/app/page.tsx InfoSauce-dev-frontend/src/app/daily/page.tsx InfoSauce-dev-frontend/src/app/daily/[id]/page.tsx InfoSauce-dev-frontend/src/app/verify/page.tsx InfoSauce-dev-frontend/src/components/Navbar.tsx
git commit -m "feat: add stable InfoSauce demo pages"
~~~

### Task 6: Build and live verification

**Files:**
- Modify only files proven necessary by a demo-specific test/build failure.

- [ ] **Step 1: Backend checks**

From InfoSauce-dev-backend/backend:

~~~bash
npm test
node --test src/data/demo/catalog.test.js src/routes/demo.test.js
~~~

- [ ] **Step 2: Frontend checks**

From InfoSauce-dev-frontend:

~~~bash
npx tsc --noEmit --incremental false
npm run lint
npm run build
~~~

- [ ] **Step 3: Local manual flow**

With server-only GONKA_API_KEY, load Home, Trending, Daily, a Daily detail, and Verify. Verify Earth and report only real request IDs, mode, consensus, Truth Score, reasoning. Report an upstream failure honestly.

- [ ] **Step 4: Boundary check**

Confirm Vercel config has no DATA_API_URL/OpenCLI/mcporter/public secret. Confirm .env remains ignored and unstaged.

- [ ] **Step 5: Commit final integration**

~~~bash
git add vercel.json InfoSauce-dev-frontend InfoSauce-dev-backend/backend
git status --short
git commit -m "feat: add stable InfoSauce demo mode"
~~~

Never stage backend/src/server.js, backend/eng.traineddata, .env files, logs, build output, or node_modules.
