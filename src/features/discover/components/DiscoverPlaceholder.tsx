import { Compass, Map, SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/shared/ui/EmptyState';

export type DiscoverView = 'list' | 'map';

export type DiscoverPlaceholderProps = {
  view: DiscoverView;
  /** Debounced, trimmed search text. */
  query: string;
};

/** What the results area shows before the catalogue (M3) exists: never a blank screen. */
export function DiscoverPlaceholder({ view, query }: DiscoverPlaceholderProps) {
  const { t } = useTranslation();

  if (view === 'map') {
    return (
      <EmptyState
        icon={Map}
        title={t('discover.map.title')}
        body={t('discover.map.body')}
        testID="discover-map-empty"
      />
    );
  }
  if (query.length > 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('discover.empty.search.title')}
        body={t('discover.empty.search.body', { query })}
        accessibilityLiveRegion="polite"
        testID="discover-search-empty"
      />
    );
  }
  return (
    <EmptyState
      icon={Compass}
      title={t('discover.empty.title')}
      body={t('discover.empty.body')}
      testID="discover-empty"
    />
  );
}
