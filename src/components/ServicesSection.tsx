import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BRAND } from '@/theme'
import {
  CELL_PROVIDERS,
  PROVIDER_LABELS,
  SERVICE_FLAGS,
  SERVICE_LABELS,
  type CellProvider,
  type SiteEditProposal,
  type SiteServices,
} from '@/types'

const BAR_COUNT = 5

/**
 * Drops anything that isn't a real answer (false flags, providers with no
 * bars) and fixes key order, so two services objects that mean the same thing
 * compare equal and the stored JSON is stable.
 */
export function normalizeServices(services: SiteServices | null | undefined): SiteServices {
  const out: SiteServices = {}
  for (const flag of SERVICE_FLAGS) {
    if (services?.[flag]) out[flag] = true
  }
  const cell: NonNullable<SiteServices['cell']> = {}
  for (const provider of CELL_PROVIDERS) {
    const info = services?.cell?.[provider]
    if (info && info.bars > 0) cell[provider] = { bars: info.bars, amp: Boolean(info.amp) }
  }
  if (Object.keys(cell).length > 0) out.cell = cell
  return out
}

export function servicesEqual(a: SiteServices | null | undefined, b: SiteServices | null | undefined) {
  return JSON.stringify(normalizeServices(a)) === JSON.stringify(normalizeServices(b))
}

export function parseServices(json: string | null): SiteServices | null {
  if (!json) return null
  try {
    return JSON.parse(json) as SiteServices
  } catch {
    return null
  }
}

function SignalBars({ bars }: { bars: number }) {
  return (
    <View style={styles.signal}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <View
          key={i}
          style={[styles.signalBar, { height: 6 + i * 4 }, i < bars && styles.signalBarOn]}
        />
      ))}
    </View>
  )
}

/** Read-only view of a services object — used for the live value, a pending
 * proposal, and the admin screen. */
export function ServicesSummary({ services }: { services: SiteServices | null }) {
  const clean = normalizeServices(services)
  const providers = CELL_PROVIDERS.filter((p) => clean.cell?.[p])
  const flags = SERVICE_FLAGS.filter((f) => clean[f])

  if (providers.length === 0 && flags.length === 0) {
    return <Text style={styles.muted}>Nothing reported yet.</Text>
  }

  return (
    <View style={styles.summary}>
      {providers.map((provider) => {
        const info = clean.cell![provider]!
        return (
          <View key={provider} style={styles.summaryRow}>
            <Text style={styles.providerLabel}>{PROVIDER_LABELS[provider]}</Text>
            <SignalBars bars={info.bars} />
            <Text style={styles.ampText}>{info.amp ? 'with amp' : ''}</Text>
          </View>
        )
      })}
      {flags.length > 0 && (
        <Text style={styles.flagsText}>{flags.map((f) => SERVICE_LABELS[f]).join(' · ')}</Text>
      )}
    </View>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  )
}

type Props = {
  current: SiteServices | null
  /** A pending 'services' proposal, if one is waiting on admin approval. */
  pendingProposal: SiteEditProposal | null
  /** Whether the screen-wide "Suggest an edit" mode is on. */
  editing: boolean
  draft: SiteServices
  onChangeDraft: (next: SiteServices) => void
}

/**
 * Cell coverage per carrier and the sun/shade/water/toilets/large rigs/tent
 * flags. One shared answer per site, and admin data: edits made here are only
 * proposals (SiteDetailPanel submits them) that show as pending until an
 * admin approves. Controlled by SiteDetailPanel like the other editable
 * fields. While a proposal is pending the section can't be edited again.
 */
export function ServicesSection({ current, pendingProposal, editing, draft, onChangeDraft }: Props) {
  function setBars(provider: CellProvider, bars: number) {
    const existing = draft.cell?.[provider]
    const nextBars = existing?.bars === bars ? 0 : bars
    onChangeDraft({
      ...draft,
      cell: { ...draft.cell, [provider]: { bars: nextBars, amp: existing?.amp ?? false } },
    })
  }

  function toggleAmp(provider: CellProvider) {
    const existing = draft.cell?.[provider]
    if (!existing || existing.bars === 0) return
    onChangeDraft({
      ...draft,
      cell: { ...draft.cell, [provider]: { bars: existing.bars, amp: !existing.amp } },
    })
  }

  function toggleFlag(flag: (typeof SERVICE_FLAGS)[number]) {
    onChangeDraft({ ...draft, [flag]: !draft[flag] })
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Services</Text>

      {editing && !pendingProposal ? (
        <View>
          <Text style={styles.subheading}>Cell service</Text>
          {CELL_PROVIDERS.map((provider) => {
            const info = draft.cell?.[provider]
            const bars = info?.bars ?? 0
            return (
              <View key={provider} style={styles.editRow}>
                <Text style={styles.providerLabel}>{PROVIDER_LABELS[provider]}</Text>
                <View style={styles.barPicker}>
                  {Array.from({ length: BAR_COUNT }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.barButton}
                      onPress={() => setBars(provider, i + 1)}
                      accessibilityLabel={PROVIDER_LABELS[provider] + ' ' + (i + 1) + ' bars'}
                    >
                      <View
                        style={[styles.pickerBar, { height: 10 + i * 6 }, i < bars && styles.signalBarOn]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.ampButton, bars === 0 && styles.ampDisabled]}
                  onPress={() => toggleAmp(provider)}
                  disabled={bars === 0}
                >
                  <Checkbox checked={Boolean(info?.amp)} />
                  <Text style={styles.ampLabel}>Amp</Text>
                </TouchableOpacity>
              </View>
            )
          })}

          <Text style={styles.subheading}>At the site</Text>
          <View style={styles.flagGrid}>
            {SERVICE_FLAGS.map((flag) => (
              <TouchableOpacity key={flag} style={styles.flagCell} onPress={() => toggleFlag(flag)}>
                <Checkbox checked={Boolean(draft[flag])} />
                <Text style={styles.flagLabel}>{SERVICE_LABELS[flag]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View>
          <ServicesSummary services={current} />
          {pendingProposal && (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingLabel}>Pending admin approval</Text>
              <ServicesSummary services={parseServices(pendingProposal.proposed_value)} />
            </View>
          )}
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
  subheading: { fontSize: 12, fontWeight: '600', color: '#3f4f46', marginTop: 6, marginBottom: 4 },
  muted: { fontSize: 13, color: '#8a978f' },
  summary: { gap: 6 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  providerLabel: { width: 70, fontSize: 13, fontWeight: '600', color: '#1d2b23' },
  ampText: { fontSize: 11, color: '#8a978f' },
  flagsText: { fontSize: 13, color: '#3f4f46', marginTop: 2 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  signalBar: { width: 7, borderRadius: 2, backgroundColor: '#d9dfdb' },
  signalBarOn: { backgroundColor: BRAND.oxblood },
  editRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  barPicker: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 52 },
  barButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  pickerBar: { width: 16, borderRadius: 3, backgroundColor: '#d9dfdb' },
  ampButton: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 52, paddingLeft: 8 },
  ampDisabled: { opacity: 0.35 },
  ampLabel: { fontSize: 12, color: '#1d2b23' },
  flagGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  flagCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  flagLabel: { fontSize: 14, color: '#1d2b23' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cfd8d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: BRAND.oxblood, borderColor: BRAND.oxblood },
  checkmark: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  pendingBox: {
    marginTop: 8,
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
    marginBottom: 4,
  },
})
