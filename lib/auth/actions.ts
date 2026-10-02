'use server'

import { createClient } from '@/lib/supabase/server'
import { actionError, actionSuccess, type ActionResult } from './types'

export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return actionError(error.message)
  }

  return actionSuccess()
}
