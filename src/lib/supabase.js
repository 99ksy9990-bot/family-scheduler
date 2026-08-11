import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
export const supabasePublishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
export const supabaseEnabled = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
