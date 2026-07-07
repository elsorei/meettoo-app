import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { resetPassword } from '../api/auth';
import { ApiError } from '../api/client';
import { FormInput, PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

/**
 * Completa il reset password: si arriva qui dal link nell'email
 * (deep link meettoo://reset-password?token=...).
 */
export default function ResetPasswordScreen({ navigation, route }: Props) {
  const token = route.params?.token ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    token.length > 0 && password.length >= 8 && confirm === password && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Reset non riuscito. Il link potrebbe essere scaduto: richiedine uno nuovo.'
      );
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
          <Text style={styles.title}>Nuova password</Text>

          {done ? (
            <>
              <Text style={styles.body}>
                Password aggiornata! Accedi con le nuove credenziali.
              </Text>
              <PrimaryButton title="Vai al login" onPress={() => navigation.navigate('Login')} />
            </>
          ) : !token ? (
            <>
              <Text style={styles.body}>
                Link non valido. Richiedi un nuovo reset dalla schermata di accesso.
              </Text>
              <PrimaryButton
                title="Password dimenticata"
                onPress={() => navigation.navigate('ForgotPassword')}
              />
            </>
          ) : (
            <>
              <Text style={styles.body}>Scegli la nuova password per il tuo account.</Text>
              <FormInput
                label="Nuova password"
                value={password}
                onChangeText={setPassword}
                placeholder="Almeno 8 caratteri"
                secureTextEntry
                textContentType="newPassword"
                editable={!submitting}
                error={tooShort ? 'La password deve avere almeno 8 caratteri.' : null}
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
                title="Imposta la password"
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={submitting}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  body: {
    color: colors.textDim,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.sm },
});
