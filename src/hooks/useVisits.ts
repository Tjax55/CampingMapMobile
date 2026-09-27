import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Visit, VisitInput } from '../types'

type State = {
  visits: Visit[]
  loading: boolean
  error: string | null
}

const COLUMNS = 'id, site_id, username, comment, rating, created_at'

async function fetchVisits(siteId: string): Promise<Visit[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('visits')
    .select(COLUMNS)
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Visit[]
}

/**
 * Loads and posts visits for one site. Same shape as the web app's
 * src/sites/useVisits.ts — fetched lazily per site rather than bundled into
 * useSites, since visits are only needed once a site's detail screen is open.
 */
export function useVisits(siteId: string) {
  const [state, setState] = useState<State>({ visits: [], loading: true, error: null })

  const reload = useCallback(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true }))

    fetchVisits(siteId)
      .then((visits) => {
        if (!cancelled) setState({ visits, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ visits: [], loading: false, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [siteId])

  // `reload` sets `loading: true` synchronously before its fetch — needed so
  // a siteId change (or a manual reload from addVisit) shows "Loading…"
  // rather than stale data. That's the same fetch-on-mount shape as the web
  // app's identical hook; this lint rule doesn't run there.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => reload(), [reload])

  async function addVisit(input: Omit<VisitInput, 'site_id'>): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.'
    const { error } = await supabase.from('visits').insert({ ...input, site_id: siteId })
    if (error) return error.message
    reload()
    return null
  }

  return { ...state, addVisit }
}
