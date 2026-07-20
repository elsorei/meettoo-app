import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormInput, PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { SLOGAN_TAGLINE, WORDMARK } from '../branding';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/** Email + password sign-in against POST /api/auth/login. */
export default function LoginScreen({ navigation }: Props) {
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

          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="nome@esempio.it"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!submitting}
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() || undefined })}
            hitSlop={8}
          >
            <Text style={styles.forgotText}>Password dimenticata?</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            title="Accedi"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => navigation.navigate('Register', { email: email.trim() || undefined })}
            hitSlop={8}
          >
            <Text style={styles.switchText}>
              Nuovo su MeetToo? <Text style={styles.switchAction}>Registrati</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  header: { marginBottom: spacing.xxl },
  wordmark: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: { color: colors.textDim, fontSize: 15, marginTop: 6 },
  forgotLink: { alignSelf: 'flex-end', marginTop: spacing.sm },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.sm },
  switchLink: { alignItems: 'center', marginTop: spacing.xl },
  switchText: { color: colors.textDim, fontSize: 14 },
  switchAction: { color: colors.primary, fontWeight: '600' },
});
