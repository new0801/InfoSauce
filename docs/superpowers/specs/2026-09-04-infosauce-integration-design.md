# InfoSauce Integration Design

## Goal

Make the existing InfoSauce frontend, data/research pipeline, Express + Gonka
verification service, and Trending flow run together from the repository root
without redesigning the UI or reimplementing existing domain logic.

## Scope and constraints

- Keep the existing InfoSauce pages and components unchanged in appearance.
- Reuse the existing data/research functions and the existing Express + Gonka
  pipeline.
- Keep Express as the AI verification service; do not move Gonka calls into
  Next.js.
- Do not embed credentials. Configuration is supplied through environment
  variables.
- Do not remove the original `InfoSauce-dev-*` directories. They remain the
  source copies used to integrate the root application.
- Change only root runtime files, configuration, integration tests, and the
  minimal source files required to resolve contract mismatches.

## Runtime topology

The root Next.js application is the browser-facing service on port 3000. The
root Express application is the AI service on port 3001. The existing data
API is moved into the root Next.js app and is therefore served at
`http://localhost:3000/api/news`.

```text
Browser
  -> Next.js root app :3000
     -> /api/news                         (data + research)
     -> /api/integration/category         (same-origin proxy)
     -> /api/integration/verify           (same-origin proxy)
          -> Express AI service :3001
             -> Gonka Router
             -> Next.js /api/news :3000   (research/evidence)
```

The browser only calls same-origin Next routes. This removes the hard-coded
browser dependency on the Express port and makes the UI deployable behind a
single public origin. Express uses `DATA_API_URL` to reach the Next data API,
so it continues to own claim extraction, evidence selection, model calls,
consensus, and Truth Score calculation.

## Source adoption

1. Copy the existing UI source from `InfoSauce-dev-frontend/src` into the root
   `src` tree, retaining its current pages and components.
2. Copy the existing data modules from `InfoSauce-dev-data/src/data` into root
   `src/data` and adopt the existing `GET /api/news` route as a root Next API
   route.
3. Promote the already-complete Express implementation in
   `InfoSauce-dev-backend/backend/src` to root `backend/src`, rather than
   extending the older partial root backend.
4. Add only thin root Next proxy routes. They validate no domain data and do
   not duplicate Express business logic:
   - `POST /api/integration/category` forwards the request to
     `POST ${AI_SERVICE_URL}/api/category`.
   - `POST /api/integration/verify` forwards the request to
     `POST ${AI_SERVICE_URL}/api/verify`.

## Contract alignment

### Trending

The existing homepage expects `POST /api/category` and consumes a response
with `results[]`, including `news`, `evidence`, `verification`, `consensus`,
and `truthScore`. Its request target changes only to the same-origin category
proxy; its mapping and UI remain unchanged.

### DailySauce

The current page is a mock-only catalogue. It will call the existing
`/api/news?query=` route when the user asks to generate results, then map the
returned existing `NewsItem` fields to the current `NewsCard` props. Category
selection is translated into the existing query parameter rather than adding a
new data endpoint. Existing local filtering remains available for returned
items.

### Sauce Verify

The existing UI accepts a link or screenshot but only displays a mock result.
The backend contract requires `claim`, `sources`, and `evidence`; neither
input currently yields a reliable claim without a separate extraction flow.
For this integration pass, link verification sends the entered URL as a source
and requires a user-provided textual claim only if the UI already provides one.
Because the existing screen has no claim field and screenshots have no OCR
implementation, submitting either input cannot truthfully invoke the current
verification contract. The UI must show a clear unavailable/validation state
until a pre-existing extraction capability is supplied; no OCR, scraping, or
new AI function will be added under this scope.

## Configuration

Root Next:

- `AI_SERVICE_URL=http://localhost:3001` for server-side proxy routes.

Root Express:

- `PORT=3001`
- `DATA_API_URL=http://localhost:3000`
- `GONKA_API_KEY` supplied locally, never committed.

`NEXT_PUBLIC_*` variables are unnecessary because browser calls are same-origin.

## Error handling

- Data routes preserve their current 404 and research-unavailable response
  shape.
- Proxy routes pass Express status codes and response JSON through unchanged.
- The homepage and DailySauce show a non-destructive empty/error state when an
  integration request fails.
- Sauce Verify does not show a fabricated verification result when no valid
  `claim + evidence` contract can be created.

## Validation plan

1. Add contract tests for the new same-origin proxy routes using a local HTTP
   fixture server; assert method, body forwarding, status forwarding, and a
   failure response.
2. Run the existing data unit tests after moving the modules.
3. Run Next lint/build and start Express + Next with non-secret test
   configuration.
4. Exercise the data API and proxy error path without a Gonka key. A complete
   live category or verification result requires a valid local `GONKA_API_KEY`
   and available research integrations; that external dependency is not
   simulated as success.

## Non-goals

- UI redesign, authentication, persistence, OCR, content scraping, new
  research platforms, new model behavior, deployment infrastructure, and
  replacing the existing fact-checking algorithms.
