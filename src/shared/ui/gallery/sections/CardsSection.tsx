import { Bell, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ElevationLevel } from '@/shared/theme/tokens';
import { Avatar } from '@/shared/ui/Avatar';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { ListItem } from '@/shared/ui/ListItem';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

const ELEVATIONS: readonly ElevationLevel[] = [0, 1, 2, 3];

/** Card (elevations, pressable, disabled), Divider, ListItem rows and a Section with an action. */
export function CardsSection() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const venue = t('ui.gallery.samples.venue');
  const address = t('ui.gallery.samples.address');
  const userName = t('ui.gallery.samples.userName');
  const press = () => {
    toast.show({ message: venue });
  };

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.variants')} direction="column">
        {ELEVATIONS.map((elevation) => (
          <Card key={elevation} elevation={elevation}>
            <Text>{t('ui.gallery.samples.cardBody')}</Text>
          </Card>
        ))}
        <Card radius="lg" onPress={press} accessibilityLabel={venue}>
          <Text>{venue}</Text>
          <Text variant="caption" color="textSecondary">
            {address}
          </Text>
        </Card>
        <Card onPress={press} disabled accessibilityLabel={venue}>
          <Text>{t('ui.gallery.labels.disabled')}</Text>
        </Card>
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.divider')} direction="column">
        <Divider />
        <Divider inset={4} />
        <View style={{ height: spacing[6], flexDirection: 'row' }}>
          <Divider orientation="vertical" />
        </View>
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.list')} direction="column">
        <Card padding={0}>
          <ListItem
            title={venue}
            subtitle={address}
            leading={<MapPin size={spacing[6]} color={colors.primary} />}
            onPress={press}
            divider
          />
          <ListItem
            title={venue}
            trailingText={t('ui.gallery.samples.distance')}
            onPress={press}
            divider
          />
          <ListItem
            title={userName}
            subtitle={address}
            leading={
              <Avatar
                name={userName}
                accessibilityLabel={t('ui.avatar.initialsLabel', { name: userName })}
              />
            }
            divider
          />
          <ListItem title={t('ui.gallery.labels.disabled')} onPress={press} disabled divider />
          <ListItem
            title={venue}
            leading={<Bell size={spacing[6]} color={colors.textSecondary} />}
            trailing={
              <Switch value={enabled} onValueChange={setEnabled} accessibilityLabel={venue} />
            }
          />
        </Card>
      </GalleryBlock>
      <Section
        title={t('ui.gallery.samples.title')}
        action={{ label: t('ui.gallery.samples.seeAll'), onPress: press }}
      >
        <Text color="textSecondary">{t('ui.gallery.samples.body')}</Text>
      </Section>
    </>
  );
}
