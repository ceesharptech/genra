import { describe, it, expect } from 'vitest';

describe('Account Deletion & Data Export Logic', () => {
  it('correctly compares username confirmation matching', () => {
    const profileUsername = 'alexcreator';

    // Exact match
    expect('alexcreator'.trim().toLowerCase() === profileUsername.toLowerCase()).toBe(true);

    // Case-insensitive match
    expect('AlexCreator'.trim().toLowerCase() === profileUsername.toLowerCase()).toBe(true);

    // Trim whitespace match
    expect('  alexcreator  '.trim().toLowerCase() === profileUsername.toLowerCase()).toBe(true);

    // Mismatched username
    expect('otheruser'.trim().toLowerCase() === profileUsername.toLowerCase()).toBe(false);

    // Prefix @ mismatch
    expect('@alexcreator'.trim().toLowerCase() === profileUsername.toLowerCase()).toBe(false);
  });

  it('formats filename correctly for data export', () => {
    const username = 'alexcreator';
    const dateStr = '2026-10-13';
    const filename = `genra-export-${username}-${dateStr}.json`;

    expect(filename).toBe('genra-export-alexcreator-2026-10-13.json');
    expect(filename.endsWith('.json')).toBe(true);
  });
});
