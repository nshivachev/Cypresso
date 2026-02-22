import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

/**
 * POST /api/generate
 *
 * Accepts a user story and returns generated Cypress test code.
 * In this stub implementation the test is built from the base template
 * with placeholders filled in from the user story text.
 */
export async function POST(request: NextRequest) {
  const logs: string[] = [];

  try {
    const { userStory } = (await request.json()) as { userStory?: string };

    if (!userStory?.trim()) {
      return NextResponse.json(
        {
          testCode: '',
          status: 'error',
          error: 'userStory is required',
          logs: [],
        },
        { status: 400 },
      );
    }

    logs.push('Received user story for test generation.');

    // Read the agent prompt (informational — not executed in dry-run)
    const agentPath = path.join(
      process.cwd(),
      'agents',
      'TestGeneratorAgent.md',
    );
    try {
      const agentPrompt = await fs.readFile(agentPath, 'utf-8');
      logs.push(`Loaded agent prompt (${agentPrompt.length} chars).`);
    } catch {
      logs.push('Agent prompt file not found — using built-in stub.');
    }

    // Read the base template
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'base-test-template.ts',
    );
    let template: string;
    try {
      template = await fs.readFile(templatePath, 'utf-8');
      logs.push('Loaded base test template.');
    } catch {
      // Fallback inline template
      template = [
        'describe("{{Feature Name}}", () => {',
        '  it("should {{action}}", () => {',
        '    cy.visit("{{url}}");',
        '    cy.get("{{selector}}").should("{{assertion}}");',
        '  });',
        '});',
      ].join('\n');
      logs.push('Template file not found — using inline fallback.');
    }

    // Helper function to validate test structure
    const isValidTest = (code: string): boolean => {
      const hasDescribe = /describe\s*\(/.test(code);
      const hasIt = /it\s*\(/.test(code);
      const hasAssertion =
        /\.should\s*\(/.test(code) ||
        /expect\s*\(/.test(code) ||
        /assert[\s.]/.test(code);
      return hasDescribe && hasIt && hasAssertion;
    };

    // Self-validation retry loop (3 attempts as per TestGeneratorAgent)
    let testCode: string = '';
    let genAttempt = 0;
    const maxGenAttempts = 3;
    const backoffMs = [500, 1000, 2000];

    while (genAttempt < maxGenAttempts && !testCode) {
      genAttempt++;

      // Derive simple placeholders from the user story
      const featureName = userStory
        .slice(0, 60)
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim();
      const slug = featureName.toLowerCase().replace(/\s+/g, '-');

      const generatedCode = template
        .replace(/\{\{Feature Name\}\}/g, featureName)
        .replace(/\{\{action\}\}/g, `complete the "${slug}" flow`)
        .replace(/\{\{url\}\}/g, '/')
        .replace(/\{\{selector\}\}/g, "[data-testid='main']")
        .replace(/\{\{assertion\}\}/g, 'be.visible');

      logs.push(
        `Attempt ${genAttempt}/${maxGenAttempts}: Test code generated from template.`,
      );

      // Validate generated test structure
      if (isValidTest(generatedCode)) {
        testCode = generatedCode;
        logs.push(
          `Attempt ${genAttempt}/${maxGenAttempts}: Self-validation PASSED (has describe, it, assertion).`,
        );
      } else {
        logs.push(
          `Attempt ${genAttempt}/${maxGenAttempts}: Self-validation FAILED (missing required structure).`,
        );
        if (genAttempt < maxGenAttempts) {
          const delay = backoffMs[genAttempt - 1];
          logs.push(
            `[WARN] Retrying test generation in ${delay}ms (attempt ${genAttempt}/${maxGenAttempts})…`,
          );
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logs.push(
            '[ERROR] Test generation failed after 3 attempts — returning best attempt.',
          );
          testCode = generatedCode; // Use the last attempt as fallback
        }
      }
    }

    // Save to SQLite database with retry logic
    let testId: string | undefined;
    let dbRetries = 0;
    const maxDbRetries = 2;

    while (dbRetries < maxDbRetries && !testId) {
      try {
        const record = await prisma.generatedTest.create({
          data: { userStory, testCode, status: 'draft' },
        });
        testId = record.id;
        logs.push(`Saved to SQLite database with ID: ${testId}`);
      } catch (dbErr) {
        dbRetries++;
        const dbMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        if (dbRetries < maxDbRetries) {
          logs.push(
            `Database save failed, retrying (${dbRetries}/${maxDbRetries}): ${dbMsg}`,
          );
        } else {
          logs.push(
            `Database save failed after ${maxDbRetries} retries: ${dbMsg}`,
          );
        }
      }
    }

    const status = testId ? 'success' : 'partial-success';
    return NextResponse.json({ testCode, testId, status, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(`Fatal error: ${message}`);
    return NextResponse.json(
      { testCode: '', status: 'error', error: message, logs },
      { status: 500 },
    );
  }
}
