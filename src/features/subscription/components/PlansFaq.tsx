import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MIN_TOUCH, useReduceMotion, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

const ITEMS = ['visits', 'freeze', 'cancel'] as const;
type FaqItem = (typeof ITEMS)[number];

/** Accordion with the three questions people ask before paying. */
export function PlansFaq() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [open, setOpen] = useState<FaqItem | null>(null);

  return (
    <View style={{ gap: spacing[3] }} testID="plans-faq">
      <Text variant="subtitle" accessibilityRole="header">
        {t('subscription.faq.title')}
      </Text>
      <Card radius="lg" padding={0} elevation={1}>
        {ITEMS.map((item, index) => (
          <View key={item}>
            {index > 0 ? <Divider /> : null}
            <FaqRow
              item={item}
              expanded={open === item}
              onToggle={() => setOpen((current) => (current === item ? null : item))}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

type FaqRowProps = { item: FaqItem; expanded: boolean; onToggle: () => void };

function FaqRow({ item, expanded, onToggle }: FaqRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const reduceMotion = useReduceMotion();
  const question = t(`subscription.faq.${item}.question`);

  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        scale={0.99}
        style={[styles.row, { padding: spacing[4], gap: spacing[3] }]}
        testID={`faq-${item}`}
      >
        <Text variant="bodyStrong" style={styles.question}>
          {question}
        </Text>
        <View style={expanded ? styles.rotated : null}>
          <ChevronDown size={20} color={colors.textSecondary} />
        </View>
      </PressableScale>
      {expanded ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(200)}
          style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}
        >
          <Text color="textSecondary">{t(`subscription.faq.${item}.answer`)}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH },
  question: { flex: 1 },
  rotated: { transform: [{ rotate: '180deg' }] },
});
