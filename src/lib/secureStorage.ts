/**
 * Secure key/value storage for auth tokens.
 *
 * On native (iOS/Android) this is backed by the platform keychain/keystore via
 * `expo-secure-store`. SecureStore is NOT available on web, so there we fall
 * back to `localStorage` (and to an in-memory map if even that is missing, e.g.
 * SSR). The token never lives in plain JS state longer than a request needs it.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

// In-memory fallback for environments without SecureStore or localStorage.
const memoryStore = new Map<string, string>();

function webGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function webSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function webDelete(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
  memoryStore.delete(key);
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) return webGet(key);
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webSet(key, value);
    return;
  }
  // ACCESSIBLE_AFTER_FIRST_UNLOCK lets background tasks (e.g. push handling)
  // read the token after the device has been unlocked once since boot.
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    webDelete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
