import { StyleSheet } from 'react-native';

import { ErrorState } from '@/shared/ui/ErrorState';
import { GalleryScreen } from '@/shared/ui/gallery';
import { Screen } from '@/shared/ui/Screen';

/** Component gallery, dev builds only; the route still exists in release builds, so hide it. */
export default function GalleryRoute() {
  if (!__DEV__) {
    return (
      <Screen contentStyle={styles.center} testID="gallery-hidden">
        <ErrorState variant="notFound" />
      </Screen>
    );
  }
  return <GalleryScreen />;
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
});
