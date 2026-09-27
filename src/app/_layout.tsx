import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1d2b23' },
          headerTintColor: '#f4f1ea',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Camping Map' }} />
        <Stack.Screen name="site/[id]" options={{ title: 'Site details' }} />
        <Stack.Screen name="submit" options={{ title: 'Add a spot', presentation: 'modal' }} />
      </Stack>
    </>
  )
}
