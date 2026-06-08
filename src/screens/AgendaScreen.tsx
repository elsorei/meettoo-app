import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { listEvents } from '../api/agenda';
import { ApiError } from '../api/client';
import type { AgendaEvent } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { WORDMARK } from '../branding';
import { colors } from '../theme';

const TYPE_LABEL: Record<AgendaEvent['type'], string> = {
  appointment: 'Appuntamento',
  commitment: 'Impegno',
  reminder: 'Promemoria',
  gathering: 'Evento',
};

/** Formats "2026-06-08" + "14:30:00" into a compact, human label. */
function formatWhen(event: AgendaEvent): string {
  const date = new Date(`${event.event_date}T00:00:00`);
  const day = date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (!event.start_time) return day;
  const time = event.start_time.slice(0, 5);
  return `${day} · ${time}`;
}

function EventRow({ event }: { event: AgendaEvent }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardType}>{TYPE_LABEL[event.type] ?? event.type}</Text>
        <Text style={styles.cardWhen}>{formatWhen(event)}</Text>
      </View>
      <Text style={styles.cardTitle}>{event.title}</Text>
      {event.location_name ? (
        <Text style={styles.cardMeta}>📍 {event.location_name}</Text>
      ) : null}
      {event.participant_count > 0 ? (
        <Text style={styles.cardMeta}>
          👥 {event.participant_count} partecipant
          {event.participant_count === 1 ? 'e' : 'i'}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The first screen wired to live backend data: it lists the signed-in user's
 * events from GET /api/events, with loading / error / empty / refresh states.
 */
export default function AgendaScreen() {
  const { user, signOut } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await listEvents({ limit: 50 });
      setEvents(res.data);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : 'Impossibile caricare l’agenda.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const greetingName = user?.name ?? user?.email ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.wordmark}>{WORDMARK}</Text>
          {greetingName ? (
            <Text style={styles.greeting}>Ciao, {greetingName}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={signOut} hitSlop={8}>
          <Text style={styles.signOut}>Esci</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load('initial')}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventRow event={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Agenda libera</Text>
              <Text style={styles.emptyBody}>
                Nessun evento in programma. Comparirà qui appena ne crei uno.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  wordmark: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  greeting: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  signOut: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  list: { paddingHorizontal: 24, paddingBottom: 32, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardType: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardWhen: { color: colors.textDim, fontSize: 13 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cardMeta: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptyBody: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: { color: '#D14343', fontSize: 15, textAlign: 'center' },
  retry: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: colors.textOnDark, fontWeight: '600' },
});
