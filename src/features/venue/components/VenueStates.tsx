import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { ErrorState } from '@/shared/ui/ErrorState';
import { IconButton } from '@/shared/ui/IconButton';
import { Screen } from '@/shared/ui/Screen';
import { SkeletonBox, SkeletonText } from '@/shared/ui/Skeleton';

/** Pushed screens are reachable by deep link too, so "back" falls back to the catalogue. */
export function leaveVenue(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/discover');
}

function BackRow() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing[2] }}>
      <IconButton
        icon={ArrowLeft}
        accessibilityLabel={t('venue.gallery.back')}
        onPress={leaveVenue}
        testID="venue-state-back"
      />
    </View>
  );
}

/** Photo, title and rows placeholders while the venue loads. */
export function VenueSkeleton() {
  const { spacing } = useTheme();
  return (
    <Screen edges={['top']} padding={0} header={<BackRow />} testID="venue-loading">
      <View style={{ gap: spacing[5], padding: spacing[4] }}>
        <SkeletonBox height={240} radius="lg" />
        <SkeletonText lines={2} width="80%" lastLineWidth="50%" aria-hidden />
        <SkeletonText lines={3} aria-hidden />
        <SkeletonBox height={120} radius="lg" aria-hidden />
      </View>
    </Screen>
  );
}

export type VenueErrorProps = {
  notFound: boolean;
  onRetry: () => void;
};

/** Unknown venue id (stale link) or a failed load. */
export function VenueError({ notFound, onRetry }: VenueErrorProps) {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom']} header={<BackRow />} testID="venue-error">
      {notFound ? (
        <ErrorState
          variant="notFound"
          title={t('venue.notFound.title')}
          body={t('venue.notFound.body')}
          primaryAction={{
            label: t('venue.notFound.back'),
            onPress: () => router.replace('/discover'),
          }}
          testID="venue-not-found"
        />
      ) : (
        <ErrorState onRetry={onRetry} testID="venue-load-error" />
      )}
    </Screen>
  );
}
