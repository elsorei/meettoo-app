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
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createEvent } from '../api/agenda';
import { ApiError } from '../api/client';
import type { EventType } from '../api/types';
import { FormInput, PrimaryButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEvent'>;

const TYPE_OPTIONS: { value: EventType; label: string; hint: string }[] = [
  { value: 'appointment', label: 'Appuntamento', hint: 'Con orario e invitati' },
  { value: 'gathering', label: 'Evento', hint: 'Ritrovo, festa, uscita' },
  { value: 'commitment', label: 'Impegno', hint: 'Blocco in agenda' },
  { value: 'reminder', label: 'Promemoria', hint: 'Solo per te' },
];

function toDateString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Creazione evento: tipo, titolo, data/ora, luogo, descrizione. */
export default function CreateEventScreen({ navigation }: Props) {
  const [type, setType] = useState<EventType>('appointment');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  });
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  // Su Android i picker sono dialog che si aprono a richiesta.
  const [showPicker, setShowPicker] = useState<'date' | 'start' | 'end' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promemoria e impegni possono non avere orari; appuntamenti/eventi sì.
  const needsTimes = type === 'appointment' || type === 'gathering';
  const timesInvalid = needsTimes && end <= start;
  const canSubmit = title.trim().length > 0 && !timesInvalid && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createEvent({
        type,
        title: title.trim(),
        eventDate: toDateString(date),
        ...(needsTimes
          ? { startTime: toTimeString(start), endTime: toTimeString(end) }
          : {}),
        ...(location.trim() ? { locationName: location.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      // Dritto al dettaglio del nuovo evento, dove si invitano le persone.
      navigation.replace('EventDetail', { eventId: created.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Creazione non riuscita. Riprova.');
      setSubmitting(false);
    }
  }

  const pickerField = (
    label: string,
    valueLabel: string,
    key: 'date' | 'start' | 'end'
  ) => (
    <TouchableOpacity
      style={styles.pickerField}
      onPress={() => setShowPicker(showPicker === key ? null : key)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${valueLabel}`}
    >
      <Text style={styles.pickerLabel}>{label}</Text>
      <Text style={styles.pickerValue}>{valueLabel}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nuovo evento</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.close}>Annulla</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeChip, type === opt.value && styles.typeChipActive]}
                onPress={() => setType(opt.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: type === opt.value }}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === opt.value && styles.typeChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.typeHint}>
            {TYPE_OPTIONS.find((o) => o.value === type)?.hint}
          </Text>

          <FormInput
            label="Titolo"
            value={title}
            onChangeText={setTitle}
            placeholder="Es. Cena con gli amici"
            editable={!submitting}
          />

          {pickerField('Data', formatDateLabel(date), 'date')}
          {showPicker === 'date' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowPicker(null);
                if (d) setDate(d);
              }}
            />
          ) : null}

          {needsTimes ? (
            <>
              <View style={styles.timeRow}>
                <View style={styles.flex}>
                  {pickerField('Inizio', toTimeString(start), 'start')}
                </View>
                <View style={styles.flex}>
                  {pickerField('Fine', toTimeString(end), 'end')}
                </View>
              </View>
              {showPicker === 'start' || showPicker === 'end' ? (
                <DateTimePicker
                  value={showPicker === 'start' ? start : end}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    const target = showPicker;
                    if (Platform.OS !== 'ios') setShowPicker(null);
                    if (!d) return;
                    if (target === 'start') {
                      setStart(d);
                      // Mantieni la fine dopo l'inizio (default +1h).
                      if (end <= d) {
                        const next = new Date(d);
                        next.setHours(d.getHours() + 1);
                        setEnd(next);
                      }
                    } else {
                      setEnd(d);
                    }
                  }}
                />
              ) : null}
              {timesInvalid ? (
                <Text style={styles.error}>L'orario di fine deve seguire l'inizio.</Text>
              ) : null}
            </>
          ) : null}

          <FormInput
            label="Luogo (facoltativo)"
            value={location}
            onChangeText={setLocation}
            placeholder="Es. Piazza del Duomo, Milano"
            editable={!submitting}
          />
          <FormInput
            label="Descrizione (facoltativa)"
            value={description}
            onChangeText={setDescription}
            placeholder="Due righe per gli invitati"
            multiline
            numberOfLines={3}
            editable={!submitting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            title="Crea evento"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  close: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  typeChipTextActive: { color: colors.textOnDark },
  typeHint: { color: colors.textDim, fontSize: 13, marginTop: spacing.sm },
  pickerField: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  pickerLabel: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  pickerValue: { color: colors.text, fontSize: 16, marginTop: 2 },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.md },
});
