import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { BRAND } from '@/theme'
import type { SiteEditField, SiteEditProposal } from '@/types'

type Props = {
  field: SiteEditField
  currentValue: string
  /** What to show when not editing, if different from currentValue — e.g.
   * "No description yet." when currentValue is empty. Editing still starts
   * from the real (possibly empty) currentValue, not this placeholder text. */
  displayValue?: string
  placeholder: string
  pendingProposal: SiteEditProposal | null
  session: Session | null
  multiline?: boolean
  /** When set, long text is clamped to this many lines with a Show more /
   * Show less toggle (only shown if the text actually overflows). */
  collapsedLines?: number
  textStyle: TextStyle
  onPropose: (field: SiteEditField, value: string) => Promise<string | null>
}

/**
 * A site's name/description — "admin data" per
 * planning/decisions/2026-09-29-admin-review-for-capacity-and-site-edits.md
 * in the website repo. A signed-in user can suggest a new value, shown here
 * as visibly provisional (amber, italic) until an admin approves it through
 * the admin screen — nothing typed here ever writes to `sites` directly.
 */
export function SiteFieldEditor({
  field,
  currentValue,
  displayValue,
  placeholder,
  pendingProposal,
  session,
  multiline,
  collapsedLines,
  textStyle,
  onPropose,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(currentValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  async function handleSubmit() {
    if (!draft.trim()) return
    setSaving(true)
    setError(null)
    const result = await onPropose(field, draft.trim())
    setSaving(false)
    if (result) {
      setError(result)
      return
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <View style={styles.editBox}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={draft}
          onChangeText={setDraft}
          multiline={multiline}
          placeholder={placeholder}
          autoFocus
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.editActions}>
          <TouchableOpacity onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Submitting…' : 'Suggest edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const shownText = displayValue ?? currentValue

  return (
    <View>
      {collapsedLines ? (
        <>
          {/* Invisible, unclamped copy used only to count the real number of
              lines — a clamped Text doesn't reliably report that on both
              platforms, and "Show more" should only appear when needed. */}
          <Text
            style={[textStyle, styles.measurer]}
            onTextLayout={(e) => setOverflows(e.nativeEvent.lines.length > collapsedLines)}
          >
            {shownText}
          </Text>
          <Text style={textStyle} numberOfLines={expanded ? undefined : collapsedLines}>
            {shownText}
          </Text>
          {overflows && (
            <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
              <Text style={styles.suggestLink}>{expanded ? 'Show less' : 'Show more'}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <Text style={textStyle}>{shownText}</Text>
      )}

      {pendingProposal && (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingLabel}>Pending admin approval</Text>
          <Text style={styles.pendingValue}>{pendingProposal.proposed_value}</Text>
        </View>
      )}

      {session && !pendingProposal && (
        <TouchableOpacity
          onPress={() => {
            setDraft(currentValue)
            setEditing(true)
          }}
        >
          <Text style={styles.suggestLink}>Suggest edit ✎</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  measurer: { position: 'absolute', opacity: 0, left: 0, right: 0 },
  suggestLink: { fontSize: 11, color: BRAND.oxblood, fontWeight: '600', marginBottom: 4 },
  pendingBox: {
    marginBottom: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fbf3dc',
    borderWidth: 1,
    borderColor: BRAND.brass,
  },
  pendingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8a6d1f',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  pendingValue: { fontSize: 13, fontStyle: 'italic', color: '#6b5a24' },
  editBox: { marginBottom: 8, gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  error: { fontSize: 12, color: '#a33' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14 },
  cancelText: { fontSize: 13, color: '#8a978f', fontWeight: '600' },
  saveButton: { backgroundColor: BRAND.oxblood, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 14 },
  saveButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
})
