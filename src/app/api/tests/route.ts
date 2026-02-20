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

    // Status filter (database level)
    if (status && (status === 'draft' || status === 'exported')) {
      where.status = status;
    }

    // Date range filter (database level)
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        // Parse YYYY-MM-DD format and set to start of day
        const fromDate = new Date(dateFrom + 'T00:00:00Z');
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        // Parse YYYY-MM-DD format and set to end of day
        const toDate = new Date(dateTo + 'T23:59:59Z');
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
