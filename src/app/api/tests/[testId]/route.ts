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
 * PUT /api/tests/[testId]
 *
 * Updates a test's user story and/or test code.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { testId: string } },
) {
  try {
    const { userStory, testCode } = (await request.json()) as {
      userStory?: string;
      testCode?: string;
    };

    if (!userStory && !testCode) {
      return NextResponse.json(
        { status: 'error', error: 'userStory or testCode is required' },
        { status: 400 },
      );
    }

    const updateData: {
      userStory?: string;
      testCode?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (userStory) updateData.userStory = userStory;
    if (testCode) updateData.testCode = testCode;

    const test = await prisma.generatedTest.update({
      where: { id: params.testId },
      data: updateData,
      include: {
        validationIssues: true,
        exportLog: true,
      },
    });

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
