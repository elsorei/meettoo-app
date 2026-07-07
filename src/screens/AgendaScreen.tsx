import { useCallback, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listEvents } from '../api/agenda';
import { ApiError } from '../api/client';
import type { AgendaEvent } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { WORDMARK } from '../branding';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Agenda'>;

const PAGE_SIZE = 50;

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
        <Text style={styles.cardMeta}>{event.location_name}</Text>
      ) : null}
      {event.participant_count > 0 ? (
        <Text style={styles.cardMeta}>
          {event.participant_count} partecipant
          {event.participant_count === 1 ? 'e' : 'i'}
        </Text>
      ) : null}
      {event.my_confirmation === 'pending' ? (
        <Text style={styles.cardBadge}>Rispondi all'invito</Text>
      ) : null}
    </View>
  );
}

/**
 * Lista eventi con paginazione (infinite scroll), pull-to-refresh e refresh
 * automatico quando la schermata torna in focus (es. dopo aver creato un
 * evento o risposto a un invito).
 */
export default function AgendaScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'more') => {
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'more') setLoadingMore(true);
    else setLoading(true);
    if (mode !== 'more') setError(null);

    const page = mode === 'more' ? pageRef.current + 1 : 1;
    try {
      const res = await listEvents({ limit: PAGE_SIZE, page });
      pageRef.current = res.pagination.page;
      totalPagesRef.current = res.pagination.totalPages;
      setEvents((prev) => (mode === 'more' ? [...prev, ...res.data] : res.data));
    } catch (e) {
      if (mode === 'more') {
        // Fallimento silenzioso del load-more: si ritenta allo scroll successivo.
      } else {
        setError(e instanceof ApiError ? e.message : 'Impossibile caricare l\'agenda.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Al focus (primo mount incluso): ricarica per riflettere eventi creati,
  // inviti risposti, ecc. Nessun setState dopo l'unmount: il cleanup di
  // useFocusEffect scatta alla perdita di focus, il flag lo previene.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!active) return;
        await load(events.length === 0 ? 'initial' : 'refresh');
      })();
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load])
  );

  const onEndReached = () => {
    if (loadingMore || loading || refreshing) return;
    if (pageRef.current >= totalPagesRef.current) return;
    void load('more');
  };

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
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Profilo"
        >
          <Text style={styles.headerLink}>Profilo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load('initial')}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`Apri ${item.title}`}
            >
              <EventRow event={item} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={styles.footerSpinner} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Agenda libera</Text>
              <Text style={styles.emptyBody}>
                Nessun evento in programma. Tocca + per crearne uno e invitare
                chi vuoi.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Crea un nuovo evento"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  wordmark: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  greeting: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  headerLink: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 80,
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 96, gap: spacing.md, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
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
  cardBadge: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptyBody: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  retry: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { color: colors.textOnDark, fontWeight: '600' },
  footerSpinner: { marginVertical: spacing.lg },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.textOnDark, fontSize: 32, lineHeight: 36, fontWeight: '400' },
});
