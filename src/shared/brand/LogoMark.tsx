import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BRAND_NAME } from '@/shared/config/brand';

import { MARK_PATH, MARK_VIEWBOX } from './markPath';

export type LogoMarkProps = {
  /** Width and height in points; the mark is square. Defaults to 32. */
  size?: number;
  /**
   * Fill colour. Required on purpose: the mark has no theme dependency so it can be used on the
   * splash and onboarding screens before the theme provider is mounted.
   */
  color: string;
  /**
   * Hides the mark from assistive technology. Use when a parent already announces the brand
   * (for example the lockup), so screen readers do not read the name twice.
   */
  decorative?: boolean;
  testID?: string;
};

/**
 * Pure SVG brand mark (leaf with a plus-shaped vein). The accessibility props sit on a wrapping
 * View: react-native-svg forwards unknown props to the DOM on web, which React rejects.
 */
export function LogoMark({ size = 32, color, decorative = false, testID }: LogoMarkProps) {
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : BRAND_NAME}
      aria-hidden={decorative}
      style={{ width: size, height: size }}
      testID={testID}
    >
      <Svg width={size} height={size} viewBox={MARK_VIEWBOX}>
        <Path d={MARK_PATH} fill={color} fillRule="evenodd" />
      </Svg>
    </View>
  );
}
