import { useMemo, useState } from 'react'
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useSite } from '@/hooks/useSite'
import { useVisits } from '@/hooks/useVisits'
import { useCapacity } from '@/hooks/useCapacity'
import { useSiteEditProposals } from '@/hooks/useSiteEditProposals'
import { useAuth } from '@/lib/useAuth'
import { useIsAdmin } from '@/lib/useIsAdmin'
import { BRAND } from '@/theme'
import { KIND_COLORS, KIND_LABELS } from '@/types'
import { VisitsSection } from './VisitsSection'
import { CapacitySection } from './CapacitySection'
import { SiteFieldEditor } from './SiteFieldEditor'

type Props = {
  siteId: string
  onClose: () => void
}

/**
 * Web-app equivalent: src/sites/SiteDetail.tsx.
 *
 * Originally built as a separate Expo Router screen (`/site/[id]`), pushed
 * onto the stack on tap. Moved to an overlay rendered directly inside
 * CampingMap after an on-device test showed the map's pins vanishing after
 * navigating back from that screen and not reappearing — a known,
 * unresolved Android bug in how react-native-screens (which Expo Router
 * uses) handles a heavy native view like a MapView being backgrounded and
 * restored. Keeping the map permanently mounted, with this panel drawn on
 * top of it instead of navigated to, sidesteps that category of bug
 * entirely rather than working around it — and matches how the website
 * already does this (an overlay, not a page navigation).
 */
