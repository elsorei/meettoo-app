import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { confirmParticipation, getEvent, respondAsGuest, updateEvent } from '../api/agenda';
import { ApiError } from '../api/client';
import { inviteGuest, removeGuest } from '../api/guests';
import type { EventDetail, EventGuest, RsvpAnswer } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const STATUS_LABEL: Record<EventGuest['status'], string> = {
  pending: 'In attesa',
  accepted: 'Confermato',
  declined: 'Rifiutato',
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatWhen(event: EventDetail): string {
  const date = new Date(`${event.event_date}T00:00:00`);
  const day = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  if (!event.start_time) return day;
  const start = event.start_time.slice(0, 5);
  const end = event.end_time ? `–${event.end_time.slice(0, 5)}` : '';
  return `${day} · ${start}${end}`;
}

/**
 * Dettaglio evento: quando/dove, RSVP dell'utente corrente, lista invitati,
 * toggle "gli invitati possono invitare" (owner) e invito via email quando il
 * server dice `can_invite`. L'autorizzazione reale vive nell'API; la UI si
 * limita a rispecchiarla.
 */
export default function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [answering, setAnswering] = useState<RsvpAnswer | null>(null);

  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getEvent(id, signal);
      setEvent(detail);
    } catch (e) {
      // Ignora SOLO l'abort del chiamante (unmount): il timeout interno del
      // client è pure un AbortError, ma deve mostrare errore + Riprova.
      if (signal?.aborted) return;
      setError(
        e instanceof ApiError ? e.message : 'Impossibile caricare l\'evento. Controlla la connessione.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(eventId, controller.signal);
    return () => controller.abort();
  }, [eventId, load]);

  const isOwner = !!event && !!user && event.owner_id === user.id;
  const myGuest = event && user ? event.guests.find((g) => g.user_id === user.id) : undefined;
  const myParticipant =
    event && user ? event.participants?.find((p) => p.user_id === user.id) : undefined;
  // L'utente può rispondere se è invitato (guest) o partecipante non-organizer.
  const myRsvp: EventGuest['status'] | null = myGuest
    ? myGuest.status
    : myParticipant && myParticipant.role !== 'organizer'
      ? myParticipant.confirmation
      : null;

  const handleRsvp = useCallback(
    async (answer: RsvpAnswer) => {
      if (!event || answering) return;
      setAnswering(answer);
      try {
        // Se l'utente è sia participant sia guest, aggiorna ENTRAMBI i
        // record: my_confirmation guida il badge in agenda e l'auto-conferma
        // dell'evento, lo status guest la lista invitati.
        if (myParticipant && myParticipant.role !== 'organizer') {
          await confirmParticipation(event.id, answer);
        }
        if (myGuest) {
          await respondAsGuest(event.id, answer);
        }
        await load(event.id);
      } catch (e) {
        Alert.alert(
          'Errore',
          e instanceof ApiError ? e.message : 'Risposta non inviata. Riprova.'
        );
      } finally {
        setAnswering(null);
      }
    },
    [event, myGuest, myParticipant, answering, load]
  );

  const handleShare = useCallback(() => {
    if (!event) return;
    void Share.share({
      message: `Ti aspetto a "${event.title}" (${formatWhen(event)}). Rispondi all'invito su MeetToo: meettoo://e/${event.id}`,
    });
  }, [event]);

  const handleInvite = useCallback(async () => {
    if (!event) return;
    const value = email.trim();
    if (!isValidEmail(value)) {
      setInviteError('Inserisci un indirizzo email valido.');
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      await inviteGuest(event.id, value);
      setEmail('');
      await load(event.id);
    } catch (e) {
      setInviteError(
        e instanceof ApiError ? e.message : 'Invito non riuscito.'
      );
    } finally {
      setInviting(false);
    }
  }, [event, email, load]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!event) return;
      setSavingToggle(true);
      setEvent((prev) =>
        prev ? { ...prev, allow_guests_to_invite: next } : prev
      );
      try {
        const updated = await updateEvent(event.id, { allowGuestsToInvite: next });
        setEvent(updated);
      } catch (e) {
        setEvent((prev) =>
          prev ? { ...prev, allow_guests_to_invite: !next } : prev
        );
        Alert.alert(
          'Errore',
          e instanceof ApiError ? e.message : 'Modifica non riuscita.'
        );
      } finally {
        setSavingToggle(false);
      }
    },
    [event]
  );

  const handleRemove = useCallback(
    (guest: EventGuest) => {
      if (!event) return;
      const label = guest.name ?? guest.email ?? 'questo invitato';
      Alert.alert('Rimuovere invitato', `Vuoi rimuovere ${label} dall'evento?`, [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeGuest(event.id, guest.id);
                await load(event.id);
              } catch (e) {
                Alert.alert(
                  'Errore',
                  e instanceof ApiError ? e.message : 'Rimozione non riuscita.'
                );
              }
            })();
          },
        },
      ]);
    },
    [event, load]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event?.title ?? 'Evento'}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.close}>Chiudi</Text>
        </TouchableOpacity>
      </View>

      {loading && !event ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load(eventId)}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : event ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.when}>{formatWhen(event)}</Text>
            {event.location_name ? (
              <Text style={styles.where}>{event.location_name}</Text>
            ) : null}
            {event.description ? (
              <Text style={styles.description}>{event.description}</Text>
            ) : null}

            {myRsvp ? (
              <View style={styles.rsvpBox}>
                <Text style={styles.sectionTitle}>
                  {myRsvp === 'pending' ? 'Parteciperai?' : 'La tua risposta'}
                </Text>
                <View style={styles.rsvpRow}>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, myRsvp === 'accepted' && styles.rsvpBtnYes]}
                    onPress={() => void handleRsvp('accepted')}
                    disabled={answering !== null}
                    accessibilityRole="button"
                    accessibilityLabel="Partecipo"
                  >
                    {answering === 'accepted' ? (
                      <ActivityIndicator color={myRsvp === 'accepted' ? colors.textOnDark : colors.success} />
                    ) : (
                      <Text
                        style={[styles.rsvpText, myRsvp === 'accepted' && styles.rsvpTextActive]}
                      >
                        Partecipo
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, myRsvp === 'declined' && styles.rsvpBtnNo]}
                    onPress={() => void handleRsvp('declined')}
                    disabled={answering !== null}
                    accessibilityRole="button"
                    accessibilityLabel="Non partecipo"
                  >
                    {answering === 'declined' ? (
                      <ActivityIndicator color={myRsvp === 'declined' ? colors.textOnDark : colors.danger} />
                    ) : (
                      <Text
                        style={[styles.rsvpText, myRsvp === 'declined' && styles.rsvpTextActive]}
                      >
                        Non partecipo
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              Invitati{event.guests.length ? ` · ${event.guests.length}` : ''}
            </Text>

            {event.guests.length === 0 ? (
              <Text style={styles.muted}>Nessun invitato per ora.</Text>
            ) : (
              event.guests.map((g) => (
                <View key={g.id} style={styles.guestRow}>
                  <View style={styles.flex}>
                    <Text style={styles.guestName}>
                      {g.name ?? g.email ?? 'Invitato'}
                    </Text>
                    <Text style={styles.guestMeta}>
                      {STATUS_LABEL[g.status]}
                      {g.invited_by_name
                        ? ` · invitato da ${g.invited_by_name}`
                        : ''}
                    </Text>
                  </View>
                  {isOwner && g.user_id !== event.owner_id ? (
                    <TouchableOpacity
                      onPress={() => handleRemove(g)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Rimuovi ${g.name ?? g.email ?? 'invitato'}`}
                    >
                      <Text style={styles.remove}>Rimuovi</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}

            {isOwner ? (
              <View style={styles.settingRow}>
                <View style={styles.flex}>
                  <Text style={styles.settingLabel}>
                    Consenti agli invitati di invitarne altri
                  </Text>
                  <Text style={styles.settingHint}>
                    Se attivo, chi è invitato potrà aggiungere altre persone.
                  </Text>
                </View>
                <Switch
                  value={event.allow_guests_to_invite}
                  onValueChange={handleToggle}
                  disabled={savingToggle}
                  trackColor={{ true: colors.primary }}
                  accessibilityLabel="Consenti agli invitati di invitarne altri"
                />
              </View>
            ) : event.allow_guests_to_invite ? (
              <Text style={styles.noteInfo}>
                L'organizzatore consente agli invitati di invitarne altri.
              </Text>
            ) : null}

            {event.can_invite ? (
              <View style={styles.inviteBox}>
                <Text style={styles.sectionTitle}>Invita una persona</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@esempio.it"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (inviteError) setInviteError(null);
                  }}
                  editable={!inviting}
                  onSubmitEditing={handleInvite}
                  returnKeyType="send"
                  accessibilityLabel="Email della persona da invitare"
                />
                {inviteError ? (
                  <Text style={styles.inviteError}>{inviteError}</Text>
                ) : null}
                <PrimaryButton
                  title="Invita via email"
                  onPress={() => void handleInvite()}
                  loading={inviting}
                />
                <PrimaryButton
                  title="Condividi invito"
                  variant="ghost"
                  onPress={handleShare}
                />
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' },
  close: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  content: { padding: 20 },
  when: { color: colors.text, fontSize: 16, fontWeight: '600' },
  where: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  description: { color: colors.textDim, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  rsvpBox: { marginTop: spacing.lg, marginBottom: spacing.sm },
  rsvpRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  rsvpBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rsvpBtnYes: { backgroundColor: colors.success, borderColor: colors.success },
  rsvpBtnNo: { backgroundColor: colors.danger, borderColor: colors.danger },
  rsvpText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rsvpTextActive: { color: colors.textOnDark },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.lg,
  },
  muted: { color: colors.textDim, fontSize: 14 },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  guestName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  guestMeta: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  remove: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: spacing.xl,
  },
  settingLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  settingHint: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  noteInfo: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
  inviteBox: { marginTop: spacing.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inviteError: { color: colors.danger, fontSize: 13, marginTop: 6 },
  errorText: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  retry: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { color: colors.textOnDark, fontWeight: '600' },
});
