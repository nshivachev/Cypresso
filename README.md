# Cypresso

Cypresso is a Cypress test generation workspace that turns user stories into TypeScript-based Cypress E2E tests. It includes a Next.js web dashboard, API routes that orchestrate generation/validation/export steps, and an agent/skill system for modular prompts and rules.

## What This Project Includes

- Web dashboard (Next.js App Router + React + TailwindCSS + TypeScript)
- API routes for generate, validate, export, and feedback steps
- Agent prompts in `agents/` (TestGenerator, Export, QAValidation, UIFeedback)
- Skill rules in `skills/` (validate-test, export-test, ui-feedback)
- Global instructions in `instructions/`
- Workflow plan in `plans/`
- Cypress test template in `templates/`

## Quick Start

```bash
cd Cypresso
npm install
npm run dev
```

Open `http://localhost:3000` to use the dashboard.

## How Cypresso Works

The default workflow (dry-run) is:

1. **Generate**: Convert a user story into Cypress test code.
2. **Validate**: Check syntax, structure, and idempotence.
3. **Export**: Compute the export path (dry-run by default).
4. **Feedback**: Summarize the run and provide next steps.

The workflow and rules are defined in:

- `plans/cypresso-full-workflow.md`
- `instructions/instructions.md`
- `agents/*.md`
- `skills/*.md`

## Using the Web UI

1. Enter a user story in the textarea.
2. Click **Generate Test**.
3. Optional: click **Validate** to check the generated test.
4. Optional: click **Export (Dry-Run)** to preview where the test would be written.
5. Optional: click **Run Full Workflow** to run all steps in sequence.

The logs panel shows step-by-step status in real time.

## API Endpoints

All endpoints are POST requests and return JSON.

- `/api/generate`
  - Input: `{ "userStory": "..." }`
  - Output: `{ testCode, status, logs }`

- `/api/validate`
  - Input: `{ "testCode": "..." }`
  - Output: `{ valid, issues, logs }`

- `/api/export`
  - Input: `{ "testCode": "...", "targetPath"?: "..." }`
  - Output: `{ exportedPath, status, logs }`

- `/api/feedback`
  - Input: `{ "logs": ["..."], "status": "success|error|unknown" }`
  - Output: `{ summary, recommendations }`

## Dry-Run Mode (Generate Only)

Dry-run mode is the default for this bootstrap project.

- No files are written to external target projects.
- Export returns the intended path only.
- Validation uses static checks (no Cypress run).

To switch to live behavior later, update the API routes to perform actual writes and execution.

## File Layout

```
Cypresso/
  agents/
  instructions/
  plans/
  skills/
  templates/
  src/
    app/
      api/
```

## Customization Tips

- Update agent prompts in `agents/` to control test generation style.
- Extend validation rules in `skills/validate-test.md`.
- Adjust export behavior in `src/app/api/export/route.ts`.
- Update UI copy and layout in `src/app/page.tsx`.

## Troubleshooting

- If the UI does not load, verify `npm install` completed and run `npm run dev`.
- If logs show validation warnings, review the generated test and refine the user story or validation rules.
- If export paths look wrong, update the `targetPath` in the export request or adjust the export agent rules.