export function SiteDetailPanel({ siteId, onClose }: Props) {
  const { site, loading, error } = useSite(siteId)
  const { session } = useAuth()
  const isAdmin = useIsAdmin(session)
  const {
    visits,
    loading: visitsLoading,
    error: visitsError,
    addVisit,
    updateVisit,
  } = useVisits(siteId)
  const { entries, loading: capacityLoading, error: capacityError, addEntry } = useCapacity(siteId)
  const { proposals, propose } = useSiteEditProposals(siteId)

  const avgRating = useMemo(() => {
    const ratings = visits.map((v) => v.rating).filter((r): r is number => r != null)
    if (ratings.length === 0) return null
    const sum = ratings.reduce((total, r) => total + r, 0)
    return { average: sum / ratings.length, count: ratings.length }
  }, [visits])

  const pendingNameEdit = proposals.find((p) => p.field === 'name') ?? null
  const pendingDescriptionEdit = proposals.find((p) => p.field === 'description') ?? null

  // One "Suggest an edit" mode for name, description and capacity together:
  // name/description go to the admin as proposals, a capacity entry goes in
  // as a pending report — all submitted with the single button below.
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [count, setCount] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function startEditing() {
    if (!site) return
    setNameDraft(site.name)
    setDescriptionDraft(site.description ?? '')
    setVehicleType('')
    setCount('')
    setEditError(null)
    setEditing(true)
  }

  async function submitEdits() {
    if (!site || !session) return
    const parsedCount = Number(count)
    const hasCapacity = vehicleType.trim() !== '' || count.trim() !== ''
    if (hasCapacity && !(vehicleType.trim() !== '' && Number.isFinite(parsedCount) && parsedCount > 0)) {
      setEditError('Enter both a vehicle type and a count above zero, or clear both.')
      return
    }

    const nameChanged = !pendingNameEdit && nameDraft.trim() !== '' && nameDraft.trim() !== site.name
    const descriptionChanged =
      !pendingDescriptionEdit && descriptionDraft.trim() !== '' && descriptionDraft.trim() !== (site.description ?? '')
    if (!nameChanged && !descriptionChanged && !hasCapacity) {
      setEditError('Nothing changed yet.')
      return
    }

    setSaving(true)
    setEditError(null)
    let result: string | null = null
    if (nameChanged) result = await propose('name', nameDraft.trim(), session.user.id)
    if (!result && descriptionChanged) {
      result = await propose('description', descriptionDraft.trim(), session.user.id)
    }
    if (!result && hasCapacity) {
      result = await addEntry({
        vehicle_type: vehicleType.trim(),
        count: parsedCount,
        user_id: session.user.id,
      })
    }
    setSaving(false)

    if (result) {
      setEditError(result)
      return
    }
    setEditing(false)
  }

  return (
    <View style={styles.panel}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.centered}>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      )}

      {!loading && (error || !site) && (
        <View style={styles.centered}>
          <Text style={styles.error}>Couldn’t load this site{error ? `: ${error}` : '.'}</Text>
        </View>
      )}

      {!loading && site && (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
            <View style={[styles.badge, { backgroundColor: KIND_COLORS[site.kind] }]}>
              <Text style={styles.badgeText}>{KIND_LABELS[site.kind]}</Text>
            </View>
            <SiteFieldEditor
              currentValue={site.name}
              placeholder="Site name"
              pendingProposal={pendingNameEdit}
              editing={editing}
              draft={nameDraft}
              onChangeDraft={setNameDraft}
              textStyle={styles.title}
            />

            {session && !editing && (
              <TouchableOpacity onPress={startEditing}>
                <Text style={styles.suggestLink}>Suggest an edit ✎</Text>
              </TouchableOpacity>
            )}

            <View style={styles.ratingSummary}>
              {avgRating ? (
                <>
                  <Text style={styles.ratingScore}>{avgRating.average.toFixed(1)}/10</Text>
                  <Text style={styles.ratingCount}>
                    {avgRating.count} {avgRating.count === 1 ? 'rating' : 'ratings'}
                  </Text>
                </>
              ) : (
                <Text style={styles.ratingCount}>No ratings yet</Text>
              )}
            </View>

            {(site.description || pendingDescriptionEdit || editing) && (
              <View style={styles.descriptionSection}>
                <Text style={styles.heading}>Description</Text>
                <SiteFieldEditor
                  currentValue={site.description ?? ''}
                  displayValue={site.description || 'No description yet.'}
                  placeholder="What should campers know about this site?"
                  pendingProposal={pendingDescriptionEdit}
                  editing={editing}
                  draft={descriptionDraft}
                  onChangeDraft={setDescriptionDraft}
                  multiline
                  collapsedLines={3}
                  textStyle={styles.description}
                />
              </View>
            )}

            <CapacitySection
              entries={entries}
              loading={capacityLoading}
              error={capacityError}
              editing={editing}
              vehicleType={vehicleType}
              count={count}
              onChangeVehicleType={setVehicleType}
              onChangeCount={setCount}
            />

            {editing && (
              <View style={styles.editBar}>
                {editError && <Text style={styles.error}>{editError}</Text>}
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setEditing(false)} disabled={saving}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitEditsButton, saving && styles.submitEditsDisabled]}
                    onPress={submitEdits}
                    disabled={saving}
                  >
                    <Text style={styles.submitEditsText}>{saving ? 'Submitting…' : 'Submit suggestions'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <VisitsSection
              visits={visits}
              loading={visitsLoading}
              error={visitsError}
              onAdd={addVisit}
              onUpdate={updateVisit}
              session={session}
              isAdmin={isAdmin}
            />

            <View style={styles.metaSection}>
              <Text style={styles.metaLabel}>Coordinates</Text>
              <Text style={styles.metaValue}>
                {site.lat.toFixed(5)}, {site.lon.toFixed(5)}
              </Text>

              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}`,
                  )
                }
              >
                <Text style={styles.directionsText}>Directions ↗</Text>
              </TouchableOpacity>

              <Text style={styles.source}>
                {site.source === 'user'
                  ? 'Submitted by a camper'
                  : `Source: ${site.source.toUpperCase()}`}
              </Text>
            </View>
        </KeyboardAwareScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  suggestLink: { fontSize: 12, color: BRAND.oxblood, fontWeight: '600', marginBottom: 8 },
  editBar: { marginTop: 14, gap: 6 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14 },
  cancelText: { fontSize: 13, color: '#8a978f', fontWeight: '600' },
  submitEditsButton: {
    backgroundColor: BRAND.oxblood,
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  submitEditsDisabled: { backgroundColor: '#b3c4ba' },
  submitEditsText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  muted: { fontSize: 14, color: '#8a978f' },
  error: { fontSize: 14, color: '#a33', textAlign: 'center' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '700', color: '#1d2b23', marginBottom: 8 },
  ratingSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  ratingScore: { fontSize: 20, fontWeight: '700', color: '#1d2b23' },
  ratingCount: { fontSize: 12, color: '#8a978f' },
  descriptionSection: { marginBottom: 4 },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7a70',
    marginBottom: 6,
  },
  description: { fontSize: 14, lineHeight: 20, color: '#3f4f46' },
  metaSection: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8e4' },
  metaLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7a70' },
  metaValue: { fontSize: 13, color: '#1d2b23', marginTop: 2, fontVariant: ['tabular-nums'] },
  directionsButton: { marginTop: 8, alignSelf: 'flex-start' },
  directionsText: { color: '#2f7a4d', fontWeight: '600', fontSize: 14 },
  source: { marginTop: 10, fontSize: 11, color: '#8a978f' },
})
