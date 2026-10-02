/** Mirrors the `site_kind` enum in supabase/schema.sql. */
export const SITE_KINDS = [
  'blm',
  'national_forest',
  'other_public',
  'urban_lot',
] as const

export type SiteKind = (typeof SITE_KINDS)[number]

/** Mirrors the `site_source` enum in supabase/schema.sql. */
export type SiteSource = 'ridb' | 'osm' | 'blm' | 'user' | 'cracker_barrel' | 'walmart' | 'truck_stop'

export type Site = {
  id: string
  name: string
  kind: SiteKind
  lat: number
  lon: number
  description: string | null
  source: SiteSource
  source_ref: string | null
}

/** `user_id` is required on every new row as of login-gated data entry — see
 * planning/decisions/2026-09-23-require-login-for-data-entry.md. The RLS
 * insert policies reject anything where it doesn't match the caller's own
 * auth.uid(), so this isn't optional in practice even though the column
 * allows null for rows written before login existed. */
export type SubmissionInput = {
  name: string
  kind: SiteKind
  lat: number
  lon: number
  description: string | null
  submitter_note: string | null
  user_id: string
}

/**
 * Mirrors the `visits` table. A guestbook entry: a name, an optional
 * comment, and an optional 1-10 rating — see supabase/schema.sql.
 *
 * "User data" in the user-data/admin-data split (see
 * planning/decisions/2026-09-29-admin-review-for-capacity-and-site-edits.md
 * in the website repo) — the poster owns it and can edit it directly
 * (`visits_update_own`), no admin review, unlike CapacityEntry below.
 */
export type Visit = {
  id: string
  site_id: string
  username: string
  comment: string | null
  rating: number | null
  created_at: string
  user_id: string | null
}

export type VisitInput = {
  site_id: string
  username: string
  comment: string | null
  rating: number | null
  user_id: string
  /** Optional — omitted means the database default (now). Set when the poster
   * picks a different day for a visit. */
  created_at?: string
}

/** A pending or resolved review state for a piece of "admin data" — see
 * ReviewStatus. Mirrors the `submission_status` Postgres enum. */
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

/**
 * Mirrors the `site_capacity` table. `vehicle_type` is free text — see the
 * comment on the table in supabase/schema.sql for why.
 *
 * "Admin data" as of the migration referenced on Visit above: a new report
 * defaults to `status: 'pending'` and isn't publicly visible until an admin
 * approves it. A submitter can still see their own pending/rejected report
 * (site_capacity_read_own), which is the only way a non-approved status
 * value reaches the app at all.
 */
export type CapacityEntry = {
  id: string
  site_id: string
  vehicle_type: string
  count: number
  created_at: string
  user_id: string | null
  status: ReviewStatus
}

export type CapacityInput = {
  site_id: string
  vehicle_type: string
  count: number
  user_id: string
}

/**
 * Mirrors the `site_edit_proposals` table — a user-suggested new value for
 * an existing site's name or description, the other kind of admin data.
 * Only ever fetched with `status: 'pending'` (see site_edit_proposals_public_read),
 * since an approved proposal's value has already been copied into `sites`
 * and a rejected one isn't shown to anyone.
 */
export type SiteEditField = 'name' | 'description'

export type SiteEditProposal = {
  id: string
  site_id: string
  field: SiteEditField
  proposed_value: string
  proposed_by: string | null
  status: ReviewStatus
  created_at: string
}

/** A pending capacity report joined with its site's name, for the admin
 * review screen — the raw CapacityEntry doesn't carry the site name. */
export type PendingCapacityReport = {
  id: string
  site_id: string
  site_name: string
  vehicle_type: string
  count: number
  created_at: string
}

/** A pending site edit proposal joined with its site's name and the field's
 * current (live) value, so the admin screen can show a before/after. */
export type PendingSiteEditProposal = {
  id: string
  site_id: string
  site_name: string
  field: SiteEditField
  current_value: string | null
  proposed_value: string
  created_at: string
}

export const KIND_LABELS: Record<SiteKind, string> = {
  blm: 'BLM',
  national_forest: 'National Forest',
  other_public: 'Other public land',
  urban_lot: 'Urban parking',
}

/**
 * Pin colors. Kept here rather than in CSS because MapLibre needs them as literal
 * values inside a data-driven style expression, not as class names.
 */
export const KIND_COLORS: Record<SiteKind, string> = {
  blm: '#c2703d',
  national_forest: '#2f7a4d',
  other_public: '#3d6fc2',
  urban_lot: '#8a4fbd',
}

/**
 * Filter-panel granularity: `urban_lot` splits into one row per source, so
 * the filter isn't one lumped "Urban parking" checkbox for Cracker Barrel,
 * Walmart, truck stops and user submissions alike. Everything else maps 1:1
 * to its SiteKind.
 *
 * Presentation-only — the database, SubmissionInput and the map's pin icons
 * still only know about SiteKind. A user-submitted site is still `urban_lot`
 * regardless of which of these categories it lands in once approved.
 */
export const FILTER_CATEGORIES = [
  'blm',
  'national_forest',
  'other_public',
  'cracker_barrel',
  'walmart',
  'truck_stop',
  'user_submitted',
] as const

export type FilterCategory = (typeof FILTER_CATEGORIES)[number]

export function categoryOf(site: Pick<Site, 'kind' | 'source'>): FilterCategory {
  if (site.kind !== 'urban_lot') return site.kind
  if (site.source === 'cracker_barrel') return 'cracker_barrel'
  if (site.source === 'walmart') return 'walmart'
  if (site.source === 'truck_stop') return 'truck_stop'
  return 'user_submitted'
}

export const CATEGORY_LABELS: Record<FilterCategory, string> = {
  blm: 'BLM',
  national_forest: 'National Forest',
  other_public: 'Other public land',
  cracker_barrel: 'Cracker Barrel',
  walmart: 'Walmart',
  truck_stop: 'Truck stop',
  user_submitted: 'User submitted',
}

/**
 * The four urban_lot sub-categories share one pin color — splitting the
 * checkbox doesn't change how they render on the map. Deriving from
 * KIND_COLORS.urban_lot rather than repeating the hex keeps that explicit
 * instead of silently drifting if one gets restyled later.
 */
export const CATEGORY_COLORS: Record<FilterCategory, string> = {
  blm: KIND_COLORS.blm,
  national_forest: KIND_COLORS.national_forest,
  other_public: KIND_COLORS.other_public,
  cracker_barrel: KIND_COLORS.urban_lot,
  walmart: KIND_COLORS.urban_lot,
  truck_stop: KIND_COLORS.urban_lot,
  user_submitted: KIND_COLORS.urban_lot,
}
