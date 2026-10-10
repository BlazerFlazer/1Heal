import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { IconButton } from '@/shared/ui/IconButton';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Text } from '@/shared/ui/Text';

/** Pushed screens are reachable by deep link too, so "back" falls back to home. */
export function goBack(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

export type ScreenHeaderProps = {
  title: string;
  /** Hides the back button (e.g. while a payment is being confirmed). */
  backDisabled?: boolean;
  testID?: string;
};

/** Back arrow + title row drawn inside `Screen` (the member stack is headerless). */
export function ScreenHeader({ title, backDisabled = false, testID }: ScreenHeaderProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <View>
      <View style={[styles.row, { paddingHorizontal: spacing[2], gap: spacing[1] }]}>
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel={t('subscription.back')}
          onPress={goBack}
          disabled={backDisabled}
          testID={testID === undefined ? undefined : `${testID}-back`}
        />
        <Text variant="subtitle" accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      <OfflineBanner testID={testID === undefined ? undefined : `${testID}-offline`} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
});
