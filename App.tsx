import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import IntroScreen from './src/components/IntroScreen';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/auth/AuthContext';
import { SHOW_INTRO_ON_EVERY_LAUNCH } from './src/branding';

// Hold the native splash so it hands off seamlessly to the animated intro
// (rather than flashing the app for a frame first).
SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op: hiding still works even if this rejects */
});

export default function App() {
  const [introDone, setIntroDone] = useState(!SHOW_INTRO_ON_EVERY_LAUNCH);

  // If the intro is disabled, nothing else will drop the native splash — do it here.
  useEffect(() => {
    if (introDone) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [introDone]);

  // The animated intro is painted; safe to remove the native splash underneath it.
  const handleIntroReady = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <View style={styles.root}>
        <RootNavigator />
        {!introDone && (
          <IntroScreen
            onReady={handleIntroReady}
            onFinish={() => setIntroDone(true)}
          />
        )}
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
