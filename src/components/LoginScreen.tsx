import { useState } from 'react'
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  onSignIn: (rememberMe: boolean) => Promise<string | null>
}

/**
 * Shown before anything else when there's no signed-in session — sign-in is
 * now required to use the app at all, not just to post a visit or submit a
 * spot. The "remember me" checkbox controls whether useAuth signs the user
 * back out on the next cold start (default on, matching how a signed-in
 * session already persists across restarts).
 */
export function LoginScreen({ onSignIn }: Props) {
  const [rememberMe, setRememberMe] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  async function handlePress() {
    setSigningIn(true)
    const error = await onSignIn(rememberMe)
    setSigningIn(false)
    if (error) Alert.alert('Sign-in failed', error)
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>Camping Map</Text>
      <Text style={styles.subtitle}>Sign in to find and log campsites.</Text>

      <TouchableOpacity style={styles.button} onPress={handlePress} disabled={signingIn}>
        <Text style={styles.buttonText}>{signingIn ? 'Signing in…' : 'Sign in with Google'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.rememberLabel}>Remember me</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d2b23',
    padding: 24,
  },
  logo: { width: 96, height: 96, borderRadius: 20, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#f4f1ea', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#c7d1cb', marginBottom: 28, textAlign: 'center' },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#1d2b23' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#c7d1cb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#4f9d6b', borderColor: '#4f9d6b' },
  checkmark: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  rememberLabel: { fontSize: 13, color: '#f4f1ea' },
})
