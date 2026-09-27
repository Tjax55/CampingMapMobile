import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Site } from '../types'

type State = {
  sites: Site[]
  loading: boolean
  error: string | null
}

const COLUMNS = 'id, name, kind, description, source, source_ref, lat, lon'

/**
 * PostgREST caps a single response (Supabase defaults to 1000 rows). Without
 * explicit paging the map would silently show only the first page and look
 * fine, which is the worst kind of wrong.
 */
const PAGE_SIZE = 1000

async function fetchAllSites(): Promise<Site[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Copy .env.example to .env and fill it in.')
  }

  const all: Site[] = []

  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await supabase
      .from('sites_geojson')
      .select(COLUMNS)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)

    const batch = (data ?? []) as Site[]
    all.push(...batch)

    if (batch.length < PAGE_SIZE) return all
  }
}

/**
 * Loads every site once, on mount — same reasoning as the web app's
 * src/map/useSites.ts: campers have no cell service at BLM/NF sites, so the
 * whole dataset needs to be in memory rather than fetched per map-pan.
 */
export function useSites(): State {
  const [state, setState] = useState<State>({ sites: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetchAllSites()
      .then((sites) => {
        if (!cancelled) setState({ sites, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ sites: [], loading: false, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
