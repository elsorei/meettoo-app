import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getEvent, updateEvent } from '../api/agenda';
import { ApiError } from '../api/client';
import { inviteGuest, removeGuest } from '../api/guests';
import type { EventDetail, EventGuest } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const STATUS_LABEL: Record<EventGuest['status'], string> = {
  pending: 'In attesa',
  accepted: 'Confermato',
  declined: 'Rifiutato',
};

const ERROR_RED = '#D14343';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface Props {
  /** The event to show; `null` keeps the modal closed. */
  eventId: string | null;
  onClose: () => void;
  /** Fired after any change that the agenda list should reflect. */
  onChanged?: () => void;
}

/**
 * Event detail as a bottom sheet: guest list, the creator's "guests can invite
 * others" toggle, and — when the server says the current user `can_invite` — a
 * box to invite someone by email. Authorization is the API's job; this screen
 * only reflects `can_invite` / ownership in what it shows.
 */
export default function EventDetailScreen({ eventId, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);

  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getEvent(id, signal);
      setEvent(detail);
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      setError(
        e instanceof ApiError ? e.message : 'Impossibile caricare l’evento.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setEvent(null);
    setEmail('');
    setInviteError(null);
    const controller = new AbortController();
    void load(eventId, controller.signal);
    return () => controller.abort();
  }, [eventId, load]);

  const isOwner = !!event && !!user && event.owner_id === user.id;

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
      onChanged?.();
    } catch (e) {
      setInviteError(
        e instanceof ApiError ? e.message : 'Invito non riuscito.'
      );
    } finally {
      setInviting(false);
    }
  }, [event, email, load, onChanged]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!event) return;
      setSavingToggle(true);
      setEvent((prev) =>
        prev ? { ...prev, allow_guests_to_invite: next } : prev
      );
      try {
        const updated = await updateEvent(event.id, {
          allow_guests_to_invite: next,
        });
        setEvent(updated);
        onChanged?.();
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
    [event, onChanged]
  );

  const handleRemove = useCallback(
    (guest: EventGuest) => {
      if (!event) return;
      const label = guest.name ?? guest.email ?? 'questo invitato';
      Alert.alert('Rimuovere invitato', `Vuoi rimuovere ${label} dall’evento?`, [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeGuest(event.id, guest.id);
                await load(event.id);
                onChanged?.();
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
    [event, load, onChanged]
  );

  return (
    <Modal
      visible={eventId !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event?.title ?? 'Evento'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
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
            <TouchableOpacity
              style={styles.retry}
              onPress={() => eventId && load(eventId)}
            >
              <Text style={styles.retryText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : event ? (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.content}>
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
                  />
                </View>
              ) : event.allow_guests_to_invite ? (
                <Text style={styles.noteInfo}>
                  L’organizzatore consente agli invitati di invitarne altri.
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
                  />
                  {inviteError ? (
                    <Text style={styles.inviteError}>{inviteError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.inviteBtn, inviting && styles.inviteBtnDisabled]}
                    onPress={handleInvite}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator color={colors.textOnDark} />
                    ) : (
                      <Text style={styles.inviteBtnText}>Invita</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' },
  close: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: { padding: 20 },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
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
  remove: { color: ERROR_RED, fontSize: 14, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 20,
  },
  settingLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  settingHint: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  noteInfo: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 16,
    fontStyle: 'italic',
  },
  inviteBox: { marginTop: 24 },
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
  inviteError: { color: ERROR_RED, fontSize: 13, marginTop: 6 },
  inviteBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inviteBtnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: colors.textOnDark, fontSize: 15, fontWeight: '700' },
  errorText: { color: ERROR_RED, fontSize: 15, textAlign: 'center' },
  retry: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: colors.textOnDark, fontWeight: '600' },
});
