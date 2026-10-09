import { ArrowLeft, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { IconButton } from '@/shared/ui/IconButton';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import { legalSectionsSchema, type LegalDoc, type LegalSection } from './legalDocs';
import { leaveLegal } from './navigation';
import { LEGAL_TEST_IDS } from './testIds';

export type LegalScreenProps = { doc: LegalDoc };

/** Sections of one document, read from `legal.docs.<doc>.sections` and validated at runtime. */
function useLegalSections(doc: LegalDoc): LegalSection[] {
  const { t } = useTranslation();
  const raw: unknown = t(`legal.docs.${doc}.sections`, { returnObjects: true });
  const parsed = legalSectionsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** Scrollable legal document with a draft banner; copy lives entirely in `legal.json`. */
export function LegalScreen({ doc }: LegalScreenProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const sections = useLegalSections(doc);
  const title = t(`legal.docs.${doc}.title`);

  return (
    <Screen
      scroll
      testID={LEGAL_TEST_IDS.screen}
      header={
        <View style={[styles.header, { paddingHorizontal: spacing[2], gap: spacing[2] }]}>
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('common.actions.back')}
            onPress={leaveLegal}
            testID={LEGAL_TEST_IDS.back}
          />
          <Text
            variant="subtitle"
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.headerTitle}
          >
            {title}
          </Text>
        </View>
      }
    >
      <View style={{ gap: spacing[6] }}>
        <View
          accessible
          accessibilityLabel={t('legal.draftBanner')}
          testID={LEGAL_TEST_IDS.banner}
          style={[
            styles.banner,
            {
              backgroundColor: colors.warningBg,
              borderRadius: radii.sm,
              padding: spacing[3],
              gap: spacing[2],
            },
          ]}
        >
          <TriangleAlert size={spacing[5]} color={colors.onWarningBg} />
          <Text variant="label" color="onWarningBg" style={styles.bannerText}>
            {t('legal.draftBanner')}
          </Text>
        </View>
        {sections.map((section, index) => (
          <View
            key={section.heading}
            testID={LEGAL_TEST_IDS.section(index)}
            style={{ gap: spacing[2] }}
          >
            <Text variant="subtitle" accessibilityRole="header">
              {section.heading}
            </Text>
            <Text color="textSecondary">{section.body}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center' },
  bannerText: { flex: 1 },
});
