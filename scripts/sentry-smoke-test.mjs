import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as Sentry from '@sentry/node';

// Load .env.local if not already injected
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const org = process.env.SENTRY_ORG || 'ceesharp-technologies';

if (!dsn) {
  console.error(
    '[Sentry Smoke Test Error] NEXT_PUBLIC_SENTRY_DSN is missing in environment.'
  );
  process.exit(1);
}

const runId = crypto.randomUUID();

Sentry.init({
  dsn,
  environment: 'smoke-test',
  tracesSampleRate: 1.0,
});

if (typeof Sentry.getCurrentScope === 'function') {
  Sentry.getCurrentScope().setTag('smoke_test', 'true');
  Sentry.getCurrentScope().setTag('run_id', runId);
}

console.log(`Starting Sentry smoke test (Run ID: ${runId})...`);

const messageEventId = Sentry.captureMessage(
  `Genra Sentry Smoke Test Message [${runId}]`,
  {
    level: 'info',
    tags: { smoke_test: 'true', run_id: runId },
  }
);

const errorEventId = Sentry.captureException(
  new Error(`Genra Sentry Smoke Test Exception [${runId}]`),
  {
    tags: { smoke_test: 'true', run_id: runId },
  }
);

console.log(`Dispatched message event ID: ${messageEventId}`);
console.log(`Dispatched exception event ID: ${errorEventId}`);

const flushed = await Sentry.flush(10000);

if (!flushed) {
  console.error('[Sentry Smoke Test Error] Sentry flush timed out after 10000ms.');
  process.exit(1);
}

const searchUrl = `https://sentry.io/organizations/${org}/issues/?query=smoke_test%3Atrue`;
console.log('\n--- Sentry Smoke Test Success ---');
console.log(`Run ID: ${runId}`);
console.log(`Message Event ID: ${messageEventId}`);
console.log(`Exception Event ID: ${errorEventId}`);
console.log(`Search Issues URL: ${searchUrl}\n`);
