import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

import type { OnboardingSlideDef } from './slides';
import { ONBOARDING_TEST_IDS } from './testIds';

export type OnboardingSlideProps = {
  slide: OnboardingSlideDef;
  /** Page width; every slide fills exactly one page of the pager. */
  width: number;
};

/** Share of the page width the illustration takes, capped so tablets do not get a poster. */
const ILLUSTRATION_RATIO = 0.7;
const ILLUSTRATION_MAX = 280;

/** One page of the pager: illustration, title and a short body. */
export function OnboardingSlide({ slide, width }: OnboardingSlideProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { key, Illustration } = slide;
  const illustrationSize = Math.min(width * ILLUSTRATION_RATIO, ILLUSTRATION_MAX);

  return (
    <View
      testID={ONBOARDING_TEST_IDS.slide(key)}
      style={[styles.slide, { width, paddingHorizontal: spacing[6], gap: spacing[8] }]}
    >
      <Illustration
        size={illustrationSize}
        accessibilityLabel={t(`onboarding.slides.${key}.illustration`)}
      />
      <View style={{ gap: spacing[2] }}>
        <Text variant="title" align="center" accessibilityRole="header">
          {t(`onboarding.slides.${key}.title`)}
        </Text>
        <Text color="textSecondary" align="center">
          {t(`onboarding.slides.${key}.body`)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, justifyContent: 'center' },
});
