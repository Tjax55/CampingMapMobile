import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Whether the signed-in user is in the `admins` table — the only thing that
 * unlocks the admin review screen. Queries the table rather than checking a
 * hardcoded email so a second admin can be added later with no app change,
 * just a new row (see the RLS policy admins_select_own, which lets a user
 * check only their own membership, not list other admins).
 */
export function useIsAdmin(session: Session | null): boolean {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!supabase || !session) {
      // Resets admin status on sign-out — this can't be expressed as derived
      // render state since it also depends on the async query result below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false)
      return
    }
    let cancelled = false

    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(data != null)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  return isAdmin
}
