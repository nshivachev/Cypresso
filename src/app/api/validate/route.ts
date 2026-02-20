import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/validate
 *
 * Accepts generated Cypress test code and performs basic structural
 * and quality checks without executing the test.
 */
export async function POST(request: NextRequest) {
  const logs: string[] = [];

  try {
    const { testCode, testId } = (await request.json()) as {
      testCode?: string;
      testId?: string;
    };

    if (!testCode?.trim()) {
      return NextResponse.json(
        { valid: false, issues: ['testCode is required'], logs: [] },
        { status: 400 },
      );
    }

    logs.push('Received test code for validation.');

    const issues: string[] = [];

    // Check: contains describe block
    if (!/describe\s*\(/.test(testCode)) {
      issues.push('Missing describe() block.');
    }

    // Check: contains at least one it block
    if (!/it\s*\(/.test(testCode)) {
      issues.push('Missing it() block — need at least one test case.');
    }

    // Check: contains at least one assertion
    const hasAssertion =
      /\.should\s*\(/.test(testCode) ||
      /expect\s*\(/.test(testCode) ||
      /assert[\s.]/.test(testCode);
    if (!hasAssertion) {
      issues.push('No assertion found (should / expect / assert).');
    }

    // Check: no hardcoded numeric waits
    if (/cy\.wait\s*\(\s*\d+\s*\)/.test(testCode)) {
      issues.push(
        'Hardcoded cy.wait(number) detected — use aliases or intercepts instead.',
      );
    }

    // Check: idempotence concern — cy.exec with side effects
    if (/cy\.exec\s*\(/.test(testCode)) {
      issues.push(
        'cy.exec() detected — verify it does not cause non-idempotent side effects.',
      );
    }

    const valid = issues.length === 0;
    logs.push(`Validation complete — ${issues.length} issue(s) found.`);

    // Persist validation issues to SQLite database
    if (testId) {
      try {
        await prisma.validationIssue.deleteMany({ where: { testId } });
        if (issues.length > 0) {
          await prisma.validationIssue.createMany({
            data: issues.map((issue) => ({
              testId: testId!,
              issue,
              severity: 'warn',
            })),
          });
        }
        logs.push(
          `Saved ${issues.length} validation issue(s) to SQLite database.`,
        );
      } catch (dbErr) {
        const dbMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        logs.push(`Warning: Failed to save validation issues: ${dbMsg}`);
      }
    }

    return NextResponse.json({ valid, issues, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(`Fatal error: ${message}`);
    return NextResponse.json(
      { valid: false, issues: [message], logs },
      { status: 500 },
    );
  }
}
