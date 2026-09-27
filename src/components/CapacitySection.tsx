import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import type { CapacityEntry, CapacityInput } from '@/types'
import { SignInPrompt } from './SignInPrompt'

type Props = {
  entries: CapacityEntry[]
  loading: boolean
  error: string | null
  onAdd: (input: Omit<CapacityInput, 'site_id'>) => Promise<string | null>
  session: Session | null
  onSignIn: () => void
}

/** Web-app equivalent: src/sites/CapacitySection.tsx. */
export function CapacitySection({ entries, loading, error, onAdd, session, onSignIn }: Props) {
  const [vehicleType, setVehicleType] = useState('')
  const [count, setCount] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const parsedCount = Number(count)
  const canSubmit = vehicleType.trim() !== '' && Number.isFinite(parsedCount) && parsedCount > 0

  async function handleSubmit() {
    if (!canSubmit || !session) return
    setSaving(true)
    setFormError(null)

    const result = await onAdd({
      vehicle_type: vehicleType.trim(),
      count: parsedCount,
      user_id: session.user.id,
    })

    setSaving(false)
    if (result) {
      setFormError(result)
      return
    }
    setVehicleType('')
    setCount('')
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Capacity</Text>

      {loading && <Text style={styles.muted}>Loading…</Text>}
      {error && <Text style={styles.error}>Couldn’t load capacity: {error}</Text>}
      {!loading && !error && entries.length === 0 && (
        <Text style={styles.muted}>No capacity reports yet.</Text>
      )}

      {entries.map((entry) => (
        <Text key={entry.id} style={styles.entry}>
          {entry.count} × {entry.vehicle_type}
        </Text>
      ))}

      {session ? (
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.fieldWide}>
              <Text style={styles.label}>Vehicle type</Text>
              <TextInput
                style={styles.input}
                value={vehicleType}
                onChangeText={setVehicleType}
                maxLength={40}
                placeholder="RV, tent, car…"
              />
            </View>
            <View style={styles.fieldNarrow}>
              <Text style={styles.label}>Count</Text>
              <TextInput
                style={styles.input}
                value={count}
                onChangeText={setCount}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          {formError && <Text style={styles.error}>{formError}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, (!canSubmit || saving) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
          >
            <Text style={styles.submitButtonText}>{saving ? 'Adding…' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SignInPrompt message="Sign in to add a capacity report." onSignIn={onSignIn} />
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
  entry: { fontSize: 13, color: '#3f4f46', marginBottom: 4, fontVariant: ['tabular-nums'] },
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
  submitButton: {
    backgroundColor: '#2f7a4d',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#b3c4ba' },
  submitButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
})
