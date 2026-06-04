import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { SLOGAN_TAGLINE, WORDMARK } from '../branding';
import { colors } from '../theme';

/**
 * Placeholder home screen — the surface the intro dissolves into.
 * Intentionally minimal; the real agenda UI will grow from here.
 */
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>{WORDMARK}</Text>
          <Text style={styles.tagline}>{SLOGAN_TAGLINE}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your agenda is clear</Text>
          <Text style={styles.cardBody}>
            Nothing on the calendar yet. This is where your meetings will live.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
  },
  wordmark: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.textDim,
    fontSize: 15,
    letterSpacing: 0.3,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  cardBody: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
