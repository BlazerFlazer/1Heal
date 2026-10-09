import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { MIN_TOUCH } from '@/shared/theme/tokens';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

export type ConsentLineProps = {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  /** Links get `${testID}-terms` and `${testID}-privacy`. */
  testID?: string;
};

type ConsentLinkProps = { label: string; onPress: () => void; testID?: string };

/** Inline text link padded to the minimum touch target. */
function ConsentLink({ label, onPress, testID }: ConsentLinkProps) {
  const { typography } = useTheme();
  const slack = Math.max(0, (MIN_TOUCH - typography.caption.lineHeight) / 2);

  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: slack, bottom: slack }}
      testID={testID}
    >
      <Text variant="caption" color="primary" style={styles.link}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** "By continuing you accept the Terms and Privacy Policy", with both documents as links. */
export function ConsentLine({ onOpenTerms, onOpenPrivacy, testID }: ConsentLineProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <View testID={testID} style={[styles.row, { columnGap: spacing[1] }]}>
      <Text variant="caption" color="textSecondary">
        {t('auth.phone.consent')}
      </Text>
      <ConsentLink
        label={t('auth.phone.terms')}
        onPress={onOpenTerms}
        testID={testID === undefined ? undefined : `${testID}-terms`}
      />
      <Text variant="caption" color="textSecondary">
        {t('auth.phone.and')}
      </Text>
      <ConsentLink
        label={t('auth.phone.privacy')}
        onPress={onOpenPrivacy}
        testID={testID === undefined ? undefined : `${testID}-privacy`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  link: { textDecorationLine: 'underline' },
});
