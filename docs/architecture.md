# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision:
  - Keep the UI as a thin presentation layer that fetches from the API and renders the results with explicit loading, empty, and error states. The browser-facing routes should stay focused on user experience and accessibility, with Bootstrap styling and route-based sections for activities, teams, leaderboard, and workouts.
- Logic tier decision:
  - Drive all capability behavior through Express routes and supporting services so validation, business rules, and response shaping live in the backend instead of the UI. Validation should fail fast with deliberate 4xx responses, and bad ObjectId casts should be corrected before they turn into 500 errors.
- Data tier decision:
  - Use Mongoose schemas as the source of truth for required fields, defaults, and references. Seed data should be idempotent and preserve unrelated records while ensuring the OctoFit fixtures remain consistent across repeated runs.
- Activity tracking approach:
  - POST `/api/activities` should resolve `userId` and `teamId`, require valid `type` and positive `minutes`, then persist the documents with `user`, `team`, `type`, `minutes`, and computed `points` and `occurredAt` values. This keeps the activity model strong enough for leaderboard aggregation.
- Team management approach:
  - Team creation should require a non-empty `name` and store `members` as ObjectId references, while the API exposes them as strings for the frontend. The data model should allow empty member arrays by default and reject invalid team payloads with `400`.
- Leaderboard approach:
  - Aggregate activity points by team, sort descending by total points, and assign 1-based `rank` values. The leaderboard endpoint should return team names and totals in a stable order that the UI can render directly.
- Workout suggestions approach:
  - Match a seeded user by email, inspect their recent activity focus, and recommend a workout whose `focus` aligns with that pattern. The first suggestion should include a `reason` that explains the match, while unknown users return a deliberate 4xx response instead of falling through to a generic server error.
- Smallest safe order:
  - Data validation and model shape first, then API contracts, then presentation rendering. This order matches the current failure chain: schema-validation failures prevent correct API requests, and API issues prevent the frontend from showing real behavior.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Observed failure: 4 schema validation tests fail because `User`, `Team`, `Activity`, and `Workout` schemas are not enforcing the required fields expected by the data contract. The one seed test passes, which means the seed script is broadly idempotent but the base models still need required validation.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Observed failure: 4 API contract tests fail because invalid `POST` requests return `501` instead of `400`, the leaderboard is empty, and workout suggestions do not match the user’s activity pattern. This confirms the logic tier still needs the main route implementations and business logic.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Observed failure: the UI still renders “Implementation pending” and never provides the loading, empty, and alert behaviors required by the contract. This confirms the presentation tier is still a placeholder and should be completed only after the API behavior is corrected.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Status: pending until the schema and API contract tests pass; this should be used as a compile-vs-contract follow-up after the logic tier is fixed.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Status: pending until the presentation contract succeeds and the app renders real data, empty states, and accessible alerts without placeholders.
