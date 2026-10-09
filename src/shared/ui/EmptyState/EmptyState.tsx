import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

export type StateAction = { label: string; onPress: () => void };

export type EmptyStateTone = 'neutral' | 'error';

export type EmptyStateProps = {
  /** Lucide icon shown in a tinted circle. */
  icon?: LucideIcon;
  /** Custom illustration; replaces the icon circle. */
  illustration?: ReactNode;
  /** Defaults to `ui.emptyState.defaultTitle`. */
  title?: string;
  body?: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  /** Tint of the icon circle. Defaults to neutral (green). */
  tone?: EmptyStateTone;
  accessibilityLiveRegion?: ViewProps['accessibilityLiveRegion'];
  style?: StyleProp<ViewStyle>;
  /** Also applied as `${testID}-icon`, `${testID}-primary` and `${testID}-secondary`. */
  testID?: string;
};

/** Copy never stretches wider than this, so long lines stay readable on tablets. */
const MAX_COPY_WIDTH = 320;

/** Centred placeholder: optional icon, title, body and up to two actions. */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  body,
  primaryAction,
  secondaryAction,
  tone = 'neutral',
  accessibilityLiveRegion,
  style,
  testID,
}: EmptyStateProps) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const circle = spacing[16] + spacing[2];
  const tint =
    tone === 'error'
      ? { background: colors.errorBg, foreground: colors.onErrorBg }
      : { background: colors.primarySubtle, foreground: colors.onPrimarySubtle };
  const sub = (suffix: string) => (testID === undefined ? undefined : `${testID}-${suffix}`);

  return (
    <View
      testID={testID}
      accessibilityLiveRegion={accessibilityLiveRegion}
      style={[styles.root, { padding: spacing[6], gap: spacing[3] }, style]}
    >
      {illustration ??
        (Icon ? (
          <View
            testID={sub('icon')}
            aria-hidden
            style={[
              styles.circle,
              {
                width: circle,
                height: circle,
                borderRadius: radii.full,
                backgroundColor: tint.background,
                marginBottom: spacing[2],
              },
            ]}
          >
            <Icon size={spacing[8]} color={tint.foreground} />
          </View>
        ) : null)}
      <Text variant="subtitle" align="center" accessibilityRole="header" style={styles.copy}>
        {title ?? t('ui.emptyState.defaultTitle')}
      </Text>
      {body ? (
        <Text color="textSecondary" align="center" style={styles.copy}>
          {body}
        </Text>
      ) : null}
      {primaryAction || secondaryAction ? (
        <View style={[styles.actions, { gap: spacing[2], marginTop: spacing[2] }]}>
          {primaryAction ? (
            <Button
              testID={sub('primary')}
              label={primaryAction.label}
              onPress={primaryAction.onPress}
            />
          ) : null}
          {secondaryAction ? (
            <Button
              testID={sub('secondary')}
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant="ghost"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  copy: { maxWidth: MAX_COPY_WIDTH },
  actions: { alignItems: 'center' },
});
