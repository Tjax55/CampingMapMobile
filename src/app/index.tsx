import { Stack, router } from 'expo-router'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { CampingMap } from '@/components/CampingMap'

export default function MapScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/submit')}>
              <Text style={styles.addButtonText}>Add a spot</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <CampingMap />
    </>
  )
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#4f9d6b',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 12 },
})
