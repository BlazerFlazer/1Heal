import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ErrorState } from '@/shared/ui/ErrorState';
import { Screen } from '@/shared/ui/Screen';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen contentStyle={styles.center} testID="not-found">
      <ErrorState
        variant="notFound"
        primaryAction={{
          label: t('common.states.notFound.goHome'),
          onPress: () => router.replace('/'),
        }}
        testID="not-found-state"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
});
