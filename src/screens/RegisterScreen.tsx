import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
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
import { WORDMARK } from '../branding';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

/** Registrazione consumer: nome + email + password. */
export default function RegisterScreen({ navigation, route }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 3 &&
    password.length >= 8 &&
    confirm === password &&
    !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ email: email.trim(), password, name: name.trim() });
      // Successo: il RootNavigator commuta da solo sullo stack autenticato.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registrazione non riuscita. Riprova.');
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.wordmark}>{WORDMARK}</Text>
            <Text style={styles.tagline}>Crea il tuo account in pochi secondi</Text>
          </View>

          <FormInput
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Il tuo nome"
            autoCapitalize="words"
            textContentType="name"
            editable={!submitting}
          />
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
            placeholder="Almeno 8 caratteri"
            secureTextEntry
            textContentType="newPassword"
            editable={!submitting}
            error={passwordTooShort ? 'La password deve avere almeno 8 caratteri.' : null}
          />
          <FormInput
            label="Conferma password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            secureTextEntry
            editable={!submitting}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
            error={mismatch ? 'Le password non coincidono.' : null}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            title="Crea account"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => navigation.navigate('Login')}
            hitSlop={8}
          >
            <Text style={styles.switchText}>
              Hai già un account? <Text style={styles.switchAction}>Accedi</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  header: { marginBottom: spacing.xl },
  wordmark: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: { color: colors.textDim, fontSize: 15, marginTop: 6 },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.md },
  switchLink: { alignItems: 'center', marginTop: spacing.xl },
  switchText: { color: colors.textDim, fontSize: 14 },
  switchAction: { color: colors.primary, fontWeight: '600' },
});
