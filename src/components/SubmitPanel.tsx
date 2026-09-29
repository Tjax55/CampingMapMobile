import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { BRAND } from '@/theme'
import { SignInPrompt } from './SignInPrompt'
import { SITE_KINDS, KIND_LABELS, type SiteKind } from '@/types'

type Props = {
  onClose: () => void
}

/**
 * Web-app equivalent: src/sites/SubmitForm.tsx. Moved from a separate Expo
 * Router screen to an overlay for the same reason as SiteDetailPanel — see
 * that file's comment.
 *
 * Simplified for this first pass: coordinates are typed in directly rather
 * than picked by tapping the map. The web version's "pick on map" flow needs
 * the map and this panel to hand a location back and forth, which is real
 * cross-screen state this pass didn't build yet — flagged as a follow-up
 * rather than solved half-way.
 */
export function SubmitPanel({ onClose }: Props) {
  const { session, signInWithGoogle } = useAuth()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SiteKind>('urban_lot')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const parsedLat = Number(lat)
  const parsedLon = Number(lon)
  const hasValidCoords =
    lat.trim() !== '' &&
    lon.trim() !== '' &&
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLon)

  async function handleSubmit() {
    if (!supabase || !session || !hasValidCoords || !name.trim()) return

    setStatus('saving')
    setError(null)

    const { error: insertError } = await supabase.from('submissions').insert({
      name: name.trim(),
      kind,
      location: `POINT(${parsedLon} ${parsedLat})`,
      description: description.trim() || null,
      submitter_note: note.trim() || null,
      user_id: session.user.id,
    })

    if (insertError) {
      setStatus('error')
      setError(insertError.message)
      return
    }

    setStatus('done')
  }

  return (
    <View style={styles.panel}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {!session ? (
        <View style={styles.content}>
          <Text style={styles.panelTitle}>Add a spot</Text>
          <SignInPrompt message="Sign in to submit a spot for review." onSignIn={signInWithGoogle} />
        </View>
      ) : status === 'done' ? (
        <View style={styles.content}>
          <Text style={styles.doneTitle}>Thanks — it’s in the queue</Text>
          <Text style={styles.help}>
            Your spot is pending review. It won’t show on the map until someone checks it over, so
            you won’t see it right away.
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={onClose}>
            <Text style={styles.submitButtonText}>Back to map</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <Text style={styles.panelTitle}>Add a spot</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={120}
            placeholder="Walmart — Flagstaff, AZ"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.kindRow}>
            {SITE_KINDS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.kindPill, kind === option && styles.kindPillActive]}
                onPress={() => setKind(option)}
              >
                <Text style={[styles.kindPillText, kind === option && styles.kindPillTextActive]}>
                  {KIND_LABELS[option]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.coordsRow}>
            <View style={styles.coordsField}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={lat}
                onChangeText={setLat}
                keyboardType="numbers-and-punctuation"
                placeholder="36.09621"
              />
            </View>
            <View style={styles.coordsField}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={lon}
                onChangeText={setLon}
                keyboardType="numbers-and-punctuation"
                placeholder="-75.72051"
              />
            </View>
          </View>

          <Text style={styles.label}>What should campers know?</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={1000}
            placeholder="Quiet corner behind the garden centre. Manager is fine with overnight."
          />

          <Text style={styles.label}>Note for the reviewer (optional)</Text>
          <TextInput style={styles.input} value={note} onChangeText={setNote} maxLength={300} />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!hasValidCoords || !name.trim() || status === 'saving') &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!hasValidCoords || !name.trim() || status === 'saving'}
          >
            <Text style={styles.submitButtonText}>
              {status === 'saving' ? 'Sending…' : 'Submit for review'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.help}>Submissions are reviewed before they appear on the map.</Text>
        </KeyboardAwareScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 12,
    right: 12,
    bottom: 12,
    width: 320,
    maxWidth: '90%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  closeButtonText: { fontSize: 14, color: '#1d2b23' },
  content: { padding: 16, paddingTop: 20, paddingBottom: 32 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#1d2b23', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#3f4f46', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kindPill: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  kindPillActive: { backgroundColor: BRAND.brass, borderColor: BRAND.brass },
  kindPillText: { fontSize: 12, color: '#1d2b23' },
  kindPillTextActive: { color: '#1d2b23', fontWeight: '700' },
  coordsRow: { flexDirection: 'row', gap: 10 },
  coordsField: { flex: 1 },
  submitButton: {
    marginTop: 18,
    backgroundColor: BRAND.oxblood,
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#b3c4ba' },
  submitButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  help: { marginTop: 10, fontSize: 12, color: '#8a978f', lineHeight: 17 },
  error: { marginTop: 10, fontSize: 13, color: '#a33' },
  doneTitle: { fontSize: 18, fontWeight: '700', color: '#1d2b23', marginBottom: 8 },
})
