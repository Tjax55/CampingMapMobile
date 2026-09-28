import { useMemo } from 'react'
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSite } from '@/hooks/useSite'
import { useVisits } from '@/hooks/useVisits'
import { useCapacity } from '@/hooks/useCapacity'
import { useAuth } from '@/lib/useAuth'
import { KIND_COLORS, KIND_LABELS } from '@/types'
import { VisitsSection } from './VisitsSection'
import { CapacitySection } from './CapacitySection'

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
  const { session, signInWithGoogle } = useAuth()
  const { visits, loading: visitsLoading, error: visitsError, addVisit } = useVisits(siteId)
  const { entries, loading: capacityLoading, error: capacityError, addEntry } = useCapacity(siteId)

  const avgRating = useMemo(() => {
    const ratings = visits.map((v) => v.rating).filter((r): r is number => r != null)
    if (ratings.length === 0) return null
    const sum = ratings.reduce((total, r) => total + r, 0)
    return { average: sum / ratings.length, count: ratings.length }
  }, [visits])

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
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.badge, { backgroundColor: KIND_COLORS[site.kind] }]}>
              <Text style={styles.badgeText}>{KIND_LABELS[site.kind]}</Text>
            </View>
            <Text style={styles.title}>{site.name}</Text>

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

            {site.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.heading}>Description</Text>
                <Text style={styles.description}>{site.description}</Text>
              </View>
            )}

            <CapacitySection
              entries={entries}
              loading={capacityLoading}
              error={capacityError}
              onAdd={addEntry}
              session={session}
              onSignIn={signInWithGoogle}
            />

            <VisitsSection
              visits={visits}
              loading={visitsLoading}
              error={visitsError}
              onAdd={addVisit}
              session={session}
              onSignIn={signInWithGoogle}
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
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  keyboardAvoider: { flex: 1 },
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
