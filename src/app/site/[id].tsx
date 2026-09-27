import { useMemo } from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useSite } from '@/hooks/useSite'
import { useVisits } from '@/hooks/useVisits'
import { useCapacity } from '@/hooks/useCapacity'
import { useAuth } from '@/lib/useAuth'
import { KIND_COLORS, KIND_LABELS } from '@/types'
import { VisitsSection } from '@/components/VisitsSection'
import { CapacitySection } from '@/components/CapacitySection'

/** Web-app equivalent: src/sites/SiteDetail.tsx. A separate screen rather
 * than an overlay panel — a full-screen drill-down reads more naturally on a
 * phone than a sidebar does. */
export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { site, loading, error } = useSite(id)
  const { session, signInWithGoogle } = useAuth()
  const { visits, loading: visitsLoading, error: visitsError, addVisit } = useVisits(id)
  const { entries, loading: capacityLoading, error: capacityError, addEntry } = useCapacity(id)

  const avgRating = useMemo(() => {
    const ratings = visits.map((v) => v.rating).filter((r): r is number => r != null)
    if (ratings.length === 0) return null
    const sum = ratings.reduce((total, r) => total + r, 0)
    return { average: sum / ratings.length, count: ratings.length }
  }, [visits])

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    )
  }

  if (error || !site) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Couldn’t load this site{error ? `: ${error}` : '.'}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          {site.source === 'user' ? 'Submitted by a camper' : `Source: ${site.source.toUpperCase()}`}
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, paddingBottom: 32 },
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
  title: { fontSize: 20, fontWeight: '700', color: '#1d2b23', marginBottom: 8 },
  ratingSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  ratingScore: { fontSize: 22, fontWeight: '700', color: '#1d2b23' },
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
  metaLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7a70',
  },
  metaValue: { fontSize: 13, color: '#1d2b23', marginTop: 2, fontVariant: ['tabular-nums'] },
  directionsButton: { marginTop: 8, alignSelf: 'flex-start' },
  directionsText: { color: '#2f7a4d', fontWeight: '600', fontSize: 14 },
  source: { marginTop: 10, fontSize: 11, color: '#8a978f' },
})
