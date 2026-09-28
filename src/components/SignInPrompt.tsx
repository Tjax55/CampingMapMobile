import { useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  message: string
  onSignIn: () => Promise<string | null>
}

/**
 * Web-app equivalent: src/lib/SignInPrompt.tsx. Shown wherever a write
 * action is gated behind auth — the submit screen and the visits/capacity
 * add-forms.
 *
 * onSignIn's returned error used to be discarded entirely (the button just
 * called it and moved on), so a failed sign-in — the Google account picker
 * closing with nothing happening — gave no feedback at all. This awaits it
 * and surfaces whatever comes back.
 */
export function SignInPrompt({ message, onSignIn }: Props) {
  const [signingIn, setSigningIn] = useState(false)

  async function handlePress() {
    setSigningIn(true)
    const error = await onSignIn()
    setSigningIn(false)
    if (error) Alert.alert('Sign-in failed', error)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={handlePress} disabled={signingIn}>
        <Text style={styles.buttonText}>{signingIn ? 'Signing in…' : 'Sign in with Google'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f4f6f5',
    alignItems: 'center',
  },
  message: {
    marginBottom: 8,
    fontSize: 13,
    color: '#3f4f46',
    textAlign: 'center',
  },
  button: {
    borderWidth: 1,
    borderColor: '#cfd8d2',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d2b23',
  },
})
