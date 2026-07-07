import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, type LinkingOptions } from '@react-navigation/native';
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
import { colors } from '../theme';

/** Route params of the whole app — the single source of truth for navigation. */
export type RootStackParamList = {
  // Unauthenticated
  Login: undefined;
  Register: { email?: string } | undefined;
  ForgotPassword: { email?: string } | undefined;
  // Authenticated
  Agenda: undefined;
  EventDetail: { eventId: string };
  CreateEvent: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Deep link: meettoo://e/<eventId> (e in futuro https://<dominio>/e/<id>)
 * apre direttamente il dettaglio evento — è il link contenuto nelle email
 * d'invito. Se l'utente non è loggato atterra sul Login e, una volta dentro,
 * ritroverà l'invito in agenda.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'meettoo://'],
  config: {
    screens: {
      EventDetail: 'e/:eventId',
      Register: 'register',
      ForgotPassword: 'reset-password',
    },
  },
};

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

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
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
