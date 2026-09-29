import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SiteEditField, SiteEditProposal } from '../types'

type State = {
  proposals: SiteEditProposal[]
  loading: boolean
  error: string | null
}

const COLUMNS = 'id, site_id, field, proposed_value, proposed_by, status, created_at'

async function fetchProposals(siteId: string): Promise<SiteEditProposal[]> {
  if (!supabase) throw new Error('Supabase is not configured.')

  // Only ever returns pending rows — site_edit_proposals_public_read only
  // allows reading status = 'pending' (an approved one's value already
  // lives in `sites`, a rejected one shows to no one). See supabase/schema.sql
  // in the website repo.
  const { data, error } = await supabase
    .from('site_edit_proposals')
    .select(COLUMNS)
    .eq('site_id', siteId)

  if (error) throw new Error(error.message)
  return (data ?? []) as SiteEditProposal[]
}

/**
 * Pending name/description edit proposals for one site — the "admin data"
 * counterpart to useVisits/useCapacity's "user data". A proposal never
 * changes `sites` directly; an admin approving it (via the admin screen)
 * is what actually copies proposed_value across.
 */
export function useSiteEditProposals(siteId: string) {
  const [state, setState] = useState<State>({ proposals: [], loading: true, error: null })

  const reload = useCallback(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true }))

    fetchProposals(siteId)
      .then((proposals) => {
        if (!cancelled) setState({ proposals, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ proposals: [], loading: false, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [siteId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => reload(), [reload])

  async function propose(
    field: SiteEditField,
    proposedValue: string,
    userId: string,
  ): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.'
    const { error } = await supabase
      .from('site_edit_proposals')
      .insert({ site_id: siteId, field, proposed_value: proposedValue, proposed_by: userId })
    if (error) return error.message
    reload()
    return null
  }

  return { ...state, propose }
}
