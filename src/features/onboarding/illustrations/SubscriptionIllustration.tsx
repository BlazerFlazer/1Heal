import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { LogoMark } from '@/shared/brand';
import { useTheme } from '@/shared/theme';

import { ILLUSTRATION_CENTER, ILLUSTRATION_VIEWBOX, type IllustrationProps } from './types';

/** Six venues on an orbit around the subscription card (positions on the 200 × 200 grid). */
const VENUES = [
  { x: 100, y: 28 },
  { x: 162, y: 64 },
  { x: 162, y: 136 },
  { x: 100, y: 172 },
  { x: 38, y: 136 },
  { x: 38, y: 64 },
] as const;
const ORBIT_RADIUS = 72;
const VENUE_RADIUS = 14;
const VENUE_DOT_RADIUS = 5;
const CARD = { width: 72, height: 48, rx: 12 } as const;
const STROKE = 2;
const MARK_RATIO = 0.16;

/** Slide 1: one subscription card connected to many venues. */
export function SubscriptionIllustration({ size, accessibilityLabel, testID }: IllustrationProps) {
  const { colors } = useTheme();
  const c = ILLUSTRATION_CENTER;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.frame, { width: size, height: size }]}
    >
      <Svg width={size} height={size} viewBox={ILLUSTRATION_VIEWBOX}>
        <Circle
          cx={c}
          cy={c}
          r={ORBIT_RADIUS}
          stroke={colors.border}
          strokeWidth={STROKE}
          strokeDasharray="4 6"
          fill="none"
        />
        {VENUES.map((venue) => (
          <Line
            key={`line-${venue.x}-${venue.y}`}
            x1={c}
            y1={c}
            x2={venue.x}
            y2={venue.y}
            stroke={colors.primarySubtle}
            strokeWidth={STROKE}
          />
        ))}
        <Rect
          x={c - CARD.width / 2}
          y={c - CARD.height / 2}
          width={CARD.width}
          height={CARD.height}
          rx={CARD.rx}
          fill={colors.primary}
        />
        {VENUES.map((venue) => (
          <Circle
            key={`venue-${venue.x}-${venue.y}`}
            cx={venue.x}
            cy={venue.y}
            r={VENUE_RADIUS}
            fill={colors.surfaceElevated}
            stroke={colors.primary}
            strokeWidth={STROKE}
          />
        ))}
        {VENUES.map((venue) => (
          <Circle
            key={`dot-${venue.x}-${venue.y}`}
            cx={venue.x}
            cy={venue.y}
            r={VENUE_DOT_RADIUS}
            fill={colors.primary}
          />
        ))}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <LogoMark size={size * MARK_RATIO} color={colors.onPrimary} decorative />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
