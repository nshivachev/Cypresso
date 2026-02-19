import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/feedback
 *
 * Accepts workflow logs and a status string, then compiles a
 * human-readable summary with actionable recommendations.
 */
export async function POST(request: NextRequest) {
  try {
    const { logs, status } = (await request.json()) as {
      logs?: string[];
      status?: string;
    };

    const entries = logs ?? [];
    const finalStatus = status ?? 'unknown';

    // Build summary
    const errorCount = entries.filter((l) => /error/i.test(l)).length;
    const successCount = entries.filter((l) => /success/i.test(l)).length;

    let summary: string;
    if (finalStatus === 'success' && errorCount === 0) {
      summary = `Workflow completed successfully. ${entries.length} log entries, ${successCount} success markers, 0 errors.`;
    } else if (finalStatus === 'error') {
      summary = `Workflow finished with errors. ${entries.length} log entries, ${errorCount} error(s) detected.`;
    } else {
      summary = `Workflow finished with status "${finalStatus}". ${entries.length} log entries processed.`;
    }

    // Build recommendations
    const recommendations: string[] = [];
    if (errorCount > 0) {
      recommendations.push(
        'Review the error entries above and consider retrying the failed step.',
      );
    }
    if (entries.some((l) => /issue/i.test(l))) {
      recommendations.push(
        'Address any validation issues before exporting the test.',
      );
    }
    if (finalStatus === 'success') {
      recommendations.push(
        'Test is ready — review the generated code and export when satisfied.',
      );
    }
    if (entries.length === 0) {
      recommendations.push(
        'No logs were provided. Re-run the workflow to collect status information.',
      );
    }

    return NextResponse.json({ summary, recommendations });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        summary: `Feedback compilation failed: ${message}`,
        recommendations: ['Check that the workflow produces valid log output.'],
      },
      { status: 500 },
    );
  }
}
