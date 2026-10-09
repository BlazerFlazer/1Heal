import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ErrorState } from '@/shared/ui/ErrorState';
import { Screen } from '@/shared/ui/Screen';

import { parseLegalDoc } from './legalDocs';
import { LegalScreen } from './LegalScreen';
import { leaveLegal } from './navigation';
import { LEGAL_TEST_IDS } from './testIds';

export type LegalDocScreenProps = {
  /** Raw `[doc]` route param; anything but a known slug renders the not-found state. */
  doc: unknown;
};

function LegalNotFound() {
  const { t } = useTranslation();
  return (
    <Screen contentStyle={styles.center}>
      <ErrorState
        variant="notFound"
        title={t('legal.notFound.title')}
        body={t('legal.notFound.body')}
        primaryAction={{ label: t('common.actions.back'), onPress: leaveLegal }}
        testID={LEGAL_TEST_IDS.notFound}
      />
    </Screen>
  );
}

/** Validates the route param and renders the document or a not-found placeholder. */
export function LegalDocScreen({ doc }: LegalDocScreenProps) {
  const parsed = parseLegalDoc(doc);
  return parsed === null ? <LegalNotFound /> : <LegalScreen doc={parsed} />;
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
});
