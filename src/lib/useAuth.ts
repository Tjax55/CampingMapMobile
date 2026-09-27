import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { GoogleSignin, isSuccessResponse, isErrorWithCode } from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID

/**
 * webClientId here is the SAME "Web application" Google Cloud OAuth client
 * already created for the website (camping_map) — not a new one. Native
 * Google Sign-In still needs a separate "Android" OAuth client registered in
 * Google Cloud (tied to this app's package name + signing certificate), but
 * that one is never referenced in code — Google's Play Services matches it
 * automatically by package name and signature. Only the web client ID goes
 * in code, because it's what tells Google which audience to issue the ID
 * token for, which is what Supabase then verifies against.
 */
if (webClientId) {
  GoogleSignin.configure({ webClientId })
}

type State = {
  session: Session | null
  loading: boolean
}

/**
 * Web-app equivalent: src/lib/useAuth.ts in camping_map. Same idea (a
 * verified Google identity becomes a Supabase session, gating write actions)
 * but a different mechanism — no OAuth redirect exists on a phone. The
 * native Google Sign-In SDK returns an ID token directly in-app, which
 * supabase.auth.signInWithIdToken exchanges for a session with no browser
 * hand-off at all.
 */
export function useAuth() {
  // `loading` starts false when Supabase isn't configured at all — there's
  // nothing to wait on — rather than setting it inside the effect below,
  // which would mean calling setState synchronously on every mount.
  const [state, setState] = useState<State>({ session: null, loading: Boolean(supabase) })

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle(): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.'
    if (!webClientId) return 'Google sign-in is not configured (missing web client ID).'

    try {
      await GoogleSignin.hasPlayServices()
      const response = await GoogleSignin.signIn()

      if (!isSuccessResponse(response) || !response.data.idToken) {
        return 'Google sign-in was cancelled.'
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.data.idToken,
      })

      return error?.message ?? null
    } catch (error) {
      if (isErrorWithCode(error)) return `Google sign-in failed: ${error.code}`
      return error instanceof Error ? error.message : String(error)
    }
  }

  async function signOut() {
    if (!supabase) return
    await GoogleSignin.signOut()
    await supabase.auth.signOut()
  }

  return { ...state, signInWithGoogle, signOut }
}

/** Google's profile fields land in user_metadata, not a fixed shape — same
 * as the web app's displayNameFor. */
export function displayNameFor(session: Session): string {
  const meta = session.user.user_metadata as { full_name?: string; name?: string }
  return meta.full_name || meta.name || session.user.email || 'Signed-in camper'
}
