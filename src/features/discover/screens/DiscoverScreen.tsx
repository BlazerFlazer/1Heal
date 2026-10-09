import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme';
import { Input } from '@/shared/ui/Input';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';

import { DiscoverPlaceholder, type DiscoverView } from '../components/DiscoverPlaceholder';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '../useDebouncedValue';

/** Venue catalogue chrome: search field, list/map toggle; results arrive with M3. */
export function DiscoverScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<DiscoverView>('list');
  const search = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  const views: readonly TabItem<DiscoverView>[] = [
    { key: 'list', label: t('discover.view.list') },
    { key: 'map', label: t('discover.view.map') },
  ];

  return (
    <Screen
      edges={['top']}
      header={<OfflineBanner testID="discover-offline" />}
      contentStyle={{ gap: spacing[4] }}
      testID="discover"
    >
      <Text variant="title" accessibilityRole="header">
        {t('discover.title')}
      </Text>
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t('discover.search.placeholder')}
        accessibilityLabel={t('discover.search.label')}
        leftIcon={Search}
        clearable
        clearLabel={t('discover.search.clear')}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        testID="discover-search"
      />
      <Tabs items={views} value={view} onChange={setView} testID="discover-view" />
      <DiscoverPlaceholder view={view} query={search} />
    </Screen>
  );
}
