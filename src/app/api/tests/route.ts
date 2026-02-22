import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tests
 *
 * Returns filtered tests from the SQLite database.
 * Query params:
 * - search: text search in userStory or testCode
 * - status: filter by status (draft, exported)
 * - dateFrom: filter by creation date (ISO string)
 * - dateTo: filter by creation date (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};

    // Status filter (database level) — only draft or exported are valid
    if (status && status !== 'all') {
      if (status === 'draft' || status === 'exported') {
        where.status = status;
      } else {
        // Invalid status value
        return NextResponse.json(
          {
            tests: [],
            status: 'error',
            error: `Invalid status filter: "${status}". Must be "draft", "exported", or "all".`,
          },
          { status: 400 },
        );
      }
    }

    // Date range filter (database level) with validation
    if (dateFrom || dateTo) {
      // Validate date format (YYYY-MM-DD)
      const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (
        (dateFrom && !dateFormatRegex.test(dateFrom)) ||
        (dateTo && !dateFormatRegex.test(dateTo))
      ) {
        return NextResponse.json(
          {
            tests: [],
            status: 'error',
            error: 'Invalid date format. Dates must be in YYYY-MM-DD format.',
          },
          { status: 400 },
        );
      }

      where.createdAt = {};
      if (dateFrom) {
        // Parse YYYY-MM-DD format and set to start of day (UTC)
        const fromDate = new Date(dateFrom + 'T00:00:00Z');
        if (isNaN(fromDate.getTime())) {
          return NextResponse.json(
            {
              tests: [],
              status: 'error',
              error: `Invalid dateFrom value: "${dateFrom}".`,
            },
            { status: 400 },
          );
        }
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        // Parse YYYY-MM-DD format and set to end of day (UTC)
        const toDate = new Date(dateTo + 'T23:59:59Z');
        if (isNaN(toDate.getTime())) {
          return NextResponse.json(
            {
              tests: [],
              status: 'error',
              error: `Invalid dateTo value: "${dateTo}".`,
            },
            { status: 400 },
          );
        }
        where.createdAt.lte = toDate;
      }
    }

    // Fetch tests without search filter first (SQLite doesn't support case-insensitive contains)
    let tests = await prisma.generatedTest.findMany({
      where,
      include: {
        validationIssues: true,
        exportLog: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Apply case-insensitive text search in JavaScript
    if (search) {
      const searchLower = search.toLowerCase();
      tests = tests.filter(
        (test: (typeof tests)[0]) =>
          test.userStory.toLowerCase().includes(searchLower) ||
          test.testCode.toLowerCase().includes(searchLower),
      );
    }

    return NextResponse.json({ tests, status: 'success', count: tests.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { tests: [], status: 'error', error: message },
      { status: 500 },
    );
  }
}
