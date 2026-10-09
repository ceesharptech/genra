'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { isShareChannel } from '@/lib/share/urls';
import { track } from '@/lib/analytics';

interface ShareRefTrackerProps {
  creationId?: string;
}

export function ShareRefTracker({ creationId }: ShareRefTrackerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;

    const ref = searchParams.get('ref');
    if (ref && isShareChannel(ref)) {
      trackedRef.current = true;
      track('landing_from_share', {
        channel: ref,
        path: pathname,
        creationId,
      });
    }
  }, [searchParams, pathname, creationId]);

  return null;
}
