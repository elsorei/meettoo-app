import { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import {
  SLOGAN_ELLIPSIS,
  SLOGAN_LEAD,
  SLOGAN_TAGLINE,
  WORDMARK,
} from '../branding';
import { colors, introTiming } from '../theme';

type IntroScreenProps = {
  /** Fired once the first frame is laid out — the moment to hide the native splash. */
  onReady?: () => void;
  /** Fired when the intro has fully dissolved and the app should take over. */
  onFinish: () => void;
};

// expo-linear-gradient wants a readonly tuple of at least two colours.
const introGradient = [
  colors.introBackground,
  colors.introBackgroundMid,
  colors.introBackgroundEnd,
] as const;

/**
 * The opening of MeetToo: the slogan arrives in two beats — "agenda…" first,
 * then "meet anywhere with anyone" — holds, and dissolves to reveal the app.
 * Tap anywhere to skip; honours the OS "reduce motion" setting.
 */
export default function IntroScreen({ onReady, onFinish }: IntroScreenProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const leadOpacity = useRef(new Animated.Value(0)).current;
  const leadShift = useRef(new Animated.Value(14)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineShift = useRef(new Animated.Value(14)).current;

  const finished = useRef(false);
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const readyFired = useRef(false);

  const dissolve = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    running.current?.stop();
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: introTiming.fadeOut,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished: done }) => {
      if (done) onFinish();
    });
  }, [containerOpacity, onFinish]);

  useEffect(() => {
    let cancelled = false;

    const play = async () => {
      let reduceMotion = false;
      try {
        reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reduceMotion = false;
      }
      if (cancelled) return;

      if (reduceMotion) {
        // No staged motion: present everything, hold, then dissolve.
        leadShift.setValue(0);
        taglineShift.setValue(0);
        wordmarkOpacity.setValue(1);
        leadOpacity.setValue(1);
        taglineOpacity.setValue(1);
        const hold = Animated.delay(introTiming.reduceMotionHold);
        running.current = hold;
        hold.start(({ finished: done }) => {
          if (done && !cancelled) dissolve();
        });
        return;
      }

      const sequence = Animated.sequence([
        // Beat 1 — "agenda…" rises into view.
        Animated.parallel([
          Animated.timing(leadOpacity, {
            toValue: 1,
            duration: introTiming.leadIn,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(leadShift, {
            toValue: 0,
            duration: introTiming.leadIn,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(introTiming.holdAfterLead),
        // Beat 2 — the wordmark and the tagline arrive together.
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: introTiming.taglineIn,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: introTiming.taglineIn,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineShift, {
            toValue: 0,
            duration: introTiming.taglineIn,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(introTiming.hold),
      ]);

      running.current = sequence;
      sequence.start(({ finished: done }) => {
        if (done && !cancelled) dissolve();
      });
    };

    play();

    return () => {
      cancelled = true;
      running.current?.stop();
    };
  }, [
    dissolve,
    leadOpacity,
    leadShift,
    taglineOpacity,
    taglineShift,
    wordmarkOpacity,
  ]);

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (readyFired.current) return;
      readyFired.current = true;
      onReady?.();
    },
    [onReady],
  );

  return (
    <Animated.View
      style={[styles.overlay, { opacity: containerOpacity }]}
      onLayout={handleLayout}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={introGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      >
        <Pressable
          style={styles.center}
          onPress={dissolve}
          accessibilityRole="button"
          accessibilityLabel={`${WORDMARK}. ${SLOGAN_LEAD}, ${SLOGAN_TAGLINE}. Tap to continue.`}
        >
          <Animated.Text style={[styles.wordmark, { opacity: wordmarkOpacity }]}>
            {WORDMARK}
          </Animated.Text>

          <Animated.Text
            style={[
              styles.lead,
              { opacity: leadOpacity, transform: [{ translateY: leadShift }] },
            ]}
          >
            {SLOGAN_LEAD}
            <Text style={styles.ellipsis}>{SLOGAN_ELLIPSIS}</Text>
          </Animated.Text>

          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineOpacity,
                transform: [{ translateY: taglineShift }],
              },
            ]}
          >
            {SLOGAN_TAGLINE}
          </Animated.Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    color: colors.accentSoft,
    fontSize: 15,
    letterSpacing: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  lead: {
    color: colors.textOnDark,
    fontSize: 46,
    fontWeight: '200',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  ellipsis: {
    color: colors.accentSoft,
    fontWeight: '200',
  },
  tagline: {
    color: colors.textOnDarkDim,
    fontSize: 16.5,
    letterSpacing: 1.5,
    marginTop: 18,
    textAlign: 'center',
  },
});
