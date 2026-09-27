import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { displayNameFor } from '@/lib/useAuth'
import type { Visit, VisitInput } from '@/types'
import { SignInPrompt } from './SignInPrompt'

type Props = {
  visits: Visit[]
  loading: boolean
  error: string | null
  onAdd: (input: Omit<VisitInput, 'site_id'>) => Promise<string | null>
  session: Session | null
  onSignIn: () => void
}

const RATINGS = Array.from({ length: 10 }, (_, i) => i + 1)

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Web-app equivalent: src/sites/VisitsSection.tsx. */
export function VisitsSection({ visits, loading, error, onAdd, session, onSignIn }: Props) {
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!session) return
    setSaving(true)
    setFormError(null)

    const result = await onAdd({
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
    setComment('')
    setRating(null)
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
          <Text style={styles.muted}>Posting as {displayNameFor(session)}</Text>

          <Text style={styles.label}>Rating (optional)</Text>
          <View style={styles.ratingRow}>
            {RATINGS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.ratingPill, rating === n && styles.ratingPillActive]}
                onPress={() => setRating(rating === n ? null : n)}
              >
                <Text style={[styles.ratingPillText, rating === n && styles.ratingPillTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
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
            <Text style={styles.submitButtonText}>{saving ? 'Posting…' : 'Post visit'}</Text>
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
    backgroundColor: '#2f7a4d',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  ratingBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  timestamp: { marginLeft: 'auto', fontSize: 11, color: '#8a978f' },
  comment: { marginTop: 3, fontSize: 13, color: '#3f4f46', lineHeight: 18 },
  form: { marginTop: 8, gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#3f4f46', marginTop: 4 },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ratingPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#cfd8d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPillActive: { backgroundColor: '#2f7a4d', borderColor: '#2f7a4d' },
  ratingPillText: { fontSize: 12, color: '#1d2b23' },
  ratingPillTextActive: { color: '#ffffff', fontWeight: '700' },
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
    backgroundColor: '#2f7a4d',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#b3c4ba' },
  submitButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
})
