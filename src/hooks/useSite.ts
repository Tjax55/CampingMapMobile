import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Site } from '../types'

type State = {
  site: Site | null
  loading: boolean
  error: string | null
}

const COLUMNS = 'id, name, kind, description, source, source_ref, lat, lon, services'

/**
 * Fetches one site by id, for the detail screen. The map screen doesn't keep
 * its full site list anywhere a detail screen (a separate route, not an
 * overlay like the web app's sidebar) could read it back from without
 * introducing shared state — a single-row fetch is simpler than that for now.
 */
export function useSite(id: string): State {
  const [state, setState] = useState<State>({
    site: null,
    // Same reasoning as useAuth: compute the "nothing to wait on" state up
    // front rather than setting it synchronously inside the effect.
    loading: Boolean(supabase),
    error: supabase ? null : 'Supabase is not configured.',
  })

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    supabase
      .from('sites_geojson')
      .select(COLUMNS)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setState({ site: null, loading: false, error: error.message })
        else setState({ site: data as Site, loading: false, error: null })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return state
}
