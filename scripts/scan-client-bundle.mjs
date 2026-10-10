#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const BUNDLE_DIR = path.join('.next', 'static');

let violations = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check 1: Private key blocks
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) {
    violations.push({
      file: filePath,
      reason: 'Contains private key block',
    });
  }

  // Check 2: Supabase Service Role JWT detection
  const jwtRegex = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
  let match;
  while ((match = jwtRegex.exec(content)) !== null) {
    const token = match[0];
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        if (payload.role === 'service_role') {
          violations.push({
            file: filePath,
            reason: 'Contains Supabase service_role JWT token!',
          });
        }
      }
    } catch {
      // not a json payload
    }
  }

  // Check 3: Sentry Auth Token prefix
  if (/sntrys_[a-zA-Z0-9_]{30,}/.test(content)) {
    violations.push({
      file: filePath,
      reason: 'Contains Sentry auth token (sntrys_...)',
    });
  }

  // Check 4: Upstash token leak heuristics
  if (/UPSTASH_REDIS_REST_TOKEN/.test(content)) {
    violations.push({
      file: filePath,
      reason: 'References UPSTASH_REDIS_REST_TOKEN in client bundle',
    });
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(js|css|json)$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

if (!fs.existsSync(BUNDLE_DIR)) {
  console.log(
    'ℹ️  No .next/static bundle found. Skipping bundle scan (run `next build` first).'
  );
  process.exit(0);
}

scanDir(BUNDLE_DIR);

if (violations.length > 0) {
  console.error('\n❌ Client Bundle Leak Scan FAILED:\n');
  for (const v of violations) {
    console.error(`  - [${v.file}] ${v.reason}`);
  }
  process.exit(1);
} else {
  console.log('✅ Client bundle scan passed: No secrets detected in client bundle.');
  process.exit(0);
}
