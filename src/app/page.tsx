'use client';

import { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logLevelClass(level: LogLevel): string {
  switch (level) {
    case 'INFO':
      return 'log-info';
    case 'SUCCESS':
      return 'log-success';
    case 'WARN':
      return 'log-warn';
    case 'ERROR':
      return 'log-error';
  }
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function fetchWithRetry(
  url: string,
  body: Record<string, unknown>,
  retries = 3,
  backoffMs = 500,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
      }
    }
  }
  throw lastError ?? new Error('fetchWithRetry failed');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [userStory, setUserStory] = useState('');
  const [testCode, setTestCode] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => [...prev, { timestamp: now(), level, message }]);
    setTimeout(
      () => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      50,
    );
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!userStory.trim()) {
      addLog('WARN', 'Please enter a user story before generating.');
      return;
    }
    setLoading(true);
    addLog('INFO', 'Starting test generation…');
    try {
      const res = await fetchWithRetry('/api/generate', { userStory });
      const data = await res.json();
      (data.logs as string[])?.forEach((l: string) => addLog('INFO', l));
      if (data.status === 'success') {
        setTestCode(data.testCode);
        addLog('SUCCESS', 'Test generated successfully.');
      } else {
        addLog('ERROR', `Generation failed: ${data.error ?? 'unknown'}`);
      }
    } catch (err) {
      addLog(
        'ERROR',
        `Generation error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Validate ──────────────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!testCode.trim()) {
      addLog('WARN', 'No test code to validate. Generate a test first.');
      return;
    }
    setLoading(true);
    addLog('INFO', 'Validating generated test…');
    try {
      const res = await fetchWithRetry('/api/validate', { testCode });
      const data = await res.json();
      (data.logs as string[])?.forEach((l: string) => addLog('INFO', l));
      if (data.valid) {
        addLog('SUCCESS', 'Validation passed — test is valid.');
      } else {
        (data.issues as string[])?.forEach((i: string) =>
          addLog('WARN', `Issue: ${i}`),
        );
        addLog('ERROR', 'Validation failed. See issues above.');
      }
    } catch (err) {
      addLog(
        'ERROR',
        `Validation error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!testCode.trim()) {
      addLog('WARN', 'No test code to export. Generate a test first.');
      return;
    }
    setLoading(true);
    addLog('INFO', 'Exporting test (dry-run)…');
    try {
      const res = await fetchWithRetry('/api/export', { testCode });
      const data = await res.json();
      (data.logs as string[])?.forEach((l: string) => addLog('INFO', l));
      if (data.status === 'success') {
        addLog('SUCCESS', `Export target: ${data.exportedPath}`);
      } else {
        addLog('ERROR', `Export failed: ${data.error ?? 'unknown'}`);
      }
    } catch (err) {
      addLog(
        'ERROR',
        `Export error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Full Workflow (Generate → Validate → Export → Feedback) ───────────
  const handleFullWorkflow = async () => {
    if (!userStory.trim()) {
      addLog('WARN', 'Please enter a user story before running the workflow.');
      return;
    }
    setLoading(true);
    addLog('INFO', '▶ Starting full Cypresso workflow…');

    let generatedCode = '';
    const allLogs: string[] = [];
    let finalStatus = 'success';

    // Step 1 — Generate
    try {
      addLog('INFO', '[Step 1/4] Generating test…');
      const genRes = await fetchWithRetry('/api/generate', { userStory });
      const genData = await genRes.json();
      (genData.logs as string[])?.forEach((l: string) => {
        addLog('INFO', l);
        allLogs.push(l);
      });
      if (genData.status === 'success') {
        generatedCode = genData.testCode;
        setTestCode(generatedCode);
        addLog('SUCCESS', 'Step 1 complete — test generated.');
        allLogs.push('Generate: success');
      } else {
        throw new Error(genData.error ?? 'generation failed');
      }
    } catch (err) {
      addLog(
        'ERROR',
        `Step 1 failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      finalStatus = 'error';
      allLogs.push(
        `Generate: error — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Step 2 — Validate
    if (finalStatus === 'success') {
      try {
        addLog('INFO', '[Step 2/4] Validating test…');
        const valRes = await fetchWithRetry('/api/validate', {
          testCode: generatedCode,
        });
        const valData = await valRes.json();
        (valData.logs as string[])?.forEach((l: string) => {
          addLog('INFO', l);
          allLogs.push(l);
        });
        if (valData.valid) {
          addLog('SUCCESS', 'Step 2 complete — validation passed.');
          allLogs.push('Validate: pass');
        } else {
          (valData.issues as string[])?.forEach((i: string) =>
            addLog('WARN', `Issue: ${i}`),
          );
          addLog(
            'WARN',
            'Step 2 — validation issues found (non-blocking in dry-run).',
          );
          allLogs.push('Validate: issues found');
        }
      } catch (err) {
        addLog(
          'ERROR',
          `Step 2 failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        allLogs.push(
          `Validate: error — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Step 3 — Export
    if (finalStatus === 'success') {
      try {
        addLog('INFO', '[Step 3/4] Exporting test (dry-run)…');
        const expRes = await fetchWithRetry('/api/export', {
          testCode: generatedCode,
        });
        const expData = await expRes.json();
        (expData.logs as string[])?.forEach((l: string) => {
          addLog('INFO', l);
          allLogs.push(l);
        });
        if (expData.status === 'success') {
          addLog(
            'SUCCESS',
            `Step 3 complete — target: ${expData.exportedPath}`,
          );
          allLogs.push(`Export: ${expData.exportedPath}`);
        } else {
          throw new Error(expData.error ?? 'export failed');
        }
      } catch (err) {
        addLog(
          'ERROR',
          `Step 3 failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        allLogs.push(
          `Export: error — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Step 4 — Feedback
    try {
      addLog('INFO', '[Step 4/4] Compiling feedback…');
      const fbRes = await fetchWithRetry('/api/feedback', {
        logs: allLogs,
        status: finalStatus,
      });
      const fbData = await fbRes.json();
      addLog('INFO', `Summary: ${fbData.summary}`);
      (fbData.recommendations as string[])?.forEach((r: string) =>
        addLog('INFO', `→ ${r}`),
      );
      addLog('SUCCESS', '▶ Workflow complete.');
    } catch (err) {
      addLog(
        'WARN',
        `Feedback step skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    setLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      {/* Header */}
      <header className='mb-8 flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold'>
          C
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Cypresso</h1>
          <p className='text-sm text-slate-400'>
            Cypress Test Generator — Generate &middot; Validate &middot; Export
          </p>
        </div>
      </header>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Left column — Input & actions */}
        <section className='space-y-4'>
          <label className='block'>
            <span className='mb-1 block text-sm font-medium text-slate-300'>
              User Story
            </span>
            <textarea
              className='w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
              rows={6}
              placeholder='As a user, I want to log in so that I can access my dashboard…'
              value={userStory}
              onChange={(e) => setUserStory(e.target.value)}
            />
          </label>

          <div className='flex flex-wrap gap-3'>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
            >
              {loading ? 'Working…' : 'Generate Test'}
            </button>
            <button
              onClick={handleValidate}
              disabled={loading}
              className='rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50'
            >
              Validate
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className='rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50'
            >
              Export (Dry-Run)
            </button>
            <button
              onClick={handleFullWorkflow}
              disabled={loading}
              className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50'
            >
              Run Full Workflow
            </button>
          </div>

          {/* Generated test preview */}
          {testCode && (
            <div>
              <h2 className='mb-1 text-sm font-medium text-slate-300'>
                Generated Test
              </h2>
              <pre className='log-panel whitespace-pre-wrap text-emerald-300'>
                {testCode}
              </pre>
            </div>
          )}
        </section>

        {/* Right column — Logs */}
        <section>
          <div className='mb-2 flex items-center justify-between'>
            <h2 className='text-sm font-medium text-slate-300'>
              Logs &amp; Status
            </h2>
            <button
              onClick={() => setLogs([])}
              className='text-xs text-slate-500 hover:text-slate-300'
            >
              Clear
            </button>
          </div>
          <div className='log-panel'>
            {logs.length === 0 && (
              <span className='text-slate-600'>
                Logs will appear here when you run actions…
              </span>
            )}
            {logs.map((entry, i) => (
              <div key={i} className={logLevelClass(entry.level)}>
                <span className='text-slate-500'>[{entry.timestamp}]</span>{' '}
                <span className='font-semibold'>[{entry.level}]</span>{' '}
                {entry.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </section>
      </div>
    </main>
  );
}
