# Skill: filter-tests

Filter and search rules applied when retrieving saved tests from the database via `GET /api/tests`.

## Search (Text Filter)

- **Field**: Searches across `userStory` and `testCode` fields.
- **Case Sensitivity**: Case-insensitive matching (applied in JavaScript, not at database level — SQLite limitation).
- **Match Type**: Partial match using `String.includes()`.
- **Empty Input**: Whitespace-only or empty search strings are ignored (no filter applied).
- **Application**: Applied after database fetch, filtering the result set in JavaScript.

### QA Validation Checklist — Search

- [ ] Searching "login" matches tests containing "Login", "LOGIN", "user login".
- [ ] Searching "cy.visit" matches test code containing that command.
- [ ] Empty search returns all tests (no filter applied).
- [ ] Search with only spaces returns all tests (trimmed to empty).
- [ ] Search applies to both `userStory` and `testCode` — a match in either field returns the test.

## Status Filter

- **Field**: Filters on `GeneratedTest.status` column.
- **Valid Values**: `draft`, `exported`.
- **Default**: `all` (no status constraint).
- **Application**: Applied at the **database query level** via Prisma `where` clause.

### QA Validation Checklist — Status

- [ ] Selecting "Draft" returns only tests with `status === 'draft'`.
- [ ] Selecting "Exported" returns only tests with `status === 'exported'`.
- [ ] Selecting "All" returns tests regardless of status.
- [ ] Invalid status values are ignored (no filter applied).

## Date Range Filter

- **Fields**: `dateFrom` and `dateTo` filter on `GeneratedTest.createdAt`.
- **Input Format**: `YYYY-MM-DD` (from HTML `<input type="date">`).
- **Conversion**:
  - `dateFrom` → `new Date(dateFrom + 'T00:00:00Z')` — start of day, UTC.
  - `dateTo` → `new Date(dateTo + 'T23:59:59Z')` — end of day, UTC.
- **Partial Range**: Using only `dateFrom` without `dateTo` (or vice versa) is valid.
- **Application**: Applied at the **database query level** via Prisma `where.createdAt.gte` / `where.createdAt.lte`.

### QA Validation Checklist — Date Range

- [ ] Setting `dateFrom` to today shows tests created today and after.
- [ ] Setting `dateTo` to today shows tests created today and before (including the full day).
- [ ] Setting both `dateFrom` and `dateTo` to the same date shows tests created on that day.
- [ ] Using only `dateFrom` without `dateTo` works correctly (open-ended range).
- [ ] Using only `dateTo` without `dateFrom` works correctly (open-ended range).
- [ ] Invalid date strings do not crash the API.

## Combined Filters

When multiple filters are active, they compose with **AND** logic:

1. **Database-level filters** are applied first: `status` and `createdAt` range.
2. **JavaScript-level filter** is applied second: text search on the database result set.
3. The final `count` in the response reflects the fully filtered set.

### QA Validation Checklist — Combined

- [ ] Search + Status: Only tests matching both the search text and the selected status are returned.
- [ ] Search + Date Range: Only tests matching both the search text and the date range are returned.
- [ ] Status + Date Range: Only tests matching both the status and the date range are returned.
- [ ] All three combined: Only tests matching all criteria are returned.
- [ ] Clear Filters resets all inputs and returns the full unfiltered test list.

## UI Behavior

- Filter state changes trigger automatic test list reload via `useEffect` dependency array.
- The count badge in the "Saved Tests" header updates to reflect the filtered count.
- Empty results show a contextual message based on whether filters are active.
- The "Clear Filters" button resets: `searchText` → `''`, `selectedStatus` → `'all'`, `dateFrom` → `''`, `dateTo` → `''`.

## API Contract

```
GET /api/tests?search=login&status=draft&dateFrom=2026-01-01&dateTo=2026-02-20

Response:
{
  "tests": [ ... ],
  "status": "success",
  "count": 5
}
```

All query parameters are optional. Omitted parameters apply no constraint.
