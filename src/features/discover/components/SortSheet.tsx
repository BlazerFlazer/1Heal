import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { VenueSort } from '@/services/demo/types';
import { MIN_TOUCH, useTheme } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/Pressable';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';

export const SORT_OPTIONS: readonly VenueSort[] = ['recommended', 'distance', 'rating'];

export type SortSheetProps = {
  visible: boolean;
  value: VenueSort;
  onChange: (sort: VenueSort) => void;
  onClose: () => void;
};

/** Bottom sheet with the three catalogue orderings as a radio group. */
export function SortSheet({ visible, value, onChange, onClose }: SortSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('discover.sort.title')}
      testID="discover-sort"
    >
      <View accessibilityRole="radiogroup" style={{ gap: spacing[2], paddingBottom: spacing[2] }}>
        {SORT_OPTIONS.map((option) => {
          const selected = option === value;
          return (
            <PressableScale
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={t(`discover.sort.${option}`)}
              accessibilityState={{ checked: selected }}
              hapticsEnabled
              onPress={() => {
                onChange(option);
                onClose();
              }}
              style={[
                styles.option,
                {
                  paddingHorizontal: spacing[4],
                  borderRadius: radii.md,
                  backgroundColor: selected ? colors.primarySubtle : colors.surface,
                },
              ]}
              testID={`discover-sort-${option}`}
            >
              <Text variant="bodyStrong" color={selected ? 'onPrimarySubtle' : 'textPrimary'}>
                {t(`discover.sort.${option}`)}
              </Text>
              {selected ? <Check size={20} color={colors.primary} /> : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
