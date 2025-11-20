import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_ROOT = process.cwd();

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function formatDuration(ms) {
  return (ms / 1000).toFixed(2);
}

export default class MarkdownReporter {
  constructor() {
    this.rootDir = DEFAULT_ROOT;
    this.runStartedAt = Date.now();
    this.testDetails = [];
  }

  onInit(vitest) {
    this.rootDir = vitest?.config?.root ?? DEFAULT_ROOT;
  }

  onTestRunStart() {
    this.runStartedAt = Date.now();
    this.testDetails = [];
  }

  async onTestRunEnd(testModules = [], unhandledErrors = [], reason = 'passed') {
    const finishedAt = Date.now();
    const durationMs = finishedAt - this.runStartedAt;

    const totals = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    const moduleSummaries = [];
    const failures = [];

    for (const testModule of testModules) {
      const modulePath = this.#toRelative(testModule.moduleId);
      let moduleTotals = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      };

      const tests = Array.from(testModule.children?.allTests?.() ?? []);
      const moduleTestDetails = [];
      for (const testCase of tests) {
        const result = testCase.result();
        moduleTotals.total += 1;
        totals.total += 1;

        const testDetail = {
          file: modulePath,
          name: testCase.fullName,
          state: result.state,
          duration: result.duration || 0,
          retry: result.retryCount || 0,
          errors: []
        };

        if (result.state === 'passed') {
          moduleTotals.passed += 1;
          totals.passed += 1;
        } else if (result.state === 'failed') {
          moduleTotals.failed += 1;
          totals.failed += 1;

          const errors = Array.from(result.errors ?? []);
          testDetail.errors = errors.map((error) => this.#formatError(error));
          failures.push({
            file: modulePath,
            name: testCase.fullName,
            messages: testDetail.errors,
            duration: testDetail.duration
          });
        } else if (result.state === 'skipped') {
          moduleTotals.skipped += 1;
          totals.skipped += 1;
        }

        moduleTestDetails.push(testDetail);
      }

      // Add test details for comprehensive report
      this.testDetails.push(...moduleTestDetails);

      moduleSummaries.push({
        file: modulePath,
        ...moduleTotals,
        duration: Math.round(testModule.diagnostic()?.duration ?? 0),
      });
    }

    for (const error of unhandledErrors) {
      failures.push({
        file: '(unhandled)',
        name: '',
        messages: [this.#formatError(error)],
      });
    }

    const timestamp = new Date();
    const timestampLabel = timestamp.toISOString();
    const docsDir = path.resolve(this.rootDir, 'docs');
    const reportPath = path.join(docsDir, 'test-report.md');

    const lines = [];
    lines.push(`# 🧪 ERP API Test Report`);
    lines.push('');
    lines.push(`## 📊 Test Run Summary`);
    lines.push('');
    lines.push(`- **Run timestamp**: ${timestampLabel}`);
    lines.push(`- **Duration**: ${formatDuration(durationMs)}s`);
    lines.push(`- **Result**: ${reason.toUpperCase()}`);
    lines.push(`- **Tests**: ${totals.total} total | ${totals.passed} passed | ${totals.failed} failed | ${totals.skipped} skipped`);
    lines.push(`- **Success Rate**: ${totals.total > 0 ? ((totals.passed / totals.total) * 100).toFixed(1) : 0}%`);
    lines.push('');

    if (moduleSummaries.length > 0) {
      lines.push(`## 📁 Module Summary`);
      lines.push('');
      lines.push(`| File | Passed | Failed | Skipped | Duration (ms) | Success Rate |`);
      lines.push(`| --- | ---: | ---: | ---: | ---: | ---: |`);
      for (const summary of moduleSummaries) {
        const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0.0';
        lines.push(
          `| ${summary.file} | ${summary.passed} | ${summary.failed} | ${summary.skipped} | ${summary.duration} | ${successRate}% |`,
        );
      }
      lines.push('');
    }

    // Detailed Test Results
    if (this.testDetails.length > 0) {
      lines.push(`## 🧪 Detailed Test Results`);
      lines.push('');

      // Group tests by file
      const testsByFile = {};
      for (const test of this.testDetails) {
        if (!testsByFile[test.file]) {
          testsByFile[test.file] = [];
        }
        testsByFile[test.file].push(test);
      }

      for (const [file, tests] of Object.entries(testsByFile)) {
        lines.push(`### ${file}`);
        lines.push('');
        lines.push(`| Test Name | Status | Duration (ms) | Retries |`);
        lines.push(`| --- | --- | ---: | ---: |`);

        // Sort tests by status (failed first) then by name
        tests.sort((a, b) => {
          if (a.state === 'failed' && b.state !== 'failed') return -1;
          if (a.state !== 'failed' && b.state === 'failed') return 1;
          return a.name.localeCompare(b.name);
        });

        for (const test of tests) {
          const statusIcon = test.state === 'passed' ? '✅' : test.state === 'failed' ? '❌' : '⏭️';
          const statusText = `${statusIcon} ${test.state}`;
          lines.push(`| ${test.name} | ${statusText} | ${test.duration.toFixed(0)} | ${test.retry} |`);
        }
        lines.push('');
      }
    }

    if (failures.length > 0) {
      lines.push(`## ❌ Failure Details`);
      lines.push('');
      for (const failure of failures) {
        lines.push(`### ${failure.name}`);
        lines.push(`**File**: \`${failure.file}\``);
        lines.push(`**Duration**: ${failure.duration.toFixed(0)}ms`);
        lines.push('');
        lines.push(`**Error Messages:**`);
        for (const message of failure.messages) {
          lines.push(`- ${message}`);
        }
        lines.push('');
      }
    } else {
      lines.push(`## 🎉 Failures`);
      lines.push('');
      lines.push(`- No failures! All tests passed! 🚀`);
      lines.push('');
    }

    // Performance Analysis
    if (this.testDetails.length > 0) {
      lines.push(`## ⚡ Performance Analysis`);
      lines.push('');

      const slowTests = this.testDetails
        .filter(t => t.duration > 1000)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

      if (slowTests.length > 0) {
        lines.push(`### Slowest Tests (>1s)`);
        lines.push('');
        lines.push(`| Test Name | Duration (ms) | File |`);
        lines.push(`| --- | ---: | --- |`);
        for (const test of slowTests) {
          lines.push(`| ${test.name} | ${test.duration.toFixed(0)} | ${test.file} |`);
        }
        lines.push('');
      }

      const avgDuration = this.testDetails.reduce((sum, t) => sum + t.duration, 0) / this.testDetails.length;
      lines.push(`- **Average Test Duration**: ${avgDuration.toFixed(0)}ms`);
      lines.push(`- **Total Test Time**: ${this.testDetails.reduce((sum, t) => sum + t.duration, 0).toFixed(0)}ms`);
      lines.push(`- **Slowest Test**: ${Math.max(...this.testDetails.map(t => t.duration)).toFixed(0)}ms`);
      lines.push(`- **Fastest Test**: ${Math.min(...this.testDetails.map(t => t.duration)).toFixed(0)}ms`);
      lines.push('');
    }

    const content = `${lines.join('\n')}\n`;

    await fs.mkdir(docsDir, { recursive: true });
    await fs.writeFile(reportPath, content, 'utf8');
  }

  #toRelative(moduleId) {
    if (!moduleId) {
      return '(unknown file)';
    }
    const relativePath = path.relative(this.rootDir, moduleId);
    return toPosix(relativePath || moduleId);
  }

  #formatError(error) {
    if (!error) {
      return 'Unknown error';
    }

    if (typeof error === 'string') {
      return error.trim();
    }

    if (error instanceof Error) {
      return error.message.trim() || error.stack?.split('\n')[0]?.trim() || 'Error without message';
    }

    if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message.trim();
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
