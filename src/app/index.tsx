import { ActivityIndicator, View } from 'react-native'
import { CampingMap } from '@/components/CampingMap'
import { LoginScreen } from '@/components/LoginScreen'
import { useAuth } from '@/lib/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function MapScreen() {
  const { session, loading, signInWithGoogle } = useAuth()

  // Only gated when Supabase is actually configured — otherwise there'd be
  // no way to ever sign in and the app would be permanently stuck here.
  if (isSupabaseConfigured && loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d2b23' }}>
        <ActivityIndicator color="#f4f1ea" />
      </View>
    )
  }

  if (isSupabaseConfigured && !session) {
    return <LoginScreen onSignIn={signInWithGoogle} />
  }

  return <CampingMap />
}
