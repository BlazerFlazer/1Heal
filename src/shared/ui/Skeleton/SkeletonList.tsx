import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { SpacingKey } from '@/shared/theme/tokens';

import { SkeletonCircle, SkeletonText } from './Skeleton';

export type SkeletonListProps = {
  /** Defaults to 3 rows. */
  count?: number;
  gap?: SpacingKey;
  /** Custom row; defaults to avatar + two text lines. Render it `aria-hidden`. */
  renderItem?: (index: number) => ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function SkeletonRow() {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing[3] }]}>
      <SkeletonCircle aria-hidden />
      <View style={styles.lines}>
        <SkeletonText aria-hidden lines={2} lastLineWidth="40%" />
      </View>
    </View>
  );
}

/** Loading placeholder for a list; announced once as a single busy element. */
export function SkeletonList({ count = 3, gap = 4, renderItem, style, testID }: SkeletonListProps) {
  const { spacing } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('ui.skeleton.loading')}
      accessibilityState={{ busy: true }}
      style={[{ gap: spacing[gap] }, style]}
    >
      {Array.from({ length: count }, (_, index) => (
        <Fragment key={index}>{renderItem ? renderItem(index) : <SkeletonRow />}</Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  lines: { flex: 1 },
});
