import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { motion, useReduceMotion, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

export type BookingSuccessProps = {
  onMyBookings: () => void;
  onDone: () => void;
};

const CHECK_CIRCLE = 88;

/** Success step: a springy check mark (static under reduce motion) and the next actions. */
export function BookingSuccess({ onMyBookings, onDone }: BookingSuccessProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const reduceMotion = useReduceMotion();
  const circle = useSharedValue(reduceMotion ? 1 : 0);
  const tick = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    circle.set(withSpring(1, motion.spring));
    tick.set(withDelay(motion.durations.fast, withSpring(1, motion.spring)));
  }, [circle, tick, reduceMotion]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: circle.get(),
    transform: [{ scale: 0.5 + circle.get() * 0.5 }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: tick.get(),
    transform: [{ scale: tick.get() }, { rotate: `${(1 - tick.get()) * -30}deg` }],
  }));

  return (
    <View style={[styles.center, { gap: spacing[4] }]} testID="booking-success">
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: colors.successBg, borderRadius: radii.full },
          circleStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.inner,
            { backgroundColor: colors.success, borderRadius: radii.full },
            tickStyle,
          ]}
        >
          <Check size={32} color={colors.onSuccess} strokeWidth={3} />
        </Animated.View>
      </Animated.View>
      <View style={{ gap: spacing[2] }}>
        <Text
          variant="title"
          align="center"
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {t('booking.success.title')}
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          {t('booking.success.body')}
        </Text>
      </View>
      <View style={[styles.actions, { gap: spacing[3], marginTop: spacing[2] }]}>
        <Button
          label={t('booking.success.myBookings')}
          onPress={onMyBookings}
          size="lg"
          fullWidth
          testID="booking-success-bookings"
        />
        <Button
          label={t('booking.success.done')}
          onPress={onDone}
          variant="ghost"
          size="lg"
          fullWidth
          testID="booking-success-done"
        />
      </View>
    </View>
  );
}

const INNER = 60;

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  circle: {
    width: CHECK_CIRCLE,
    height: CHECK_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: INNER, height: INNER, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch' },
});
