import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tests/[testId]
 *
 * Returns a single test with its full validation and export history.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { testId: string } },
) {
  try {
    const test = await prisma.generatedTest.findUnique({
      where: { id: params.testId },
      include: {
        validationIssues: true,
        exportLog: true,
      },
    });

    if (!test) {
      return NextResponse.json(
        { status: 'error', error: 'Test not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ test, status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: 'error', error: message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tests/[testId]
 *
 * Deletes a test and all related records (cascade).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { testId: string } },
) {
  try {
    await prisma.generatedTest.delete({
      where: { id: params.testId },
    });

    return NextResponse.json({ status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: 'error', error: message },
      { status: 500 },
    );
  }
}
