# Cypresso — Global Instructions

These rules apply to **all** agents, skills, templates, and application code within the Cypresso project.

---

## 1. TypeScript Standards

- All source code must be written in **TypeScript** with `strict: true` enabled.
- Use explicit types for function parameters and return values. Avoid `any`.
- Prefer `interface` for object shapes and `type` for unions/intersections.
- Use `const` by default; use `let` only when reassignment is required. Never use `var`.

## 2. Modularity

- **One responsibility per file.** Each agent handles a single workflow step. Each skill defines a single set of rules.
- Agents must not call other agents directly. Orchestration is handled by the plan/workflow layer.
- Skills are reference documents — they define rules that agents follow but do not contain executable code.

## 3. Idempotence

- All generated Cypress tests must be **safely re-runnable** without side effects.
- Tests must not depend on execution order.
- State setup belongs in `beforeEach()` or `before()` hooks.
- Teardown belongs in `afterEach()` or `after()` hooks.

## 4. Self-Validation

Every generation step must verify its own output before returning:

1. **Existence check**: The output (file, string, response) was actually produced.
2. **Content check**: The output contains expected structural markers (e.g., `describe`, `it`, assertion).
3. **Format check**: The output matches the expected schema (JSON shape, required fields).

If self-validation fails, the step must retry before reporting failure.

## 5. Retry Logic

| Scope                     | Max Retries | Backoff                         |
| ------------------------- | ----------- | ------------------------------- |
| Test generation           | 3           | Exponential (500ms, 1s, 2s)     |
| Test validation           | 0           | Deterministic — no retry needed |
| Test export               | 2           | Fixed 500ms                     |
| Folder creation           | 2           | Fixed 200ms                     |
| API route calls (from UI) | 3           | Exponential (500ms, 1s, 2s)     |

On final failure, log the error with full context and return a structured error response.

## 6. Logging

- Every action must emit a structured log entry: `[TIMESTAMP] [LEVEL] message`.
- Levels: `INFO`, `SUCCESS`, `WARN`, `ERROR`.
- Logs are collected per-workflow-run and passed to the **UIFeedbackAgent** for summarization.
- Sensitive data (credentials, tokens) must **never** appear in logs.

## 7. Web UI

- The dashboard must display **real-time** workflow status as each step completes.
- Buttons must be disabled during active operations to prevent duplicate submissions.
- The log panel must auto-scroll to the latest entry.
- All interactive elements must be keyboard-accessible.

### Saved Tests Panel

- Display all persisted tests from the database, ordered by creation date (newest first).
- Each test card shows: truncated user story, status badge, validation issue count, export count, and creation timestamp.
- Actions per test: **Load** (populate editor), **Edit** (open modal), **Delete** (remove from database).

### Filter Controls

- **Search**: Case-insensitive text search across `userStory` and `testCode` fields. Applied in JavaScript after database fetch (SQLite limitation).
- **Status**: Dropdown filter — All / Draft / Exported. Applied at database query level.
- **Date Range**: From/To date pickers. Dates are in `YYYY-MM-DD` format; the API converts them to UTC start-of-day and end-of-day boundaries.
- **Clear Filters**: Resets all filter inputs to defaults.
- Filters trigger automatic reload of the test list via `useEffect` dependency on filter state.

### Edit Modal

- Full-screen overlay with User Story textarea and Test Code textarea (monospace).
- Save calls `PUT /api/tests/{testId}` with updated fields.
- Cancel or close button dismisses the modal without saving.
- Successful save refreshes the test list and logs a success message.

## 8. Dry-Run / Generate Only Mode

When the system operates in **Generate Only** (dry-run) mode:

- Agents produce output but do **not** execute external commands or write files.
- The Export Agent returns intended paths without writing to disk.
- The QA Validation Agent performs static checks only (no `npx cypress run`).
- All responses include `"dryRun": true` to indicate no side effects occurred.

## 9. Database Operations

- All database access goes through Prisma ORM (`@prisma/client`) with a singleton client (`src/lib/db.ts`).
- Database provider: **SQLite** (`prisma/dev.db`), configured via `DATABASE_URL` in `.env` and `.env.local`.
- Error handling: Every database call must be wrapped in try/catch. On failure, return a structured error response with the error message.
- Retry logic for writes: Maximum **2** retries for insert/update operations (e.g., saving generated tests).
- Cascade deletes: Deleting a `GeneratedTest` automatically removes related `ValidationIssue` and `ExportLog` records.

### Models

| Model             | Purpose                                | Key Fields                                                   |
| ----------------- | -------------------------------------- | ------------------------------------------------------------ |
| `GeneratedTest`   | Stores generated Cypress test code     | id, userStory, testCode, status (draft/exported), timestamps |
| `ValidationIssue` | Stores QA validation findings per test | id, testId (FK), issue, severity                             |
| `ExportLog`       | Records export operations per test     | id, testId (FK), path, timestamps                            |

### API Endpoints

| Method   | Route                 | Purpose                                 |
| -------- | --------------------- | --------------------------------------- |
| `POST`   | `/api/generate`       | Generate test, save to DB               |
| `POST`   | `/api/validate`       | Validate test, persist issues           |
| `POST`   | `/api/export`         | Export test (dry-run), log to DB        |
| `POST`   | `/api/feedback`       | Compile workflow feedback               |
| `GET`    | `/api/tests`          | List tests with filter/search support   |
| `GET`    | `/api/tests/{testId}` | Get single test with full history       |
| `PUT`    | `/api/tests/{testId}` | Update test userStory and/or testCode   |
| `DELETE` | `/api/tests/{testId}` | Delete test and cascade related records |

### Filter Query Parameters (GET /api/tests)

| Parameter  | Type   | Description                                        |
| ---------- | ------ | -------------------------------------------------- |
| `search`   | string | Case-insensitive text search in userStory/testCode |
| `status`   | string | Filter by status: `draft` or `exported`            |
| `dateFrom` | string | Start date (YYYY-MM-DD), converted to UTC 00:00:00 |
| `dateTo`   | string | End date (YYYY-MM-DD), converted to UTC 23:59:59   |

## 10. QA Validation of Filter & Update Features

All filter and update functionality must be validated for correctness:

- **Search filter**: Verify case-insensitive matching works for both `userStory` and `testCode` fields.
- **Status filter**: Confirm only `draft` and `exported` values are accepted; `all` resets to no filter.
- **Date range filter**: Ensure `dateFrom` includes the full start day and `dateTo` includes the full end day (23:59:59).
- **Combined filters**: Test that multiple filters compose correctly (search + status + date).
- **Update operation**: Confirm that `PUT` endpoint updates `updatedAt` timestamp and only modifies provided fields.
- **Empty results**: UI must display a contextual empty message ("No tests match filters" vs "No saved tests yet").
- **Edge cases**: Empty search string is ignored, invalid dates are handled gracefully, missing testId returns 404.
