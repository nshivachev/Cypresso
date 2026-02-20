# Skill: validate-test

Validation rules applied by the **QAValidationAgent** when checking a generated Cypress test.

## Required Structure

- [ ] Contains at least one `describe()` block.
- [ ] Contains at least one `it()` block nested inside `describe()`.
- [ ] Contains at least one assertion: `.should()`, `expect()`, or `assert`.

## TypeScript Validity

- [ ] No unmatched braces, parentheses, or brackets.
- [ ] Arrow functions use correct syntax (`() => {}`).
- [ ] String literals are properly closed.
- [ ] Imports (if any) reference valid Cypress types.

## Idempotence

- [ ] Test can be run multiple times without different outcomes.
- [ ] No `cy.exec()` calls that perform write/delete operations.
- [ ] No direct database manipulation.
- [ ] State setup is handled in `beforeEach()` or `before()` hooks.

## Anti-Patterns (must NOT be present)

- [ ] `cy.wait(<number>)` — hardcoded numeric waits. Use `cy.intercept()` + `cy.wait('@alias')` instead.
- [ ] Fragile CSS selectors (e.g., `.generated-class-123`, complex `nth-child` chains).
- [ ] `Cypress.env()` referencing undefined environment variables without defaults.
- [ ] Commented-out test code without explanation.

## Scoring

| Check         | Weight   | Pass Criteria                                         |
| ------------- | -------- | ----------------------------------------------------- |
| Structure     | Required | All three structural elements present                 |
| TypeScript    | Required | No syntax errors detected                             |
| Idempotence   | Required | No flagged side-effect commands                       |
| Anti-Patterns | Advisory | Zero anti-patterns = clean; warnings are non-blocking |

A test **passes** validation only if all **Required** checks pass. Advisory issues generate warnings but do not block export.

## Database Persistence

After validation, issues are persisted to the database:

- Delete existing `ValidationIssue` records for the test (if re-validating).
- Create new `ValidationIssue` records with `testId`, `issue` description, and `severity` level.
- Severity mapping:
  - **Required** check failures → `error`
  - **Advisory** check failures → `warning`
- Validation results are returned to the UI and visible in the test card's issue count.

## Filter & Update Validation

The same validation principles apply when tests are modified via the Edit modal:

- After a user updates `testCode` via `PUT /api/tests/{testId}`, re-validation should be considered.
- Updated test code must still pass all **Required** checks before being exported.
- The `status` field is not automatically changed on update — the user must explicitly re-validate and re-export.
