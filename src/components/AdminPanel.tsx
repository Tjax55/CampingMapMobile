import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useAdminReview } from '@/hooks/useAdminReview'
import type { PendingSiteEditProposal } from '@/types'

type Props = {
  adminUserId: string
  onClose: () => void
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const FIELD_LABELS = { name: 'Name', description: 'Description' } as const

function ProposalRow({
  proposal,
  onReview,
}: {
  proposal: PendingSiteEditProposal
  onReview: (decision: 'approved' | 'rejected', value: string) => Promise<string | null>
}) {
  const [value, setValue] = useState(proposal.proposed_value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(decision: 'approved' | 'rejected') {
    setBusy(true)
    setError(null)
    const result = await onReview(decision, value)
    setBusy(false)
    if (result) setError(result)
  }

  return (
    <View style={styles.item}>
      <Text style={styles.itemSite}>{proposal.site_name}</Text>
      <Text style={styles.itemMeta}>
        {FIELD_LABELS[proposal.field]} · {formatTimestamp(proposal.created_at)}
      </Text>
      <Text style={styles.currentLabel}>Current</Text>
      <Text style={styles.currentValue}>{proposal.current_value || '(empty)'}</Text>
      <Text style={styles.currentLabel}>Proposed (editable before approving)</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        multiline={proposal.field === 'description'}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectButton} onPress={() => handle('rejected')} disabled={busy}>
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} onPress={() => handle('approved')} disabled={busy}>
          <Text style={styles.approveText}>{busy ? 'Working…' : 'Approve'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/**
 * The sole admin's review queue — pending capacity reports and pending site
 * name/description edit proposals, per
 * planning/decisions/2026-09-29-admin-review-for-capacity-and-site-edits.md
 * in the website repo. Only ever rendered when useIsAdmin is true; the
 * underlying RLS policies double as the real access control if it weren't.
 */
export function AdminPanel({ adminUserId, onClose }: Props) {
  const { capacityReports, editProposals, loading, error, reviewCapacity, reviewProposal } =
    useAdminReview()
  const [capacityError, setCapacityError] = useState<string | null>(null)
  const [busyCapacityId, setBusyCapacityId] = useState<string | null>(null)

  async function handleCapacity(id: string, decision: 'approved' | 'rejected') {
    setBusyCapacityId(id)
    setCapacityError(null)
    const result = await reviewCapacity(id, decision)
    setBusyCapacityId(null)
    if (result) setCapacityError(result)
  }

  return (
    <View style={styles.panel}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.panelTitle}>Admin review</Text>

        {loading && <Text style={styles.muted}>Loading…</Text>}
        {error && <Text style={styles.error}>Couldn’t load review queue: {error}</Text>}

        <Text style={styles.sectionHeading}>Capacity reports</Text>
        {!loading && capacityReports.length === 0 && (
          <Text style={styles.muted}>Nothing pending.</Text>
        )}
        {capacityReports.map((report) => (
          <View key={report.id} style={styles.item}>
            <Text style={styles.itemSite}>{report.site_name}</Text>
            <Text style={styles.itemMeta}>{formatTimestamp(report.created_at)}</Text>
            <Text style={styles.itemBody}>
              {report.count} × {report.vehicle_type}
            </Text>
            {capacityError && busyCapacityId === report.id && (
              <Text style={styles.error}>{capacityError}</Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleCapacity(report.id, 'rejected')}
                disabled={busyCapacityId === report.id}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleCapacity(report.id, 'approved')}
                disabled={busyCapacityId === report.id}
              >
                <Text style={styles.approveText}>
                  {busyCapacityId === report.id ? 'Working…' : 'Approve'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Site edit suggestions</Text>
        {!loading && editProposals.length === 0 && (
          <Text style={styles.muted}>Nothing pending.</Text>
        )}
        {editProposals.map((proposal) => (
          <ProposalRow
            key={proposal.id}
            proposal={proposal}
            onReview={(decision, value) => reviewProposal(proposal, decision, value, adminUserId)}
          />
        ))}
      </ScrollView>
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
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#1d2b23', marginBottom: 8 },
  muted: { fontSize: 13, color: '#8a978f', marginBottom: 6 },
  error: { fontSize: 12, color: '#a33', marginVertical: 4 },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7a70',
    marginTop: 16,
    marginBottom: 8,
  },
  item: {
    backgroundColor: '#f4f6f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  itemSite: { fontSize: 14, fontWeight: '700', color: '#1d2b23' },
  itemMeta: { fontSize: 11, color: '#8a978f', marginTop: 1, marginBottom: 6 },
  itemBody: { fontSize: 13, color: '#3f4f46' },
  currentLabel: { fontSize: 10, fontWeight: '700', color: '#8a978f', textTransform: 'uppercase', marginTop: 4 },
  currentValue: { fontSize: 13, color: '#3f4f46', marginTop: 2 },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  rejectButton: {
    borderWidth: 1,
    borderColor: '#c99',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rejectText: { color: '#a33', fontSize: 12, fontWeight: '600' },
  approveButton: {
    backgroundColor: '#2f7a4d',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  approveText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
})
