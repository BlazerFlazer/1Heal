import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { ListItem } from '@/shared/ui/ListItem';
import { Sheet } from '@/shared/ui/Sheet';

export type SheetOption<K extends string> = { key: K; label: string };

export type OptionSheetProps<K extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly SheetOption<K>[];
  /** Currently selected key; omit for navigation lists without a selection. */
  value?: K;
  onSelect: (key: K) => void;
  /** Also applied as `${testID}-${key}` on each row (plus the Sheet's own suffixes). */
  testID?: string;
};

/** Bottom sheet with one tappable row per option; the selected one carries a check mark. */
export function OptionSheet<K extends string>({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  testID,
}: OptionSheetProps<K>) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title={title} testID={testID}>
      <View style={{ marginHorizontal: -spacing[4] }}>
        {options.map((option, index) => {
          const selected = option.key === value;
          return (
            <ListItem
              key={option.key}
              title={option.label}
              onPress={() => onSelect(option.key)}
              chevron={false}
              divider={index < options.length - 1}
              accessibilityHint={selected ? t('ui.chip.selected') : undefined}
              trailing={
                selected ? (
                  <View aria-hidden>
                    <Check size={spacing[5]} color={colors.primary} />
                  </View>
                ) : undefined
              }
              testID={testID === undefined ? undefined : `${testID}-${option.key}`}
            />
          );
        })}
      </View>
    </Sheet>
  );
}
