# Skill: export-test

Export rules applied by the **ExportAgent** when writing a generated Cypress test to the target project.

## Target Directory

- Default: `{targetProject}/cypress/e2e/`
- Override: User may specify a custom `targetPath` in the request body.
- The directory must be created recursively if it does not exist.

## File Naming

1. Extract the label from the first `describe("...", ...)` block in the test code.
2. Convert to **kebab-case**: lowercase, replace spaces and special characters with hyphens, collapse consecutive hyphens.
3. Append `.cy.ts` extension.
4. Examples:
   - `"User Login"` → `user-login.cy.ts`
   - `"Shopping Cart — Add Item"` → `shopping-cart-add-item.cy.ts`

## Path Safety

- Resolve the final path and confirm it is **within** the target project root.
- Reject any path containing `..` segments that escape the project boundary.
- Reject absolute paths that do not start with the project root prefix.

## Overwrite Policy

- If a file with the same name already exists:
  - In **dry-run mode**: Log a warning and return the path (no write).
  - In **live mode**: Do **not** overwrite. Return an error asking the user to confirm overwrite or choose a different name.

## Dry-Run Behavior

When `dryRun` is `true` (or the system is in Generate Only mode):

- Compute and return the full export path.
- Log all steps that **would** be taken.
- Do **not** create directories or write files.
- Include `"dryRun": true` in the response.

## Output Contract

```json
{
  "exportedPath": "string — absolute or project-relative path",
  "status": "success | error",
  "dryRun": true,
  "logs": ["string — step-by-step export log entries"]
}
```
