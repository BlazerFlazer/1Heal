import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { useTheme } from '@/shared/theme';

import { ILLUSTRATION_VIEWBOX, type IllustrationProps } from './types';

/** Calendar card on the 200 × 200 grid. */
const CARD = { x: 28, y: 36, width: 144, height: 132, rx: 16 } as const;
const HEADER_HEIGHT = 26;
const STROKE = 2;

const COLUMNS = 7;
const ROWS = 3;
const GRID = { x: 48, y: 88, stepX: 17.33, stepY: 30 } as const;
const DAY_RADIUS = 7;
const DAY_RING = 2;

/** Days with a visit, by [row, column]; row 1 is a full streak. */
const VISITED = new Set(['0-0', '0-2', '0-4', '1-1', '1-2', '1-3', '1-4', '1-5', '2-0', '2-1']);
const STREAK = { row: 1, from: 1, to: 5 } as const;
const TODAY = { row: 2, col: 2 } as const;

/** Slide 3: a month grid where visits and a streak light up. */
export function StreaksIllustration({ size, accessibilityLabel, testID }: IllustrationProps) {
  const { colors } = useTheme();
  const dayX = (col: number) => GRID.x + col * GRID.stepX;
  const dayY = (row: number) => GRID.y + row * GRID.stepY;
  const days = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, col) => ({ row, col })),
  ).flat();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.frame, { width: size, height: size }]}
    >
      <Svg width={size} height={size} viewBox={ILLUSTRATION_VIEWBOX}>
        <Rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.width}
          height={CARD.height}
          rx={CARD.rx}
          fill={colors.surfaceElevated}
          stroke={colors.border}
          strokeWidth={STROKE}
        />
        <Rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.width}
          height={HEADER_HEIGHT + CARD.rx}
          rx={CARD.rx}
          fill={colors.primarySubtle}
        />
        <Rect
          x={CARD.x}
          y={CARD.y + CARD.rx}
          width={CARD.width}
          height={HEADER_HEIGHT}
          fill={colors.primarySubtle}
        />
        <Rect
          x={dayX(STREAK.from) - DAY_RADIUS - DAY_RING * 2}
          y={dayY(STREAK.row) - DAY_RADIUS - DAY_RING * 2}
          width={dayX(STREAK.to) - dayX(STREAK.from) + (DAY_RADIUS + DAY_RING * 2) * 2}
          height={(DAY_RADIUS + DAY_RING * 2) * 2}
          rx={DAY_RADIUS + DAY_RING * 2}
          fill={colors.primarySubtle}
        />
        {days.map(({ row, col }) => {
          const visited = VISITED.has(`${row}-${col}`);
          const today = row === TODAY.row && col === TODAY.col;
          return (
            <Circle
              key={`${row}-${col}`}
              cx={dayX(col)}
              cy={dayY(row)}
              r={DAY_RADIUS}
              fill={visited ? colors.primary : colors.background}
              stroke={today ? colors.primary : colors.border}
              strokeWidth={today ? DAY_RING : STROKE / 2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center' },
});
