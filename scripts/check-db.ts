import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient<Database>(url, anonKey)

async function check() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, sort_order')
    .order('sort_order')

  if (error) {
    console.error('Failed to read categories:', error)
    process.exit(1)
  }

  console.log(
    `Successfully fetched ${data.length} categories as anonymous user:`
  )
  for (const cat of data) {
    console.log(` - [${cat.sort_order}] ${cat.name} (${cat.slug})`)
  }
}

check()
