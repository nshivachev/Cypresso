'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface SavedTest {
  id: string;
  userStory: string;
  testCode: string;
  status: string;
  createdAt: string;
  validationIssues: { id: string; issue: string; severity: string }[];
  exportLog: { id: string; path: string }[];
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
  const [testId, setTestId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [testCount, setTestCount] = useState(0);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Edit modal state
  const [editingTest, setEditingTest] = useState<SavedTest | null>(null);
  const [editUserStory, setEditUserStory] = useState('');
  const [editTestCode, setEditTestCode] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);

  const loadSavedTests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.append('search', searchText);
      if (selectedStatus && selectedStatus !== 'all')
        params.append('status', selectedStatus);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const url = `/api/tests${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setSavedTests(data.tests);
        setTestCount(data.count);
      }
    } catch {
      // non-blocking
    }
  }, [searchText, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    loadSavedTests();
  }, [loadSavedTests]);

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleUpdateTest = async () => {
    if (!editingTest) return;
    try {
      const res = await fetch(`/api/tests/${editingTest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userStory: editUserStory,
          testCode: editTestCode,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        addLog('SUCCESS', `Updated test ${editingTest.id}`);
        setEditingTest(null);
        await loadSavedTests();
      } else {
        addLog('ERROR', `Update failed: ${data.error}`);
      }
    } catch (err) {
      addLog(
        'ERROR',
        `Update error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

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
      if (data.status === 'success' || data.status === 'partial-success') {
        setTestCode(data.testCode);
        if (data.testId) setTestId(data.testId);
        addLog('SUCCESS', 'Test generated successfully.');
        if (data.status === 'partial-success')
          addLog('WARN', 'DB save failed — test not persisted.');
        await loadSavedTests();
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
      const res = await fetchWithRetry('/api/validate', { testCode, testId });
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
      const res = await fetchWithRetry('/api/export', { testCode, testId });
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
    let generatedTestId: string | undefined;
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
      if (
        genData.status === 'success' ||
        genData.status === 'partial-success'
      ) {
        generatedCode = genData.testCode;
        generatedTestId = genData.testId;
        setTestCode(generatedCode);
        if (genData.testId) setTestId(genData.testId);
        addLog('SUCCESS', 'Step 1 complete — test generated.');
        await loadSavedTests();
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
          testId: generatedTestId,
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
          testId: generatedTestId,
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

      {/* Saved Tests */}
      <section className='mt-8'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-sm font-medium text-slate-300'>
            Saved Tests{' '}
            <span className='ml-1 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400'>
              {testCount}
            </span>
          </h2>
          <button
            onClick={loadSavedTests}
            className='text-xs text-slate-500 hover:text-slate-300'
          >
            Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className='mb-4 grid gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4 md:grid-cols-4'>
          <div>
            <label className='mb-1 block text-xs text-slate-400'>Search</label>
            <input
              type='text'
              placeholder='Search tests...'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className='w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none'
            />
          </div>
          <div>
            <label className='mb-1 block text-xs text-slate-400'>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className='w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none'
            >
              <option value='all'>All</option>
              <option value='draft'>Draft</option>
              <option value='exported'>Exported</option>
            </select>
          </div>
          <div>
            <label className='mb-1 block text-xs text-slate-400'>
              From Date
            </label>
            <input
              type='date'
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className='w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none'
            />
          </div>
          <div>
            <label className='mb-1 block text-xs text-slate-400'>To Date</label>
            <input
              type='date'
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className='w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none'
            />
          </div>
          <div className='md:col-span-4 flex justify-end'>
            <button
              onClick={handleClearFilters}
              className='rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700'
            >
              Clear Filters
            </button>
          </div>
        </div>

        {savedTests.length === 0 ? (
          <p className='text-xs text-slate-600'>
            {searchText || selectedStatus !== 'all' || dateFrom || dateTo
              ? 'No tests match the selected filters.'
              : 'No saved tests yet — generate one above.'}
          </p>
        ) : (
          <div className='space-y-2'>
            {savedTests.map((test) => (
              <div
                key={test.id}
                className='flex items-start justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-slate-100'>
                    {test.userStory.slice(0, 80)}
                    {test.userStory.length > 80 ? '…' : ''}
                  </p>
                  <p className='mt-0.5 text-xs text-slate-500'>
                    Status:{' '}
                    <span
                      className={
                        test.status === 'exported'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }
                    >
                      {test.status}
                    </span>{' '}
                    &middot; Issues: {test.validationIssues.length} &middot;
                    Exports: {test.exportLog.length} &middot;{' '}
                    {new Date(test.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className='ml-4 flex shrink-0 gap-2'>
                  <button
                    onClick={() => {
                      setTestCode(test.testCode);
                      setTestId(test.id);
                      setUserStory(test.userStory);
                      addLog('INFO', `Loaded test ${test.id} from database.`);
                    }}
                    className='rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700'
                  >
                    Load
                  </button>
                  <button
                    onClick={() => {
                      setEditingTest(test);
                      setEditUserStory(test.userStory);
                      setEditTestCode(test.testCode);
                    }}
                    className='rounded border border-blue-700 px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/30'
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/tests/${test.id}`, {
                        method: 'DELETE',
                      });
                      await loadSavedTests();
                      addLog('INFO', `Deleted test ${test.id} from database.`);
                    }}
                    className='rounded border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-900/30'
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editingTest && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4'>
          <div className='w-full max-w-4xl rounded-lg bg-slate-800 p-6 shadow-2xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-bold text-slate-100'>Edit Test</h2>
              <button
                onClick={() => setEditingTest(null)}
                className='text-slate-400 hover:text-slate-200'
              >
                ✕
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-300'>
                  User Story
                </label>
                <textarea
                  className='w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                  rows={4}
                  value={editUserStory}
                  onChange={(e) => setEditUserStory(e.target.value)}
                />
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-slate-300'>
                  Test Code
                </label>
                <textarea
                  className='w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                  rows={20}
                  value={editTestCode}
                  onChange={(e) => setEditTestCode(e.target.value)}
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                onClick={() => setEditingTest(null)}
                className='rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700'
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTest}
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500'
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
