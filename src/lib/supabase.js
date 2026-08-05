import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://ukzhcimbdxzqzgbzhadk.supabase.co'
const fallbackKey = 'sb_publishable_cvGQp5e9HfaZyyH6sMJLBw_915jrwx5'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackKey
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
