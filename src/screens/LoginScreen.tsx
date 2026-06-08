import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { SLOGAN_TAGLINE, WORDMARK } from '../branding';
import { colors } from '../theme';

/** Email + password sign-in against POST /api/auth/login. */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : 'Impossibile accedere. Riprova.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.wordmark}>{WORDMARK}</Text>
            <Text style={styles.tagline}>{SLOGAN_TAGLINE}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nome@studiorei.it"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!submitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              secureTextEntry
              textContentType="password"
              editable={!submitting}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textOnDark} />
              ) : (
                <Text style={styles.buttonText}>Accedi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { marginBottom: 36 },
  wordmark: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: { color: colors.textDim, fontSize: 15, marginTop: 6 },
  form: { gap: 8 },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: '#D14343', fontSize: 14, marginTop: 4 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.textOnDark,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
