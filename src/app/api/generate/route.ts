import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    // Derive simple placeholders from the user story
    const featureName = userStory
      .slice(0, 60)
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim();
    const slug = featureName.toLowerCase().replace(/\s+/g, '-');

    const testCode = template
      .replace(/\{\{Feature Name\}\}/g, featureName)
      .replace(/\{\{action\}\}/g, `complete the "${slug}" flow`)
      .replace(/\{\{url\}\}/g, '/')
      .replace(/\{\{selector\}\}/g, "[data-testid='main']")
      .replace(/\{\{assertion\}\}/g, 'be.visible');

    logs.push(
      'Test code generated from template with user-story placeholders.',
    );

    return NextResponse.json({ testCode, status: 'success', logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(`Fatal error: ${message}`);
    return NextResponse.json(
      { testCode: '', status: 'error', error: message, logs },
      { status: 500 },
    );
  }
}
