import { StyleSheet, Text, TextInput, View } from 'react-native'
import { BRAND } from '@/theme'
import type { CapacityEntry } from '@/types'

type Props = {
  entries: CapacityEntry[]
  loading: boolean
  error: string | null
  /** Whether the screen-wide "Suggest an edit" mode is on. */
  editing: boolean
  vehicleType: string
  count: string
  onChangeVehicleType: (value: string) => void
  onChangeCount: (value: string) => void
}

/** Web-app equivalent: src/sites/CapacitySection.tsx. The add form only
 * shows in edit mode; SiteDetailPanel owns the single submit button. */
export function CapacitySection({
  entries,
  loading,
  error,
  editing,
  vehicleType,
  count,
  onChangeVehicleType,
  onChangeCount,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Capacity</Text>

      {loading && <Text style={styles.muted}>Loading…</Text>}
      {error && <Text style={styles.error}>Couldn’t load capacity: {error}</Text>}
      {!loading && !error && entries.length === 0 && (
        <Text style={styles.muted}>No capacity reports yet.</Text>
      )}

      {entries.map((entry) => (
        <View key={entry.id} style={styles.entryRow}>
          <Text style={[styles.entry, entry.status !== 'approved' && styles.entryPending]}>
            {entry.count} × {entry.vehicle_type}
          </Text>
          {/* Only the submitter ever sees a non-approved entry at all — RLS
              hides other people's pending/rejected reports entirely — so this
              badge is always about "your" report, never someone else's. */}
          {entry.status === 'pending' && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending review</Text>
            </View>
          )}
          {entry.status === 'rejected' && (
            <View style={styles.rejectedBadge}>
              <Text style={styles.pendingBadgeText}>Not approved</Text>
            </View>
          )}
        </View>
      ))}

      {editing && (
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.fieldWide}>
              <Text style={styles.label}>Vehicle type</Text>
              <TextInput
                style={styles.input}
                value={vehicleType}
                onChangeText={onChangeVehicleType}
                maxLength={40}
                placeholder="RV, tent, car…"
              />
            </View>
            <View style={styles.fieldNarrow}>
              <Text style={styles.label}>Count</Text>
              <TextInput
                style={styles.input}
                value={count}
                onChangeText={onChangeCount}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>
        </View>
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
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  entry: { fontSize: 13, color: '#3f4f46', fontVariant: ['tabular-nums'] },
  entryPending: { fontStyle: 'italic', color: '#8a978f' },
  pendingBadge: {
    backgroundColor: BRAND.brass,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  rejectedBadge: {
    backgroundColor: '#e3b3ae',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  pendingBadgeText: { color: '#4a3b0e', fontSize: 10, fontWeight: '700' },
  form: { marginTop: 8, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  fieldWide: { flex: 1 },
  fieldNarrow: { width: 70 },
  label: { fontSize: 12, fontWeight: '600', color: '#3f4f46', marginBottom: 3 },
  input: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 13,
  },
})
