# Skill: ui-feedback

Display rules applied by the **UIFeedbackAgent** when presenting workflow results in the Cypresso Web UI.

## Log Format

Every log entry displayed in the dashboard follows this format:

```
[YYYY-MM-DD HH:mm:ss] [LEVEL] message
```

### Log Levels

| Level     | Color                      | Usage                          |
| --------- | -------------------------- | ------------------------------ |
| `INFO`    | Blue (`text-blue-400`)     | Informational step progress    |
| `SUCCESS` | Green (`text-emerald-400`) | Step completed successfully    |
| `WARN`    | Yellow (`text-yellow-400`) | Non-blocking issue or advisory |
| `ERROR`   | Red (`text-red-400`)       | Step failed — action required  |

## Summary Bar

After workflow completion, display a summary bar at the top of the log panel:

- **Success**: Green background — "Workflow completed successfully."
- **Partial**: Yellow background — "Workflow completed with warnings."
- **Failure**: Red background — "Workflow failed — see errors below."

Include counts: `X steps completed, Y warnings, Z errors`.

## Error Display

When an error occurs:

1. Highlight the failing step name in **bold**.
2. Show the error message in `ERROR` level formatting.
3. Append a **retry suggestion**: "Click 'Retry' to re-run the failed step."

## Recommendations

After the summary, display 1–3 actionable recommendations:

- Use a bullet list with `→` prefix.
- Keep each recommendation to one sentence.
- Prioritize: errors first, then warnings, then next-action suggestions.

## Real-Time Updates

- Logs must append in real time as each workflow step completes.
- The log panel auto-scrolls to the latest entry.
- A loading spinner or "Working…" indicator is shown while a step is in progress.
- Buttons are disabled during execution to prevent duplicate requests.

## Accessibility

- Use semantic HTML (`<pre>`, `<code>`, `<button>`).
- Ensure color is not the only indicator — prepend level labels (`[INFO]`, `[ERROR]`, etc.).
- Buttons have descriptive text (not just icons).

## Filter & Test Management Feedback

### Filter Operations

- When filters are applied, the test count badge updates to reflect the filtered result count.
- The empty state message changes based on filter context:
  - With active filters: "No tests match the selected filters."
  - Without filters: "No saved tests yet — generate one above."
- Clear Filters resets all inputs and reloads the full test list.

### Test Update Operations

- On successful update via Edit modal: `[SUCCESS] Updated test {testId}`
- On update failure: `[ERROR] Update failed: {error message}`
- The Edit modal remains open on failure so the user can retry.
- On successful save, the test list refreshes automatically.

### Test Delete Operations

- On successful delete: `[INFO] Deleted test {testId} from database.`
- The test list refreshes automatically after deletion.

### Test Load Operations

- On loading a test into the editor: `[INFO] Loaded test {testId} from database.`
- The user story textarea, test code preview, and active testId are all updated.

### Saved Tests Panel

- Each test card displays: truncated user story (80 chars), status badge (color-coded), validation issue count, export count, creation timestamp.
- Action buttons per card: **Load** (border-slate), **Edit** (border-blue), **Delete** (border-red).
- The panel header shows total count with a badge and a Refresh button.
