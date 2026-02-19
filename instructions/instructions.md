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

## 8. Dry-Run / Generate Only Mode

When the system operates in **Generate Only** (dry-run) mode:

- Agents produce output but do **not** execute external commands or write files.
- The Export Agent returns intended paths without writing to disk.
- The QA Validation Agent performs static checks only (no `npx cypress run`).
- All responses include `"dryRun": true` to indicate no side effects occurred.
