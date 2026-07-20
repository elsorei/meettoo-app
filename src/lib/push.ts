/**
 * Notifiche push (Expo). Registra il dispositivo, ottiene l'Expo push token e
 * lo invia al backend (PUT /api/auth/fcm-token). Il backend lo usa per
 * inviare push sui momenti sociali (nuovo invito, RSVP, promemoria).
 *
 * Nota: le push funzionano solo su device fisico (non sul simulatore) e in una
 * build EAS con projectId configurato. In sviluppo su Expo Go possono non
 * essere disponibili: gli errori sono gestiti in modo silenzioso.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { updateFcmToken } from '../api/auth';
import { colors } from '../theme';

// Notifiche in foreground: mostra banner + suono + badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Chiede il permesso, ottiene il token e lo registra sul backend.
 * Ritorna true se il token è stato registrato. Non lancia mai: qualunque
 * problema (permesso negato, simulatore, rete) è silenzioso.
 */
export async function registerForPush(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false; // niente push sul simulatore

    // Canale Android (obbligatorio per mostrare le notifiche).
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Predefinito',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: colors.primary,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return false;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (!token) return false;

    await updateFcmToken(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Registra i listener per i tap sulle notifiche. `onOpenEvent` viene chiamato
 * con l'eventId quando l'utente tocca una notifica che riguarda un evento
 * (data.eventId). Gestisce sia l'app in background sia l'avvio da notifica.
 * Ritorna una funzione di cleanup.
 */
export function addNotificationTapListener(
  onOpenEvent: (eventId: string) => void
): () => void {
  const handle = (resp: Notifications.NotificationResponse | null) => {
    const data = resp?.notification.request.content.data as
      | { eventId?: string }
      | undefined;
    if (data?.eventId) onOpenEvent(data.eventId);
  };

  // App avviata toccando una notifica da stato chiuso.
  Notifications.getLastNotificationResponseAsync().then(handle);
  // Tap mentre l'app è in background/foreground.
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
