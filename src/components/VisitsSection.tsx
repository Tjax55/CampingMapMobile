import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { displayNameFor } from '@/lib/useAuth'
import { BRAND } from '@/theme'
import type { Visit, VisitInput } from '@/types'
import { DateField } from './DateField'

type Props = {
  visits: Visit[]
  loading: boolean
  error: string | null
  onAdd: (input: Omit<VisitInput, 'site_id'>) => Promise<string | null>
  onUpdate: (
    visitId: string,
    input: Pick<VisitInput, 'comment' | 'rating' | 'created_at'>,
  ) => Promise<string | null>
  session: Session | null
  isAdmin: boolean
}

// Five big stars for easy tapping; each star is worth 2 points because the
// database (and the website) store ratings as 1-10. A pre-existing odd rating
// (e.g. 7) lights the nearest star count and is only changed if tapped.
const STARS = [1, 2, 3, 4, 5]
const POINTS_PER_STAR = 2

function starsLit(rating: number | null): number {
  return rating == null ? 0 : Math.round(rating / POINTS_PER_STAR)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

type FormValues = { comment: string | null; rating: number | null; created_at?: string }

type FormProps = {
  title: string
  subtitle: string
  initialDate: Date
  initialRating: number | null
  initialComment: string
  onSave: (values: FormValues) => Promise<string | null>
  onCancel: () => void
}

function VisitForm({
  title,
  subtitle,
  initialDate,
  initialRating,
  initialComment,
  onSave,
  onCancel,
}: FormProps) {
  const [date, setDate] = useState(initialDate)
  const [rating, setRating] = useState<number | null>(initialRating)
  const [comment, setComment] = useState(initialComment)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setFormError(null)

    // Only the day is chosen; keep the original time of day so ordering
    // within a day stays sensible. Untouched dates are left out entirely so
    // the database default (new visit) or existing value (edit) stands.
    const dayChanged = !sameDay(date, initialDate)
    const created_at = dayChanged
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          initialDate.getHours(),
          initialDate.getMinutes(),
          initialDate.getSeconds(),
        ).toISOString()
      : undefined

    const result = await onSave({ comment: comment.trim() || null, rating, created_at })
    setSaving(false)
    if (result) setFormError(result)
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>

      <Text style={styles.label}>Date</Text>
      <DateField value={date} onChange={setDate} />

      <Text style={styles.label}>
        Rating (optional){rating != null ? ' — ' + rating + '/10' : ''}
      </Text>
      <View style={styles.starRow}>
        {STARS.map((n) => {
          const value = n * POINTS_PER_STAR
          return (
            <TouchableOpacity
              key={n}
              style={styles.starButton}
              onPress={() => setRating(rating === value ? null : value)}
              accessibilityLabel={n + (n === 1 ? ' star' : ' stars')}
            >
              <Text style={[styles.star, n <= starsLit(rating) && styles.starFilled]}>★</Text>
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

      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.submitButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/**
 * Web-app equivalent: src/sites/VisitsSection.tsx. One line per visit (date
 * and star rating). Tapping your own visit — or any visit, if you're an
 * admin — opens it for editing; tapping someone else's just expands it to
 * read the comment. "Add visit" opens the same form for a new visit.
 */
export function VisitsSection({ visits, loading, error, onAdd, onUpdate, session, isAdmin }: Props) {
  // null = showing the list; { visit: null } = new visit; { visit } = editing.
  const [editor, setEditor] = useState<{ visit: Visit | null } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function canEdit(visit: Visit): boolean {
    return session != null && (isAdmin || visit.user_id === session.user.id)
  }

  async function save(values: FormValues): Promise<string | null> {
    if (!session || !editor) return null
    const result = editor.visit
      ? await onUpdate(editor.visit.id, values)
      : await onAdd({
          username: displayNameFor(session),
          user_id: session.user.id,
          ...values,
        })
    if (!result) setEditor(null)
    return result
  }

  if (editor) {
    const editing = editor.visit
    const editingSomeoneElse = editing != null && session != null && editing.user_id !== session.user.id
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Visits</Text>
        <VisitForm
          // Remounts with fresh values whenever a different visit is opened.
          key={editing?.id ?? 'new'}
          title={editing ? 'Edit visit' : 'New visit'}
          subtitle={
            editing
              ? editingSomeoneElse
                ? `Editing ${editing.username}'s visit (admin)`
                : 'Editing your visit'
              : session
                ? `Posting as ${displayNameFor(session)}`
                : ''
          }
          initialDate={editing ? new Date(editing.created_at) : new Date()}
          initialRating={editing?.rating ?? null}
          initialComment={editing?.comment ?? ''}
          onSave={save}
          onCancel={() => setEditor(null)}
        />
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Visits</Text>

      {loading && <Text style={styles.muted}>Loading…</Text>}
      {error && <Text style={styles.error}>Couldn’t load visits: {error}</Text>}
      {!loading && !error && visits.length === 0 && (
        <Text style={styles.muted}>No visits logged yet — be the first.</Text>
      )}

      {visits.map((visit) => {
        const editable = canEdit(visit)
        const expanded = expandedId === visit.id
        return (
          <View key={visit.id}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => (editable ? setEditor({ visit }) : setExpandedId(expanded ? null : visit.id))}
            >
              <Text style={styles.rowDate}>{formatDate(visit.created_at)}</Text>
              <Text style={styles.rowStars}>
                {visit.rating == null
                  ? '—'
                  : STARS.map((n) => (
                      <Text key={n} style={n <= starsLit(visit.rating) ? styles.rowStarOn : styles.rowStarOff}>
                        ★
                      </Text>
                    ))}
              </Text>
              <Text style={styles.rowChevron}>{editable ? '✎' : expanded ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {expanded && !editable && (
              <View style={styles.expanded}>
                <Text style={styles.username}>{visit.username}</Text>
                <Text style={styles.comment}>{visit.comment || 'No comment.'}</Text>
              </View>
            )}
          </View>
        )
      })}

      {session && (
        <TouchableOpacity style={styles.addButton} onPress={() => setEditor({ visit: null })}>
          <Text style={styles.submitButtonText}>Add visit</Text>
        </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1ef',
  },
  rowDate: { flex: 1, fontSize: 14, color: '#1d2b23', fontWeight: '600' },
  rowStars: { fontSize: 16, letterSpacing: 1, marginRight: 10, color: '#8a978f' },
  rowStarOn: { color: BRAND.brass },
  rowStarOff: { color: '#d9dfdb' },
  rowChevron: { width: 20, textAlign: 'center', fontSize: 14, color: BRAND.oxblood },
  expanded: { paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#f4f6f5' },
  username: { fontWeight: '600', color: '#1d2b23', fontSize: 13 },
  comment: { marginTop: 3, fontSize: 13, color: '#3f4f46', lineHeight: 18 },
  addButton: {
    marginTop: 12,
    backgroundColor: BRAND.oxblood,
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center',
  },
  form: { gap: 6 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1d2b23' },
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
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 6 },
  cancelText: { fontSize: 13, color: '#8a978f', fontWeight: '600' },
  submitButton: {
    backgroundColor: BRAND.oxblood,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#b3c4ba' },
  submitButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
})
