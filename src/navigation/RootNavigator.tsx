import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import AgendaScreen from '../screens/AgendaScreen';
import LoginScreen from '../screens/LoginScreen';
import { colors } from '../theme';

/**
 * Picks the screen for the current session state. Deliberately tiny — a real
 * navigation stack (react-navigation) can replace this as the app grows.
 */
export default function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return status === 'authenticated' ? <AgendaScreen /> : <LoginScreen />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
