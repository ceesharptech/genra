import { describe, expect, it } from 'vitest';
import { getEngagementState } from '@/lib/data/engagement';

describe('getEngagementState', () => {
  it('returns empty liked and saved arrays immediately for signed out users without DB queries', async () => {
    // When userId is undefined
    const resUndefined = await getEngagementState('creation', ['c1', 'c2'], undefined);
    expect(resUndefined).toEqual({ likedIds: [], savedIds: [] });

    // When userId is null
    const resNull = await getEngagementState('creation', ['c1', 'c2'], null);
    expect(resNull).toEqual({ likedIds: [], savedIds: [] });

    // When targetIds array is empty
    const resEmpty = await getEngagementState('creation', [], 'user-123');
    expect(resEmpty).toEqual({ likedIds: [], savedIds: [] });
  });
});
