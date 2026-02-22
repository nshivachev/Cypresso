# Cypresso Tests

Unit tests for Cypresso API endpoints and validation logic.

## Structure

```
packages/tests/
├── src/
│   └── api/
│       ├── generate.test.ts    # Tests for test generation and self-validation
│       ├── validate.test.ts    # Tests for QA validation and filter logic
│       └── export.test.ts      # Tests for export path derivation
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

Install dependencies:

```bash
npm install
```

## Running Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

Run tests with UI:

```bash
npm run test:ui
```

Generate coverage report:

```bash
npm run test:coverage
```

## Test Coverage

### generate.test.ts

- Self-validation logic (describe, it, assertion checks)
- Retry loop scenarios
- Edge cases for test structure

### validate.test.ts

- Structure validation (describe, it, assertion)
- Anti-pattern detection (hardcoded waits, cy.exec())
- Multiple issues reporting
- Date format validation (YYYY-MM-DD)
- Status filter validation (draft, exported, all)
- UTC timezone conversions

### export.test.ts

- Feature name extraction from describe block
- File naming with .cy.ts extension
- Path derivation logic
- Custom base path handling
- Dry-run behavior verification

## Integration with Main App

These tests mirror the validation logic in:

- `src/app/api/generate/route.ts` - Self-validation
- `src/app/api/validate/route.ts` - QA validation
- `src/app/api/export/route.ts` - Export logic
- `src/app/api/tests/route.ts` - Filter logic

## Adding New Tests

Create new test files in `src/api/` following the naming convention: `<feature>.test.ts`

Example:

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```
