import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { haptics } from '@/shared/theme/haptics';
import { useReduceMotion } from '@/shared/theme/motion';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH, spacing as spacingTokens } from '@/shared/theme/tokens';
import { Badge } from '@/shared/ui/Badge';
import { Text } from '@/shared/ui/Text';

import { useTabIndicator, type TabLayout } from './useTabIndicator';

/** Above this many items the tabs scroll horizontally instead of sharing the width. */
export const TABS_SCROLL_THRESHOLD = 4;

export type TabItem<K extends string = string> = {
  key: K;
  label: string;
  /** Count or short text shown in a badge after the label. */
  badge?: number | string;
  /** Spoken label; defaults to the label plus the badge. */
  accessibilityLabel?: string;
};

export type TabsProps<K extends string = string> = {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Horizontal scroll with content-sized tabs. Defaults to true above `TABS_SCROLL_THRESHOLD`. */
  scrollable?: boolean;
  /** Defaults to `ui.tabs.label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Also applied as `${testID}-scroll`, `${testID}-indicator` and `${testID}-${key}` per tab. */
  testID?: string;
};

/** Segmented tabs with a sliding indicator; `tablist`/`tab` roles and selected state. */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  scrollable = items.length > TABS_SCROLL_THRESHOLD,
  accessibilityLabel,
  style,
  testID,
}: TabsProps<K>) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  const scrollRef = useRef<ScrollView>(null);
  const active = layouts[value];
  const indicatorStyle = useTabIndicator(active);
  const sub = (suffix: string) => (testID === undefined ? undefined : `${testID}-${suffix}`);

  useEffect(() => {
    if (!scrollable || active === undefined) {
      return;
    }
    scrollRef.current?.scrollTo({ x: Math.max(0, active.x - spacing[4]), animated: !reduceMotion });
  }, [active, reduceMotion, scrollable, spacing]);

  const onTabLayout = (key: K) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((current) => {
      const previous = current[key];
      return previous?.x === x && previous.width === width
        ? current
        : { ...current, [key]: { x, width } };
    });
  };

  const tabs = items.map((item) => {
    const selected = item.key === value;
    const badge = item.badge;
    const label =
      item.accessibilityLabel ?? (badge === undefined ? item.label : `${item.label}, ${badge}`);
    return (
      <Pressable
        key={item.key}
        testID={sub(item.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onLayout={onTabLayout(item.key)}
        onPress={() => {
          if (selected) {
            return;
          }
          void haptics.selection();
          onChange(item.key);
        }}
        style={[styles.tab, scrollable ? styles.tabFitted : styles.tabShared]}
      >
        <Text variant="label" color={selected ? 'textPrimary' : 'textSecondary'} numberOfLines={1}>
          {item.label}
        </Text>
        {badge !== undefined ? (
          <Badge
            size="sm"
            tone={selected ? 'primary' : 'neutral'}
            count={typeof badge === 'number' ? badge : undefined}
            label={typeof badge === 'string' ? badge : undefined}
          />
        ) : null}
      </Pressable>
    );
  });

  const inner = (
    <>
      <Animated.View
        testID={sub('indicator')}
        pointerEvents="none"
        style={[
          styles.indicator,
          { backgroundColor: colors.surfaceElevated, borderRadius: radii.sm },
          theme.elevation(1),
          indicatorStyle,
        ]}
      />
      {tabs}
    </>
  );

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel ?? t('ui.tabs.label')}
      style={[
        { backgroundColor: colors.secondary, borderRadius: radii.md, padding: spacing[1] },
        style,
      ]}
    >
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          testID={sub('scroll')}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.row}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.row}>{inner}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  tab: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingTokens[1],
  },
  tabShared: { flex: 1, paddingHorizontal: spacingTokens[2] },
  tabFitted: { paddingHorizontal: spacingTokens[4] },
  indicator: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
