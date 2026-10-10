import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SkeletonBox, SkeletonList, SkeletonText } from '@/shared/ui/Skeleton';

function SkeletonCard() {
  const { spacing } = useTheme();
  const thumb = spacing[16] + spacing[2];
  return (
    <View style={[styles.row, { gap: spacing[3] }]}>
      <SkeletonBox aria-hidden width={thumb} height={thumb} radius="md" />
      <View style={styles.lines}>
        <SkeletonText aria-hidden lines={3} lastLineWidth="45%" />
      </View>
    </View>
  );
}

/** Placeholder while the membership ledger loads from device storage. */
export function BookingsSkeleton() {
  return (
    <SkeletonList count={3} gap={5} renderItem={() => <SkeletonCard />} testID="bookings-loading" />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  lines: { flex: 1 },
});
