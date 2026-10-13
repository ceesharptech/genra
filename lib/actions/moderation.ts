'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createReportSchema,
  type CreateReportInput,
} from '@/lib/validation/moderation';

export interface ReportActionResult {
  success: boolean;
  duplicate?: boolean;
  error?: string;
}

export async function submitReportAction(
  rawInput: CreateReportInput
): Promise<ReportActionResult> {
  const validated = createReportSchema.safeParse(rawInput);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || 'Invalid report data',
    };
  }

  const user = await requireUser();

  const rateCheck = await checkRateLimit('report', user.id);
  if (!rateCheck.success) {
    return {
      success: false,
      error: 'You have reached the report limit (10 per hour). Please try again later.',
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: validated.data.targetType,
    target_id: validated.data.targetId,
    reason: validated.data.reason,
    details: validated.data.details || null,
  });

  if (error) {
    // Unique violation error code in PostgreSQL (idx_reports_open_target)
    if (error.code === '23505' || error.message?.includes('idx_reports_open_target')) {
      return {
        success: false,
        duplicate: true,
        error: 'You have already submitted an open report for this item. It is currently pending review.',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to submit report. Please try again.',
    };
  }

  return { success: true };
}
