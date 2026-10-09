import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { useReduceMotion, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';

import { OnboardingSlide } from './OnboardingSlide';
import { PagerDots } from './PagerDots';
import { ONBOARDING_SLIDES, type OnboardingSlideDef } from './slides';
import { ONBOARDING_TEST_IDS } from './testIds';

export type OnboardingSlidesProps = {
  /** "Skip" on any slide. */
  onSkip: () => void;
  /** "Continue" on the last slide. */
  onFinish: () => void;
};

const SCROLL_EVENT_THROTTLE_MS = 16;

/** Three horizontally paged slides with dots, a skip button and a next/continue button. */
export function OnboardingSlides({ onSkip, onFinish }: OnboardingSlidesProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const listRef = useRef<FlatList<OnboardingSlideDef>>(null);
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
  });

  useEffect(() => {
    listRef.current?.scrollToIndex({ index, animated: !reduceMotion });
  }, [index, reduceMotion]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const settled = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(settled, 0), ONBOARDING_SLIDES.length - 1));
  };

  const onNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    setIndex((current) => current + 1);
  };

  return (
    <Screen padding={0} testID={ONBOARDING_TEST_IDS.screen}>
      <View style={[styles.header, { paddingHorizontal: spacing[4], paddingTop: spacing[2] }]}>
        <Button
          label={t('common.actions.skip')}
          onPress={onSkip}
          variant="ghost"
          size="sm"
          haptic="none"
          testID={ONBOARDING_TEST_IDS.skip}
        />
      </View>
      <Animated.FlatList
        ref={listRef}
        testID={ONBOARDING_TEST_IDS.pager}
        data={ONBOARDING_SLIDES}
        keyExtractor={(slide) => slide.key}
        renderItem={({ item }) => <OnboardingSlide slide={item} width={width} />}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE_MS}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        style={styles.flex}
      />
      <View style={{ padding: spacing[4], gap: spacing[6] }}>
        <PagerDots
          count={ONBOARDING_SLIDES.length}
          activeIndex={index}
          scrollX={scrollX}
          pageWidth={width}
          testID={ONBOARDING_TEST_IDS.dots}
        />
        <Button
          label={isLast ? t('common.actions.continue') : t('common.actions.next')}
          onPress={onNext}
          fullWidth
          testID={ONBOARDING_TEST_IDS.next}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
});
