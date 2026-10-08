import { Text, View } from 'react-native';

import { BRAND_NAME } from '@/shared/config/brand';

export default function Index() {
  return (
    <View accessibilityRole="summary">
      <Text>{BRAND_NAME}</Text>
    </View>
  );
}
