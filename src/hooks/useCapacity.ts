import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CapacityEntry, CapacityInput } from '../types'

type State = {
  entries: CapacityEntry[]
  loading: boolean
  error: string | null
}

const COLUMNS = 'id, site_id, vehicle_type, count, created_at'

async function fetchCapacity(siteId: string): Promise<CapacityEntry[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('site_capacity')
    .select(COLUMNS)
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as CapacityEntry[]
}

/** Same lazy, per-site loading shape as useVisits — see its comment. */
export function useCapacity(siteId: string) {
  const [state, setState] = useState<State>({ entries: [], loading: true, error: null })

  const reload = useCallback(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true }))

    fetchCapacity(siteId)
      .then((entries) => {
        if (!cancelled) setState({ entries, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ entries: [], loading: false, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [siteId])

  // Same reasoning as useVisits' equivalent line: `reload` needs to reset
  // `loading` synchronously so a siteId change or a post-mutation refetch
  // shows "Loading…" instead of stale data.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => reload(), [reload])

  async function addEntry(input: Omit<CapacityInput, 'site_id'>): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.'
    const { error } = await supabase.from('site_capacity').insert({ ...input, site_id: siteId })
    if (error) return error.message
    reload()
    return null
  }

  return { ...state, addEntry }
}
