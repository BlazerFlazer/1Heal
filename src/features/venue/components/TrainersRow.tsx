import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Trainer } from '@/services/demo/types';
import { useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Text } from '@/shared/ui/Text';

const CARD_WIDTH = 168;
const MAX_SPECIALTIES = 2;

/** Horizontal strip of coaches: initials avatar, name and their main specialties. */
export function TrainersRow({ trainers }: { trainers: readonly Trainer[] }) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing[3], paddingHorizontal: spacing[4] }}
      testID="venue-trainers"
    >
      {trainers.map((trainer) => (
        <View
          key={trainer.id}
          style={[
            styles.card,
            { gap: spacing[2], padding: spacing[4], borderRadius: radii.lg },
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Avatar
            name={trainer.name}
            size="xl"
            accessibilityLabel={t('venue.trainers.avatar', { name: trainer.name })}
          />
          <Text variant="bodyStrong" align="center" numberOfLines={2}>
            {trainer.name}
          </Text>
          <Text variant="caption" color="textSecondary" align="center" numberOfLines={2}>
            {trainer.specialties
              .slice(0, MAX_SPECIALTIES)
              .map((key) => t(`venue.trainers.specialty.${key}`, { defaultValue: key }))
              .join(' · ')}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
});
