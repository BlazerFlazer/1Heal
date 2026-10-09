import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

export type GalleryBlockProps = {
  /** Caption above the samples ("Sizes", "Disabled"). */
  label: string;
  children: ReactNode;
  /** Wrapping row (default) or a stretched column. */
  direction?: 'row' | 'column';
  style?: StyleProp<ViewStyle>;
};

/** Labelled group of samples inside a gallery section. */
export function GalleryBlock({ label, children, direction = 'row', style }: GalleryBlockProps) {
  const { spacing } = useTheme();
  return (
    <View style={[{ gap: spacing[2] }, style]}>
      <Text variant="overline" color="textSecondary">
        {label.toUpperCase()}
      </Text>
      <View style={[direction === 'row' ? styles.row : styles.column, { gap: spacing[2] }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  column: { alignItems: 'stretch' },
});
