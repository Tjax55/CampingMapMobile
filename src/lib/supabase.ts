import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Null when the env vars are missing — same reasoning as the web app's
 * src/lib/supabase.ts: fail loudly at the call site, not by white-screening
 * the whole app before it can even render a "you forgot to set up .env" message.
 *
 * Two things the web client didn't need:
 * - `storage: AsyncStorage` — there's no browser localStorage here; without
 *   this, supabase-js falls back to an in-memory store and every app restart
 *   signs you out.
 * - `detectSessionInUrl: false` — that option is for parsing an OAuth
 *   redirect out of the browser's URL bar, which doesn't exist on a phone.
 *   Sign-in here goes through @react-native-google-signin's native flow and
 *   supabase.auth.signInWithIdToken, never a redirect URL.
 */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null
