Mode: Generate Only (Dry-Run)

# Plan: Bootstrap Cypresso — Cypress Test Generation Platform

**TL;DR** — Generate 20+ files across 12 directories to create a dry-run-ready Cypresso project: a Next.js 14 App Router app (React + TailwindCSS + TypeScript) with a dashboard for submitting user stories, four agent prompt files, three skill definitions, global instructions, a workflow plan, and a base Cypress test template. Every step includes self-validation (file existence + content check) and retry loops. No workflow execution occurs — files are generated with functional stub content so the project is immediately usable after `npm install && npm run dev`.

**Steps**

## Phase 1 — Project Config (5 files)

1. Create `Cypresso/package.json` with dependencies: `next@^14.2`, `react@^18.3`, `react-dom@^18.3`, and devDependencies: `typescript@^5.4`, `tailwindcss@^3.4`, `postcss@^8.4`, `autoprefixer@^10.4`, `@types/node@^20`, `@types/react@^18.3`, `@types/react-dom@^18.3`, `eslint@^8`, `eslint-config-next@^14.2`. Scripts: `dev`, `build`, `start`, `lint`.
2. Create `Cypresso/tsconfig.json` — standard Next.js 14 config with `moduleResolution: "bundler"`, `@/*` path alias to `./src/*`, and `"exclude": ["node_modules", "templates"]` (so `templates/` isn't compiled by TS).
3. Create `Cypresso/next.config.mjs` — minimal ESM config (`const nextConfig = {}; export default nextConfig;`).
4. Create `Cypresso/tailwind.config.ts` — content paths covering `src/app/**` and `src/components/**`.
5. Create `Cypresso/postcss.config.mjs` — plugins: `tailwindcss` + `autoprefixer`.
6. **Self-validate**: Confirm all 5 config files exist and are non-empty. Retry up to 2× on failure.

## Phase 2 — App Shell (3 files)

7. Create `Cypresso/src/app/globals.css` — Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) plus minimal custom styles for the dashboard (dark theme base, scrollbar styling).
8. Create `Cypresso/src/app/layout.tsx` — Root layout exporting `<html lang="en"><body>` with `globals.css` import, metadata title "Cypresso — Cypress Test Generator".
9. Create `Cypresso/src/app/page.tsx` — **Client component** (`"use client"`) implementing the dashboard:
   - **User story textarea** — input field for the user story
   - **Buttons** — "Generate Test", "Export", "Retry" (calls respective API routes via `fetch`)
   - **Logs/status panel** — scrollable `<pre>` area displaying real-time workflow status, step-by-step results, and error messages
   - **State management** — `useState` for story text, loading state, logs array, generated test code preview
   - **Saved Tests panel** — displays database-persisted tests with Load, Edit, and Delete actions
   - **Filter controls** — search input, status dropdown (All/Draft/Exported), date range pickers, clear filters button
   - **Edit modal** — full-screen overlay with editable userStory and testCode textareas, save/cancel buttons
   - All API calls wrapped with retry logic (up to 3 attempts with exponential backoff)
   - Filter state triggers automatic test list reload via `useEffect` dependency
10. **Self-validate**: Confirm all 3 app shell files exist and contain expected markers (`@tailwind`, `<html`, `"use client"`). Retry up to 2×.

## Phase 3 — API Routes (4 files)

11. Create `Cypresso/src/app/api/generate/route.ts` — `POST` handler that:
    - Accepts `{ userStory: string }` in request body
    - Reads `agents/TestGeneratorAgent.md` prompt (stub: returns a hardcoded Cypress test from the base template populated with the user story)
    - Saves generated test to database with status='draft', returns testId
    - Returns `{ testCode: string, testId: string, status: "success" | "partial-success" | "error", logs: string[] }`
    - Includes try/catch with validation and retry metadata in response
    - Retry up to 2 times for database save failures

12. Create `Cypresso/src/app/api/export/route.ts` — `POST` handler that:
    - Accepts `{ testCode: string, testId?: string, targetPath?: string }`
    - Reads `agents/ExportAgent.md` prompt (stub: returns the target file path and confirmation)
    - Creates ExportLog record and updates test status to 'exported' in database
    - Returns `{ exportedPath: string, status: "success" | "error", logs: string[] }`
    - In dry-run mode, returns the _intended_ path without writing to disk

13. Create `Cypresso/src/app/api/validate/route.ts` — `POST` handler that:
    - Accepts `{ testCode: string, testId?: string }`
    - Reads `agents/QAValidationAgent.md` prompt (stub: performs basic syntax checks — looks for `describe`, `it`, `expect`/`should`/`cy.`)
    - Persists validation issues to database linked to testId
    - Returns `{ valid: boolean, issues: string[], logs: string[] }`

