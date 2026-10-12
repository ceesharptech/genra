#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_PUBLIC_VARS = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_EMAIL_AUTH_MODE',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_DEBUG',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DEBUG',
  'NEXT_PUBLIC_VERCEL_ENV',
  'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA',
]);

const FORBIDDEN_SUBSTRINGS = [
  'SERVICE_ROLE',
  'SECRET',
  'PRIVATE_KEY',
  'REDIS_REST_TOKEN',
  'PASSWORD',
];

let errors = [];

// 1. Check process.env in current environment
for (const key of Object.keys(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_') && !ALLOWED_PUBLIC_VARS.has(key)) {
    errors.push(
      `Disallowed NEXT_PUBLIC_ variable found in environment: "${key}"`
    );
  }
}

// 2. Check all .env files in repository root
const envFiles = ['.env', '.env.local', '.env.example', '.env.production', '.env.development'];
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z0-9_]+)=/);
      if (match) {
        const varName = match[1];
        if (varName.startsWith('NEXT_PUBLIC_') && !ALLOWED_PUBLIC_VARS.has(varName)) {
          errors.push(
            `Unauthorized NEXT_PUBLIC_ variable "${varName}" defined in ${file}:${i + 1}`
          );
        }
        for (const forbidden of FORBIDDEN_SUBSTRINGS) {
          if (varName.includes(forbidden) && varName.startsWith('NEXT_PUBLIC_')) {
            errors.push(
              `DANGEROUS: Sensitive term "${forbidden}" found in public variable "${varName}" in ${file}:${i + 1}`
            );
          }
        }
      }
    }
  }
}

// 3. Scan code references in app, components, lib
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const matches = code.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Za-z0-9_]+)/g);
      for (const m of matches) {
        const varName = m[1];
        if (!ALLOWED_PUBLIC_VARS.has(varName)) {
          errors.push(
            `Code references unauthorized public env var "${varName}" in ${fullPath}`
          );
        }
      }
    }
  }
}

scanDir('app');
scanDir('components');
scanDir('lib');

if (errors.length > 0) {
  console.error('\n❌ Environment Security Check FAILED:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  console.error(
    '\nOnly strictly allowlisted variables are permitted with NEXT_PUBLIC_ prefix. See docs/ENVIRONMENTS.md\n'
  );
  process.exit(1);
} else {
  console.log('✅ Environment security check passed: All public variables comply with security policy.');
  process.exit(0);
}
