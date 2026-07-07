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

import { forgotPassword } from '../api/auth';
import { ApiError } from '../api/client';
import { FormInput, PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

/**
 * Recupero password: chiede l'email e conferma sempre con lo stesso messaggio
 * (il server non rivela se l'account esiste).
 */
export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Richiesta non riuscita. Riprova.');
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
          <Text style={styles.title}>Password dimenticata?</Text>

          {sent ? (
            <>
              <Text style={styles.body}>
                Se l'indirizzo esiste, ti abbiamo inviato un'email con il link per
                reimpostare la password. Controlla anche lo spam.
              </Text>
              <PrimaryButton title="Torna al login" onPress={() => navigation.navigate('Login')} />
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Inserisci l'email del tuo account: ti invieremo un link per
                scegliere una nuova password.
              </Text>
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
                onSubmitEditing={onSubmit}
                returnKeyType="send"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                title="Invia il link"
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={submitting}
              />
              <TouchableOpacity
                style={styles.switchLink}
                onPress={() => navigation.goBack()}
                hitSlop={8}
              >
                <Text style={styles.switchText}>Torna indietro</Text>
              </TouchableOpacity>
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
  switchLink: { alignItems: 'center', marginTop: spacing.xl },
  switchText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
