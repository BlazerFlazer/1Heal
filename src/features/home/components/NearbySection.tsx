import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/shared/ui/EmptyState';
import { Section } from '@/shared/ui/Section';
import { SkeletonList } from '@/shared/ui/Skeleton';

/** Until the catalogue query lands (M3) the section is either loading or empty. */
export type NearbyStatus = 'loading' | 'empty';

export type NearbySectionProps = { status: NearbyStatus };

const NEARBY_SKELETON_ROWS = 3;

function openDiscover(): void {
  router.push('/(member)/(tabs)/discover');
}

/** "Nearby venues": skeleton rows while loading, otherwise a nudge towards the catalogue. */
export function NearbySection({ status }: NearbySectionProps) {
  const { t } = useTranslation();

  return (
    <Section
      title={t('home.nearby.title')}
      action={{ label: t('home.nearby.seeAll'), onPress: openDiscover }}
      testID="home-nearby"
    >
      {status === 'loading' ? (
        <SkeletonList count={NEARBY_SKELETON_ROWS} testID="home-nearby-skeleton" />
      ) : (
        <EmptyState
          icon={MapPin}
          title={t('home.nearby.empty.title')}
          body={t('home.nearby.empty.body')}
          primaryAction={{ label: t('home.nearby.empty.cta'), onPress: openDiscover }}
          testID="home-nearby-empty"
        />
      )}
    </Section>
  );
}
