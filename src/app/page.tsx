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

function CypressoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden='true'
    >
      {/* Steam */}
      <path
        d='M17 10c2 2 2 4 0 6'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='M24 8c2 2 2 5 0 7'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='M31 10c2 2 2 4 0 6'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />

      {/* Cup */}
      <path
        d='M14 18h18a0 0 0 0 1 0 0v10a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8V18z'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinejoin='round'
      />
      <path
        d='M32 20h3a5 5 0 0 1 0 10h-3'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />

      {/* Check */}
      <path
        d='M19.5 27.5l3 3 6-7'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />

      {/* Saucer */}
      <path
        d='M14 38h20'
        stroke='currentColor'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden='true'
    >
      <path
        d='M7 3v2M17 3v2'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path
        d='M4 7h16'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path
        d='M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <path
        d='M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
      />
    </svg>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    // showPicker() is supported in Chromium-based browsers.
    (input as unknown as { showPicker?: () => void }).showPicker?.();
    input.focus();
  };

  return (
    <div>
      <label htmlFor={id} className='label'>
        {label}
      </label>
      <div className='relative'>
        <input
          ref={inputRef}
          id={id}
          type='date'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className='input pr-10'
        />
        <button
          type='button'
          onClick={openPicker}
          className='absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500'
          aria-label={`${label} calendar`}
          title='Pick a date'
        >
          <CalendarIcon className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}

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
    <main className='mx-auto max-w-6xl px-6 py-12'>
      {/* Header */}
      <header className='mb-6 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60'>
            <CypressoMark className='h-8 w-8 text-emerald-400' />
          </div>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-slate-100'>
              Cypresso
            </h1>
            <p className='text-sm text-slate-400'>
              Cypress tests — generate, validate, export
            </p>
          </div>
        </div>
      </header>

      {/* Saved Tests */}
      <section className='mb-10'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-sm font-medium text-slate-300'>
            Saved Tests{' '}
            <span className='ml-1 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300'>
              {testCount}
            </span>
          </h2>
          <button type='button' onClick={loadSavedTests} className='btn-ghost'>
            Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className='card-tight mb-4'>
          <div className='grid gap-3 md:grid-cols-4'>
            <div>
              <label htmlFor='saved-search' className='label'>
                Search
              </label>
              <input
                id='saved-search'
                type='text'
                placeholder='Search by story or id…'
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className='input'
              />
            </div>
            <div>
              <label htmlFor='saved-status' className='label'>
                Status
              </label>
              <select
                id='saved-status'
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className='select'
              >
                <option value='all'>All</option>
                <option value='draft'>Draft</option>
                <option value='exported'>Exported</option>
              </select>
            </div>
            <DateField
              id='saved-date-from'
              label='From'
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DateField
              id='saved-date-to'
              label='To'
              value={dateTo}
              onChange={setDateTo}
            />
          </div>
          <div className='mt-3 flex justify-end'>
            <button
              type='button'
              onClick={handleClearFilters}
              className='btn btn-secondary px-3 py-1.5 text-xs'
            >
              Clear filters
            </button>
          </div>
        </div>

        {savedTests.length === 0 ? (
          <p className='text-xs text-slate-600'>
            {searchText || selectedStatus !== 'all' || dateFrom || dateTo
              ? 'No tests match the selected filters.'
              : 'No saved tests yet — generate one below.'}
          </p>
        ) : (
          <div className='space-y-2'>
            {savedTests.map((test) => (
              <div
                key={test.id}
                className='card-tight flex items-start justify-between gap-4'
              >
                <div className='min-w-0 flex-1'>
                  <p
                    className='truncate text-sm font-medium text-slate-100'
                    title={test.userStory}
                  >
                    {test.userStory.slice(0, 80)}
                    {test.userStory.length > 80 ? '…' : ''}
                  </p>
                  <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500'>
                    <span
                      className={
                        test.status === 'exported'
                          ? 'badge border-emerald-900/50 text-emerald-300'
                          : 'badge'
                      }
                    >
                      {test.status}
                    </span>
                    <span className='badge'>
                      Issues: {test.validationIssues.length}
                    </span>
                    <span className='badge'>
                      Exports: {test.exportLog.length}
                    </span>
                    <span className='text-slate-500'>
                      {new Date(test.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className='ml-4 flex shrink-0 gap-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setTestCode(test.testCode);
                      setTestId(test.id);
                      setUserStory(test.userStory);
                      addLog('INFO', `Loaded test ${test.id} from database.`);
                    }}
                    className='btn btn-secondary px-3 py-1.5 text-xs'
                  >
                    Load
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setEditingTest(test);
                      setEditUserStory(test.userStory);
                      setEditTestCode(test.testCode);
                    }}
                    className='btn btn-info px-3 py-1.5 text-xs'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={async () => {
                      await fetch(`/api/tests/${test.id}`, {
                        method: 'DELETE',
                      });
                      await loadSavedTests();
                      addLog('INFO', `Deleted test ${test.id} from database.`);
                    }}
                    className='btn btn-danger px-3 py-1.5 text-xs'
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Left column — Input & actions */}
        <section className='card space-y-4'>
          <label className='block'>
            <span className='mb-1 block text-sm font-medium text-slate-300'>
              User story
            </span>
            <textarea
              className='textarea'
              rows={6}
              placeholder='As a user, I want to log in so that I can access my dashboard…'
              value={userStory}
              onChange={(e) => setUserStory(e.target.value)}
            />
          </label>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <button
              type='button'
              onClick={handleGenerate}
              disabled={loading}
              className='btn btn-primary w-full'
            >
              {loading ? 'Working…' : 'Generate test'}
            </button>
            <button
              type='button'
              onClick={handleValidate}
              disabled={loading}
              className='btn btn-secondary w-full'
            >
              Validate
            </button>
            <button
              type='button'
              onClick={handleExport}
              disabled={loading}
              className='btn btn-secondary w-full'
            >
              Export (dry-run)
            </button>
            <button
              type='button'
              onClick={handleFullWorkflow}
              disabled={loading}
              className='btn btn-accent w-full sm:col-span-3'
            >
              Run full workflow
            </button>
          </div>

          {/* Generated test preview */}
          {testCode && (
            <div>
              <h2 className='mb-1 text-sm font-medium text-slate-300'>
                Generated test
              </h2>
              <pre className='log-panel whitespace-pre-wrap text-emerald-200'>
                {testCode}
              </pre>
            </div>
          )}
        </section>

        {/* Right column — Logs */}
        <section className='card'>
          <div className='mb-3 flex items-center justify-between'>
            <h2 className='text-sm font-medium text-slate-300'>
              Logs &amp; status
            </h2>
            <button
              type='button'
              onClick={() => setLogs([])}
              className='btn-ghost'
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

      {/* Edit Modal */}
      {editingTest && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4'>
          <div
            className='w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl'
            role='dialog'
            aria-modal='true'
            aria-label='Edit saved test'
          >
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-bold text-slate-100'>Edit Test</h2>
              <button
                type='button'
                onClick={() => setEditingTest(null)}
                className='text-slate-400 hover:text-slate-200'
                aria-label='Close edit modal'
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
                  className='textarea'
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
                type='button'
                onClick={() => setEditingTest(null)}
                className='btn btn-secondary'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleUpdateTest}
                className='btn btn-accent'
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
