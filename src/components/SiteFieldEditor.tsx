import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle } from 'react-native'
import { BRAND } from '@/theme'
import type { SiteEditProposal } from '@/types'

type Props = {
  currentValue: string
  /** What to show when not editing, if different from currentValue — e.g.
   * "No description yet." when currentValue is empty. Editing still starts
   * from the real (possibly empty) currentValue, not this placeholder text. */
  displayValue?: string
  placeholder: string
  pendingProposal: SiteEditProposal | null
  /** Whether the screen-wide "Suggest an edit" mode is on. */
  editing: boolean
  draft: string
  onChangeDraft: (value: string) => void
  multiline?: boolean
  /** When set, long text is clamped to this many lines with a Show more /
   * Show less toggle (only shown if the text actually overflows). */
  collapsedLines?: number
  textStyle: TextStyle
}

/**
 * A site's name/description — "admin data" per
 * planning/decisions/2026-09-29-admin-review-for-capacity-and-site-edits.md
 * in the website repo. Controlled by SiteDetailPanel, which owns the single
 * "Suggest an edit" mode and submit button for name, description and
 * capacity together. A pending proposal is shown as visibly provisional
 * (amber, italic) until an admin approves it; nothing here writes to
 * `sites` directly. A field with a pending proposal can't be edited again.
 */
export function SiteFieldEditor({
  currentValue,
  displayValue,
  placeholder,
  pendingProposal,
  editing,
  draft,
  onChangeDraft,
  multiline,
  collapsedLines,
  textStyle,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  const shownText = displayValue ?? currentValue

  if (editing && !pendingProposal) {
    return (
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={draft}
        onChangeText={onChangeDraft}
        multiline={multiline}
        placeholder={placeholder}
      />
    )
  }

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
              <Text style={styles.moreLink}>{expanded ? 'Show less' : 'Show more'}</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  measurer: { position: 'absolute', opacity: 0, left: 0, right: 0 },
  moreLink: { fontSize: 11, color: BRAND.oxblood, fontWeight: '600', marginBottom: 4 },
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
  input: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
})
