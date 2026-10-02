import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { displayNameFor } from '@/lib/useAuth'
import { BRAND } from '@/theme'
import type { Visit, VisitInput } from '@/types'
import { SignInPrompt } from './SignInPrompt'

type Props = {
  visits: Visit[]
  loading: boolean
  error: string | null
  onAdd: (input: Omit<VisitInput, 'site_id'>) => Promise<string | null>
  onUpdate: (visitId: string, input: Pick<VisitInput, 'comment' | 'rating'>) => Promise<string | null>
  session: Session | null
  onSignIn: () => Promise<string | null>
}

// Five big stars for easy tapping; each star is worth 2 points because the
// database (and the website) store ratings as 1-10. A pre-existing odd rating
// (e.g. 7) lights the nearest star count and is only changed if tapped.
const STARS = [1, 2, 3, 4, 5]
const POINTS_PER_STAR = 2

// Reopening a site within this window offers to edit the same visit instead
// of posting a duplicate one — see the mobile session's "Save" vs "Post"
// feature and the admin-review-workflow decision record for why visits
// (unlike capacity reports) are editable at all.
const SAME_VISIT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Web-app equivalent: src/sites/VisitsSection.tsx. */
export function VisitsSection({ visits, loading, error, onAdd, onUpdate, session, onSignIn }: Props) {
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Captured once at mount rather than read fresh in the useMemo below —
  // Date.now() is an impure call, and the "is this within 2 days" check
  // doesn't need to be live-updating down to the millisecond anyway.
  const [now] = useState(() => Date.now())

  // `visits` is already newest-first (see useVisits' order), so the first
  // match here is this user's most recent visit to this site.
  const recentOwnVisit = useMemo(() => {
    if (!session) return null
    return (
      visits.find(
        (v) => v.user_id === session.user.id && now - new Date(v.created_at).getTime() < SAME_VISIT_WINDOW_MS,
      ) ?? null
    )
  }, [visits, session, now])

  // Pre-fills the form from the visit being edited. Keyed on the visit's id
  // rather than the object itself, so this only runs when which visit is
  // "the one to edit" actually changes — not on every reload (e.g. right
  // after saving), which would otherwise stomp on further edits in flight.
  useEffect(() => {
    if (recentOwnVisit) {
      // Same reasoning as useVisits' reload: this needs to run once when the
      // visit to edit becomes known, not be expressed as derived render state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComment(recentOwnVisit.comment ?? '')
      setRating(recentOwnVisit.rating)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentOwnVisit?.id])

  async function handleSubmit() {
    if (!session) return
    setSaving(true)
    setFormError(null)

    const result = recentOwnVisit
      ? await onUpdate(recentOwnVisit.id, { comment: comment.trim() || null, rating })
      : await onAdd({
          username: displayNameFor(session),
          comment: comment.trim() || null,
          rating,
          user_id: session.user.id,
        })

    setSaving(false)
    if (result) {
      setFormError(result)
      return
    }
    if (!recentOwnVisit) {
      setComment('')
      setRating(null)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Visits</Text>

      {loading && <Text style={styles.muted}>Loading…</Text>}
      {error && <Text style={styles.error}>Couldn’t load visits: {error}</Text>}
      {!loading && !error && visits.length === 0 && (
        <Text style={styles.muted}>No visits logged yet — be the first.</Text>
      )}

      {visits.map((visit) => (
        <View key={visit.id} style={styles.entry}>
          <View style={styles.entryHead}>
            <Text style={styles.username}>{visit.username}</Text>
            {visit.rating != null && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>{visit.rating}/10</Text>
              </View>
            )}
            <Text style={styles.timestamp}>{formatTimestamp(visit.created_at)}</Text>
          </View>
          {visit.comment && <Text style={styles.comment}>{visit.comment}</Text>}
        </View>
      ))}

      {session ? (
        <View style={styles.form}>
          <Text style={styles.muted}>
            {recentOwnVisit ? 'Editing your visit' : 'Posting as'} {displayNameFor(session)}
          </Text>

          <Text style={styles.label}>
            Rating (optional){rating != null ? ' — ' + rating + '/10' : ''}
          </Text>
          <View style={styles.starRow}>
            {STARS.map((n) => {
              const filled = rating != null && n <= Math.round(rating / POINTS_PER_STAR)
              const value = n * POINTS_PER_STAR
              return (
                <TouchableOpacity
                  key={n}
                  style={styles.starButton}
                  onPress={() => setRating(rating === value ? null : value)}
                  accessibilityLabel={n + (n === 1 ? ' star' : ' stars')}
                >
                  <Text style={[styles.star, filled && styles.starFilled]}>★</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.label}>Comment (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            maxLength={1000}
            placeholder="What did you see? Anything future campers should know?"
          />

          {formError && <Text style={styles.error}>{formError}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>
              {saving ? (recentOwnVisit ? 'Saving…' : 'Posting…') : recentOwnVisit ? 'Save' : 'Post visit'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SignInPrompt message="Sign in to post a visit." onSignIn={onSignIn} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8e4' },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7a70',
    marginBottom: 8,
  },
  muted: { fontSize: 13, color: '#8a978f', marginBottom: 6 },
  error: { fontSize: 13, color: '#a33', marginVertical: 4 },
  entry: { marginBottom: 10 },
  entryHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  username: { fontWeight: '600', color: '#1d2b23', fontSize: 13 },
  ratingBadge: {
    backgroundColor: BRAND.oxblood,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  ratingBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  timestamp: { marginLeft: 'auto', fontSize: 11, color: '#8a978f' },
  comment: { marginTop: 3, fontSize: 13, color: '#3f4f46', lineHeight: 18 },
  form: { marginTop: 8, gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#3f4f46', marginTop: 4 },
  starRow: { flexDirection: 'row' },
  starButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 40, color: '#d9dfdb' },
  starFilled: { color: BRAND.brass },
  textArea: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 4,
    backgroundColor: BRAND.oxblood,
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#b3c4ba' },
  submitButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
})