14. Create `Cypresso/src/app/api/feedback/route.ts` — `POST` handler that:
    - Accepts `{ logs: string[], status: string }`
    - Reads `agents/UIFeedbackAgent.md` prompt (stub: formats logs into user-friendly summary)
    - Returns `{ summary: string, recommendations: string[] }`

14a. Create `Cypresso/src/app/api/tests/route.ts` — `GET` handler that: - Accepts query parameters: `search`, `status`, `dateFrom`, `dateTo` - Applies status and date filters at database level (Prisma `where` clause) - Applies case-insensitive text search in JavaScript (SQLite compatibility) - Date handling: `dateFrom` → `T00:00:00Z`, `dateTo` → `T23:59:59Z` - Returns `{ tests: GeneratedTest[], status: "success" | "error", count: number }`

14b. Create `Cypresso/src/app/api/tests/[testId]/route.ts` — handlers: - `GET` — Returns single test with validation issues and export logs - `PUT` — Updates test `userStory` and/or `testCode`, refreshes `updatedAt` - `DELETE` — Removes test with cascade delete of related records

15. **Self-validate**: Confirm all 4 route files exist and each exports a `POST` function. Confirm test management routes export `GET`, `PUT`, `DELETE`. Retry up to 2×.

## Phase 4 — Agent Prompts (5 files)

