import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/**
 * POST /api/export
 *
 * Accepts generated test code and a target path.
 * In dry-run mode this does NOT write to disk — it returns the
 * intended export path so the user can review before committing.
 */
export async function POST(request: NextRequest) {
  const logs: string[] = [];

  try {
    const { testCode, targetPath } = (await request.json()) as {
      testCode?: string;
      targetPath?: string;
    };

    if (!testCode?.trim()) {
      return NextResponse.json(
        {
          exportedPath: '',
          status: 'error',
          error: 'testCode is required',
          logs: [],
        },
        { status: 400 },
      );
    }

    logs.push('Received test code for export.');

    // Derive a filename from the first describe block
    const describeMatch = testCode.match(/describe\(["'](.+?)["']/);
    const featureSlug = describeMatch
      ? describeMatch[1]
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+$/, '')
      : 'generated-test';

    const baseDir = targetPath?.trim() || path.join('.', 'cypress', 'e2e');
    const fileName = `${featureSlug}.cy.ts`;
    const exportedPath = path.join(baseDir, fileName);

    logs.push(`Target directory: ${baseDir}`);
    logs.push(`File name: ${fileName}`);
    logs.push(`Full export path: ${exportedPath}`);
    logs.push('Dry-run mode — file NOT written to disk.');

    return NextResponse.json({ exportedPath, status: 'success', logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(`Fatal error: ${message}`);
    return NextResponse.json(
      { exportedPath: '', status: 'error', error: message, logs },
      { status: 500 },
    );
  }
}
