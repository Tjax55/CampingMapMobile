import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BRAND } from '@/theme'

type Props = {
  value: Date
  onChange: (next: Date) => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/**
 * A date button that opens an inline month calendar. Built from plain React
 * Native views on purpose: the usual date-picker packages contain native
 * code, which would need a fresh EAS build to install. Future dates are
 * disabled — a visit can't happen tomorrow. Only the day changes; the time
 * of day on `value` is preserved by the caller.
 */
export function DateField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())
  const today = new Date()

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const atCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.buttonText}>
          {value.toLocaleDateString(undefined, { dateStyle: 'medium' })} ▾
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.calendar}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.navButton} onPress={() => shiftMonth(-1)}>
              <Text style={styles.navText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => shiftMonth(1)}
              disabled={atCurrentMonth}
            >
              <Text style={[styles.navText, atCurrentMonth && styles.navDisabled]}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day == null) return <View key={i} style={styles.cell} />
              const date = new Date(viewYear, viewMonth, day)
              const future = date > today && !sameDay(date, today)
              const selected = sameDay(date, value)
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.cell}
                  disabled={future}
                  onPress={() => {
                    onChange(date)
                    setOpen(false)
                  }}
                >
                  <View style={[styles.dayCircle, selected && styles.daySelected]}>
                    <Text
                      style={[
                        styles.dayText,
                        future && styles.dayFuture,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  buttonText: { fontSize: 14, color: '#1d2b23', fontWeight: '600' },
  calendar: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8e4',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#ffffff',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 16, color: BRAND.oxblood },
  navDisabled: { color: '#d9dfdb' },
  monthTitle: { fontSize: 14, fontWeight: '700', color: '#1d2b23' },
  weekRow: { flexDirection: 'row', marginTop: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: '#8a978f', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: BRAND.oxblood },
  dayText: { fontSize: 13, color: '#1d2b23' },
  dayFuture: { color: '#d9dfdb' },
  dayTextSelected: { color: '#ffffff', fontWeight: '700' },
})
