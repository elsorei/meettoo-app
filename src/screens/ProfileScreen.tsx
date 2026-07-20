import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import * as authApi from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormInput, PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

/**
 * Profilo e impostazioni account: modifica nome, verifica email, logout
 * (singolo e da tutti i dispositivi), cancellazione account.
 */
export default function ProfileScreen({ navigation }: Props) {
  const { user, refreshUser, signOut, signOutEverywhere, deleteAccount } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const nameChanged = name.trim().length > 0 && name.trim() !== (user?.name ?? '');

  async function saveName() {
    if (!nameChanged || savingName) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await authApi.updateProfile({ name: name.trim() });
      await refreshUser();
      setNameMsg('Nome aggiornato.');
    } catch (e) {
      setNameMsg(e instanceof ApiError ? e.message : 'Salvataggio non riuscito.');
    } finally {
      setSavingName(false);
    }
  }

  async function sendVerification() {
    try {
      await authApi.requestEmailVerification();
      setVerifySent(true);
    } catch (e) {
      Alert.alert('Errore', e instanceof ApiError ? e.message : 'Invio non riuscito.');
    }
  }

  function confirmSignOutEverywhere() {
    Alert.alert(
      'Esci da tutti i dispositivi',
      'Tutte le sessioni attive verranno disconnesse. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci ovunque', style: 'destructive', onPress: () => void signOutEverywhere() },
      ]
    );
  }

  async function onDelete() {
    if (!deletePassword || deleting) return;
    Alert.alert(
      'Cancellare l\'account?',
      'Questa azione è definitiva: profilo, inviti e partecipazioni verranno eliminati.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella definitivamente',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              setDeleteError(null);
              try {
                await deleteAccount(deletePassword);
                // La sessione si chiude da sola: il navigator torna al Login.
              } catch (e) {
                setDeleteError(
                  e instanceof ApiError ? e.message : 'Cancellazione non riuscita.'
                );
                setDeleting(false);
              }
            })();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilo</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          {user && !user.emailVerified ? (
            <View style={styles.verifyBox}>
              <Text style={styles.verifyText}>
                {verifySent
                  ? 'Email di verifica inviata: controlla la casella.'
                  : 'Indirizzo email non ancora verificato.'}
              </Text>
              {!verifySent ? (
                <TouchableOpacity onPress={() => void sendVerification()} hitSlop={8}>
                  <Text style={styles.verifyAction}>Invia di nuovo il link</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <FormInput
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Il tuo nome"
          autoCapitalize="words"
          editable={!savingName}
        />
        {nameMsg ? <Text style={styles.nameMsg}>{nameMsg}</Text> : null}
        <PrimaryButton
          title="Salva nome"
          onPress={() => void saveName()}
          disabled={!nameChanged}
          loading={savingName}
        />

        <View style={styles.divider} />

        <PrimaryButton title="Esci" variant="ghost" onPress={() => void signOut()} />
        <PrimaryButton
          title="Esci da tutti i dispositivi"
          variant="ghost"
          onPress={confirmSignOutEverywhere}
        />

        <View style={styles.divider} />

        {showDelete ? (
          <>
            <Text style={styles.dangerTitle}>Cancella account</Text>
            <Text style={styles.dangerBody}>
              Inserisci la password per confermare. L'operazione è definitiva.
            </Text>
            <FormInput
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="••••••••"
              secureTextEntry
              editable={!deleting}
              error={deleteError}
            />
            <PrimaryButton
              title="Cancella definitivamente"
              variant="danger"
              onPress={() => void onDelete()}
              disabled={!deletePassword}
              loading={deleting}
            />
          </>
        ) : (
          <TouchableOpacity onPress={() => setShowDelete(true)} hitSlop={8}>
            <Text style={styles.deleteLink}>Cancella il mio account</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  backPlaceholder: { width: 70 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  email: { color: colors.text, fontSize: 16, fontWeight: '600' },
  verifyBox: { marginTop: spacing.sm },
  verifyText: { color: colors.textDim, fontSize: 13 },
  verifyAction: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  nameMsg: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  dangerTitle: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  dangerBody: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  deleteLink: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
