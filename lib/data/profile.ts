import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Cached profile loader by username.
 * Deduplicated per request cycle so generateMetadata and page components
 * share a single database round trip.
 */
export const getProfileByUsername = cache(
  async (username: string): Promise<ProfileRow | null> => {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    return profile;
  }
);
