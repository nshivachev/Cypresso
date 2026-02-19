# Cypresso Full Workflow Plan

This plan defines the end-to-end workflow for generating, validating, and exporting a Cypress E2E test from a user story submitted through the Web UI.

---

## Overview

```
User Story (Web UI)
       │
       ▼
┌──────────────────┐    ┌──────────────────┐
│ TestGeneratorAgent│───▶│ QAValidationAgent│
└──────────────────┘    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │ valid?            │
                    │  yes ──▶ continue │
                    │  no  ──▶ retry    │
                    └───────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ExportAgent    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ UIFeedbackAgent  │
                    └──────────────────┘
                              │
                              ▼
                     Web UI Dashboard
```

---

## Step 1 — Receive User Story

- **Source**: Web UI textarea input.
- **Validation**: User story must be non-empty (trimmed length > 0).
- **On failure**: Display a warning in the log panel. Do not proceed.

## Step 2 — Invoke TestGeneratorAgent

- **API**: `POST /api/generate` with `{ userStory }`.
- **Agent**: `agents/TestGeneratorAgent.md`
- **Expected output**: `{ testCode, status, logs }`.
- **Self-validation**: Response has `status === "success"` and `testCode` is non-empty.
- **On failure**: Proceed to retry (Step 2a).

### Step 2a — Retry Generation

- Retry up to **3 times** with exponential backoff (500ms → 1s → 2s).
- On each retry, log `[WARN] Retrying test generation (attempt N/3)…`.
- On final failure, log `[ERROR] Test generation failed after 3 attempts.` and skip to Step 6 (Feedback).

## Step 3 — Invoke QAValidationAgent

- **API**: `POST /api/validate` with `{ testCode }`.
- **Agent**: `agents/QAValidationAgent.md`
- **Skill**: `skills/validate-test.md` (rules reference).
- **Expected output**: `{ valid, issues, logs }`.
- **Self-validation**: Response has `valid` boolean and `issues` array.

### Step 3a — Handle Validation Result

- **If `valid === true`**: Log `[SUCCESS] Validation passed.` and proceed to Step 4.
- **If `valid === false`**:
  - Log each issue as `[WARN] Issue: <description>`.
  - **In dry-run mode**: Log warnings but continue to Step 4 (non-blocking).
  - **In live mode**: Return to Step 2 for regeneration (up to 3 total attempts across Steps 2–3).

## Step 4 — Invoke ExportAgent

- **API**: `POST /api/export` with `{ testCode, targetPath? }`.
- **Agent**: `agents/ExportAgent.md`
- **Skill**: `skills/export-test.md` (rules reference).
- **Expected output**: `{ exportedPath, status, logs }`.
- **Self-validation**: Response has `status === "success"` and `exportedPath` is non-empty.
- **Dry-run behavior**: Returns the intended path without writing to disk.

### Step 4a — Retry Export

- Retry up to **2 times** with 500ms delay.
- On final failure, log `[ERROR] Export failed after 2 attempts.` and proceed to Step 5.

## Step 5 — Invoke UIFeedbackAgent

- **API**: `POST /api/feedback` with `{ logs, status }`.
- **Agent**: `agents/UIFeedbackAgent.md`
- **Skill**: `skills/ui-feedback.md` (rules reference).
- **Expected output**: `{ summary, recommendations }`.
- **Self-validation**: Response contains `summary` (string) and `recommendations` (string array).

## Step 6 — Display Results in Web UI

- Show the `summary` in the log panel header.
- Append each `recommendation` as a bullet item.
- If test code was generated, display it in the code preview panel.
- Enable the "Export (Dry-Run)" button for manual re-export.
- Enable the "Retry" button to re-run the entire workflow.

---

## Dry-Run Mode Behavior

In **Generate Only / Dry-Run** mode (the default for Cypresso bootstrapping):

- All steps execute normally **except** file writes.
- `ExportAgent` returns the intended path without creating files.
- `QAValidationAgent` performs static checks only (no `npx cypress run`).
- All API responses include metadata indicating dry-run mode.
- The plan does **not** invoke agents as live processes — stubs simulate their behavior.

---

## Error Recovery Matrix

| Step         | Failure Type               | Action                                             | Max Retries            |
| ------------ | -------------------------- | -------------------------------------------------- | ---------------------- |
| 2 — Generate | API error / empty response | Retry with backoff                                 | 3                      |
| 3 — Validate | Validation issues          | Warn + continue (dry-run) or retry generate (live) | 3 (shared with Step 2) |
| 4 — Export   | Path error / write failure | Retry with delay                                   | 2                      |
| 5 — Feedback | Compilation failure        | Skip — non-critical                                | 0                      |
| Any          | Network timeout            | Retry with backoff                                 | 3                      |
