import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type Props = {
  message: string
  onSignIn: () => void
}

/** Web-app equivalent: src/lib/SignInPrompt.tsx. Shown wherever a write
 * action is gated behind auth — the submit screen and the visits/capacity
 * add-forms. */
export function SignInPrompt({ message, onSignIn }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onSignIn}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
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
