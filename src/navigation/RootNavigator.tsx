import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
  type LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { useAuth } from '../auth/AuthContext';
import AgendaScreen from '../screens/AgendaScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import { colors } from '../theme';

/** Route params of the whole app — the single source of truth for navigation. */
export type RootStackParamList = {
  // Unauthenticated
  Login: undefined;
  Register: { email?: string } | undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { token?: string } | undefined;
  // Authenticated
  Agenda: undefined;
  EventDetail: { eventId: string };
  CreateEvent: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Deep link: meettoo://e/<eventId> (e in futuro https://<dominio>/e/<id>)
 * apre direttamente il dettaglio evento — è il link contenuto nelle email
 * d'invito. meettoo://reset-password?token=... apre il completamento reset.
 */
// Universal/App Links: gli inviti web sono https://<dominio-api>/e/<id>.
// Registrare il prefisso https permette a react-navigation di instradarli
// automaticamente quando l'OS apre l'app via universal link.
const API_ORIGIN = (() => {
  try {
    return process.env.EXPO_PUBLIC_API_URL
      ? new URL(process.env.EXPO_PUBLIC_API_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'meettoo://',
    ...(API_ORIGIN ? [API_ORIGIN] : []),
  ],
  config: {
    screens: {
      EventDetail: 'e/:eventId',
      Register: 'register',
      ResetPassword: 'reset-password',
    },
  },
};

/** Estrae l'eventId da un URL d'invito (meettoo://e/<id> o https://…/e/<id>). */
function eventIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = /(?:^|\/)e\/([0-9a-f-]{16,})/i.exec(url);
  return match ? match[1] : null;
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
    card: colors.background,
  },
};

export default function RootNavigator() {
  const { status } = useAuth();
  const url = Linking.useURL();

  // Un invito aperto da sloggato (EventDetail non esiste in quello stack)
  // viene parcheggiato qui e ripreso appena la sessione diventa attiva:
  // registrarsi dal link porta DRITTI all'evento — il cuore del loop virale.
  const pendingEventIdRef = useRef<string | null>(null);
  const eventId = eventIdFromUrl(url);
  if (eventId && status !== 'authenticated') {
    pendingEventIdRef.current = eventId;
  }

  useEffect(() => {
    if (status !== 'authenticated' || !pendingEventIdRef.current) return;
    const target = pendingEventIdRef.current;
    // Attendi che il container sia pronto (il primo render dopo il login).
    const timer = setInterval(() => {
      if (navigationRef.isReady()) {
        clearInterval(timer);
        pendingEventIdRef.current = null;
        navigationRef.navigate('EventDetail', { eventId: target });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'authenticated' ? (
          <>
            <Stack.Screen name="Agenda" component={AgendaScreen} />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="CreateEvent"
              component={CreateEventScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
