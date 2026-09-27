import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { CATEGORY_COLORS, CATEGORY_LABELS, FILTER_CATEGORIES, type FilterCategory } from '@/types'

type Props = {
  open: boolean
  onToggleOpen: () => void
  visible: Set<FilterCategory>
  onChange: (next: Set<FilterCategory>) => void
  showBlmLand: boolean
  onToggleBlmLand: (next: boolean) => void
}

function Checkbox({ checked, color }: { checked: boolean; color: string }) {
  return (
    <View style={[styles.checkbox, checked && { backgroundColor: color, borderColor: color }]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
  )
}

/**
 * Web-app equivalent: src/map/FilterControl.tsx. Same category list and
 * BLM-land toggle, just a tap-to-open floating panel instead of an
 * always-visible sidebar — screen space is much tighter on a phone.
 */
export function FilterPanel({ open, onToggleOpen, visible, onChange, showBlmLand, onToggleBlmLand }: Props) {
  function toggleCategory(category: FilterCategory) {
    const next = new Set(visible)
    if (next.has(category)) next.delete(category)
    else next.add(category)
    onChange(next)
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.fab} onPress={onToggleOpen}>
        <Text style={styles.fabIcon}>{open ? '✕' : '☰'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.panel}>
          <ScrollView>
            <Text style={styles.sectionTitle}>Campsites</Text>
            {FILTER_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.row}
                onPress={() => toggleCategory(category)}
              >
                <Checkbox checked={visible.has(category)} color={CATEGORY_COLORS[category]} />
                <Text style={styles.rowLabel}>{CATEGORY_LABELS[category]}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Land</Text>
            <TouchableOpacity style={styles.row} onPress={() => onToggleBlmLand(!showBlmLand)}>
              <Checkbox checked={showBlmLand} color="#f5d967" />
              <Text style={styles.rowLabel}>BLM land</Text>
            </TouchableOpacity>
            <Text style={styles.note}>
              Dispersed camping is usually allowed, typically 14 nights. Closures and local rules
              vary — check signage.
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fabIcon: { fontSize: 18, color: '#1d2b23' },
  panel: {
    marginTop: 8,
    width: 220,
    maxHeight: 380,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#7d8c83',
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  rowLabel: { fontSize: 13, color: '#1d2b23' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cfd8d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: '#8a978f',
    marginTop: 6,
  },
})
