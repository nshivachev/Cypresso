import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tests
 *
 * Returns all saved tests from the SQLite database,
 * including their validation issues and export logs.
 */
export async function GET() {
  try {
    const tests = await prisma.generatedTest.findMany({
      include: {
        validationIssues: true,
        exportLog: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tests, status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { tests: [], status: 'error', error: message },
      { status: 500 },
    );
  }
}