16. Create `Cypresso/agents/TestGeneratorAgent.md` — functional prompt:
    - Role: Generate a Cypress E2E test from a user story
    - Rules: TypeScript, `describe`/`it` blocks, at least one assertion, use `cy.visit`, `cy.get`, `.should()`, idempotent (no side effects that can't be repeated)
    - Input: user story text
    - Output: complete `.cy.ts` file content

17. Create `Cypresso/agents/ExportAgent.md` — functional prompt:
    - Role: Export generated test code to the target project
    - Rules: target path defaults to `{targetProject}/cypress/e2e/`, create directories if missing, never overwrite without confirmation, use `.cy.ts` extension
    - Input: test code + target project path
    - Output: file path written + confirmation

18. Create `Cypresso/agents/QAValidationAgent.md` — functional prompt:
    - Role: Validate a generated Cypress test
    - Rules: check syntax (valid TS), check structure (`describe`/`it`/assertion present), check idempotence (no destructive ops like `cy.exec` with side effects), optionally run `npx cypress run --spec`
    - Input: test code string
    - Output: pass/fail + list of issues

19. Create `Cypresso/agents/UIFeedbackAgent.md` — functional prompt:
    - Role: Summarize workflow results for the user
    - Rules: format logs into human-readable steps, highlight errors in red/warnings in yellow, provide actionable next steps
    - Includes feedback rules for filter, update, delete, and load operations
    - Input: logs array + final status
    - Output: formatted summary + recommendations

19a. Create `Cypresso/agents/TestManagerAgent.md` — functional prompt: - Role: Manage saved tests (filter, search, update, delete, load) - Rules: validate filter parameters, enforce update constraints, handle cascade deletes - Includes QA validation checklist for filter and update operations - Input: filter parameters or update payload - Output: filtered test list or updated test record

20. **Self-validate**: Confirm all 5 agent files exist and each contains at least a `# Role` and `# Rules` section. Retry up to 2×.

## Phase 5 — Skill Definitions (4 files)

21. Create `Cypresso/skills/validate-test.md` — rules for test validation:
    - Must contain `describe()` and at least one `it()` block
    - Must contain at least one assertion (`should`, `expect`, `assert`)
    - Must be valid TypeScript (no syntax errors)
    - Must not contain hardcoded waits (`cy.wait(number)`)
    - Must be idempotent

22. Create `Cypresso/skills/export-test.md` — rules for export:
    - Target directory: `{project}/cypress/e2e/`
    - File naming: `{feature-slug}.cy.ts`
    - Create parent directories if absent
    - Validate target path is within project boundaries (no path traversal)
    - Return absolute path of exported file

23. Create `Cypresso/skills/ui-feedback.md` — rules for feedback display:
    - Log format: `[TIMESTAMP] [LEVEL] message`
    - Levels: INFO, WARN, ERROR, SUCCESS
    - Aggregate per-step status into a summary bar
    - On error, include the failing step name and a retry suggestion
    - Filter/update/delete operation feedback rules

23a. Create `Cypresso/skills/filter-tests.md` — rules for test filtering and search: - Search: case-insensitive matching in userStory and testCode (JavaScript-level for SQLite) - Status filter: database-level, accepts 'draft' or 'exported' - Date range: YYYY-MM-DD format with UTC day boundary conversion - Combined filters: compose correctly with AND logic - QA validation checklist for each filter type

24. **Self-validate**: Confirm all 4 skill files exist and are non-empty. Retry up to 2×.

## Phase 6 — Instructions & Plans (2 files)

25. Create `Cypresso/instructions/instructions.md` — global coding rules:
    - All code in TypeScript (strict mode)
    - Agents and skills are modular — one responsibility per file
    - Generated tests must be idempotent
    - Self-validation: every generation step must verify its own output
    - Retry logic: failed steps retry up to 3× with backoff
    - Logs: every action emits a structured log entry
    - Web UI must reflect real-time status

26. Create `Cypresso/plans/cypresso-full-workflow.md` — full workflow plan:
    - **Step 1**: Receive user story from Web UI input
    - **Step 2**: Invoke `TestGeneratorAgent` → produce test code
    - **Step 3**: Invoke `QAValidationAgent` → validate test
    - **Step 4**: If validation fails, retry Step 2 (up to 3×)
    - **Step 5**: Invoke `ExportAgent` → export to target path
    - **Step 6**: Invoke `UIFeedbackAgent` → compile summary
    - **Step 7**: Return results + logs to Web UI
    - Each step includes self-validation and retry loop definitions

27. **Self-validate**: Confirm both files exist and contain expected section headers. Retry up to 2×.

## Phase 7 — Templates (1 file)

28. Create `Cypresso/templates/base-test-template.ts` — Cypress test skeleton:
    - `describe("{{Feature Name}}", () => { ... })` with a placeholder `it("should {{action}}", () => { cy.visit("{{url}}"); cy.get("{{selector}}").should("{{assertion}}"); })`
    - Mustache-style placeholders for the agent to fill in
    - Comment header explaining template usage

29. **Self-validate**: Confirm file exists and contains `describe` and `it`. Retry up to 2×.

## Phase 8 — Final Self-Validation Sweep

30. Run a full sweep confirming all **24 files** across **14 directories** exist and are non-empty:

    | Directory                              | Files                                                                                          | Count |
    | -------------------------------------- | ---------------------------------------------------------------------------------------------- | ----- |
    | `Cypresso/`                            | `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs` | 5     |
    | `Cypresso/src/app/`                    | `layout.tsx`, `page.tsx`, `globals.css`                                                        | 3     |
    | `Cypresso/src/app/api/generate/`       | `route.ts`                                                                                     | 1     |
    | `Cypresso/src/app/api/export/`         | `route.ts`                                                                                     | 1     |
    | `Cypresso/src/app/api/validate/`       | `route.ts`                                                                                     | 1     |
    | `Cypresso/src/app/api/feedback/`       | `route.ts`                                                                                     | 1     |
    | `Cypresso/src/app/api/tests/`          | `route.ts`                                                                                     | 1     |
    | `Cypresso/src/app/api/tests/[testId]/` | `route.ts`                                                                                     | 1     |
    | `Cypresso/src/lib/`                    | `db.ts`                                                                                        | 1     |
    | `Cypresso/prisma/`                     | `schema.prisma`                                                                                | 1     |
    | `Cypresso/agents/`                     | 5 `.md` files                                                                                  | 5     |
    | `Cypresso/skills/`                     | 4 `.md` files                                                                                  | 4     |
    | `Cypresso/instructions/`               | `instructions.md`                                                                              | 1     |
    | `Cypresso/plans/`                      | `cypresso-full-workflow.md`                                                                    | 1     |
    | `Cypresso/templates/`                  | `base-test-template.ts`                                                                        | 1     |

31. Log a summary table of pass/fail per file. Retry any failed files up to 3×. Output final status.

---

## Verification

- **Structure check**: `dir /s /b Cypresso\` confirms all 20 files and 12 directories.
- **Config validity**: `cd Cypresso && npx tsc --noEmit` — should pass with zero errors after `npm install`.
- **App boots**: `npm run dev` — Next.js starts on `localhost:3000` with no build errors.
- **Dashboard renders**: Navigate to `http://localhost:3000` — user story input, buttons, and log panel are visible.
- **API stubs respond**: `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d "{\"userStory\":\"test\"}"` returns a JSON response with `status: "success"`.
- **Agent/skill content**: Each `.md` file contains its expected `# Role` or `# Rules` header.

---

## Decisions

- **Next.js 14 over 15**: Chosen for React 18 compatibility and stable App Router; Next 15 requires React 19 which may introduce breaking changes.
- **`src/` directory**: Using the `src/app/` convention to keep agent/skill/template directories at the project root without mixing with app code.
- **`templates/` excluded from TS compilation**: Added to `tsconfig.json` `exclude` array since it's a data file with mustache placeholders, not compilable TS.
- **Client component for `page.tsx`**: The dashboard needs `useState`, `onClick`, and `fetch` — requires `"use client"` directive. Could be split into server + client components later but a single client page is simplest for the bootstrap.
- **Dry-run mode for export**: The export API route returns the _intended_ path without actually writing files, honoring the "Generate Only / Dry-Run" requirement.
- **Mustache-style placeholders in template**: Using `{{variable}}` syntax for easy find-replace by the `TestGeneratorAgent`, without pulling in a template engine dependency.
