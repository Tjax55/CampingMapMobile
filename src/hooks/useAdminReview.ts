import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PendingCapacityReport, PendingSiteEditProposal, SiteEditField } from '../types'

type State = {
  capacityReports: PendingCapacityReport[]
  editProposals: PendingSiteEditProposal[]
  loading: boolean
  error: string | null
}

type CapacityRow = {
  id: string
  site_id: string
  vehicle_type: string
  count: number
  created_at: string
  sites: { name: string } | null
}

type ProposalRow = {
  id: string
  site_id: string
  field: SiteEditField
  proposed_value: string
  created_at: string
  sites: { name: string; description: string | null } | null
}

async function fetchPending(): Promise<{
  capacityReports: PendingCapacityReport[]
  editProposals: PendingSiteEditProposal[]
}> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const [capacityResult, proposalResult] = await Promise.all([
    supabase
      .from('site_capacity')
      .select('id, site_id, vehicle_type, count, created_at, sites(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('site_edit_proposals')
      .select('id, site_id, field, proposed_value, created_at, sites(name, description)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  if (capacityResult.error) throw new Error(capacityResult.error.message)
  if (proposalResult.error) throw new Error(proposalResult.error.message)

  const capacityReports = ((capacityResult.data ?? []) as unknown as CapacityRow[]).map((row) => ({
    id: row.id,
    site_id: row.site_id,
    site_name: row.sites?.name ?? 'Unknown site',
    vehicle_type: row.vehicle_type,
    count: row.count,
    created_at: row.created_at,
  }))

  const editProposals = ((proposalResult.data ?? []) as unknown as ProposalRow[]).map((row) => ({
    id: row.id,
    site_id: row.site_id,
    site_name: row.sites?.name ?? 'Unknown site',
    field: row.field,
    current_value: row.field === 'name' ? (row.sites?.name ?? null) : (row.sites?.description ?? null),
    proposed_value: row.proposed_value,
    created_at: row.created_at,
  }))

  return { capacityReports, editProposals }
}

/**
 * Everything waiting on the sole admin's review — pending capacity reports
 * and pending site name/description edit proposals. Backs the admin screen;
 * only reachable at all by an account in `admins` (see useIsAdmin), since
 * the underlying RLS policies (site_capacity_admin_read/update,
 * site_edit_proposals_admin_update, sites_admin_update) only grant an admin
 * account the access these actions need.
 */
export function useAdminReview() {
  const [state, setState] = useState<State>({
    capacityReports: [],
    editProposals: [],
    loading: true,
    error: null,
  })

  const reload = useCallback(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true }))

    fetchPending()
      .then(({ capacityReports, editProposals }) => {
        if (!cancelled) setState({ capacityReports, editProposals, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState((current) => ({ ...current, loading: false, error: message }))
      })

    return () => {
      cancelled = true
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => reload(), [reload])

  async function reviewCapacity(id: string, decision: 'approved' | 'rejected'): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.'
    const { error } = await supabase.from('site_capacity').update({ status: decision }).eq('id', id)
    if (error) return error.message
    reload()
    return null
  }

  /**
   * Approving copies `value` into the site's `field` column, then marks the
   * proposal approved. Two writes, not a trigger — matches how the rest of
   * this schema handles cross-table effects (see the website repo's
   * supabase/schema.sql comments). `value` defaults to the proposed value
   * but the admin screen lets it be tweaked first (typo fixes, etc.).
   */
  async function reviewProposal(
    proposal: PendingSiteEditProposal,
    decision: 'approved' | 'rejected',
    value: string,
    reviewerId: string,
  ): Promise<string | null> {
    if (!supabase) return 'Supabase is not configured.'

    if (decision === 'approved') {
      const { error: siteError } = await supabase
        .from('sites')
        .update({ [proposal.field]: value })
        .eq('id', proposal.site_id)
      if (siteError) return siteError.message
    }

    const { error } = await supabase
      .from('site_edit_proposals')
      .update({ status: decision, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq('id', proposal.id)
    if (error) return error.message

    reload()
    return null
  }

  return { ...state, reviewCapacity, reviewProposal }
}
