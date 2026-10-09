import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/shared/theme';

import { ILLUSTRATION_VIEWBOX, type IllustrationProps } from './types';

/** Phone body and screen on the 200 × 200 grid. */
const PHONE = { x: 58, y: 18, width: 84, height: 164, rx: 16 } as const;
const SCREEN_INSET = 6;
const NOTCH = { width: 28, height: 5, rx: 2.5 } as const;
const STROKE = 2;

/** A symbolic 7 × 7 code: finder squares in three corners, data in the rest. */
const QR_PATTERN = [
  '1110111',
  '1010101',
  '1110111',
  '0010100',
  '1110110',
  '1000011',
  '1110101',
] as const;
const QR_CELL = 8;
const QR_ORIGIN = { x: 72, y: 56 } as const;

const BADGE = { cx: 140, cy: 150, r: 20 } as const;
const TICK_PATH = 'M130 150 L137 157 L151 142';
const TICK_WIDTH = 4;

/** Slide 2: a phone showing a QR code with a confirmation tick. */
export function QrIllustration({ size, accessibilityLabel, testID }: IllustrationProps) {
  const { colors } = useTheme();
  const cells = QR_PATTERN.flatMap((row, rowIndex) =>
    [...row].flatMap((cell, colIndex) =>
      cell === '1' ? [{ x: QR_ORIGIN.x + colIndex * QR_CELL, y: QR_ORIGIN.y + rowIndex * QR_CELL }] : [],
    ),
  );

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
          x={PHONE.x}
          y={PHONE.y}
          width={PHONE.width}
          height={PHONE.height}
          rx={PHONE.rx}
          fill={colors.surfaceElevated}
          stroke={colors.borderStrong}
          strokeWidth={STROKE}
        />
        <Rect
          x={PHONE.x + SCREEN_INSET}
          y={PHONE.y + SCREEN_INSET}
          width={PHONE.width - SCREEN_INSET * 2}
          height={PHONE.height - SCREEN_INSET * 2}
          rx={PHONE.rx - SCREEN_INSET}
          fill={colors.background}
        />
        <Rect
          x={PHONE.x + PHONE.width / 2 - NOTCH.width / 2}
          y={PHONE.y + SCREEN_INSET + 4}
          width={NOTCH.width}
          height={NOTCH.height}
          rx={NOTCH.rx}
          fill={colors.border}
        />
        {cells.map((cell) => (
          <Rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x}
            y={cell.y}
            width={QR_CELL}
            height={QR_CELL}
            fill={colors.textPrimary}
          />
        ))}
        <Circle
          cx={BADGE.cx}
          cy={BADGE.cy}
          r={BADGE.r}
          fill={colors.success}
          stroke={colors.background}
          strokeWidth={STROKE * 2}
        />
        <Path
          d={TICK_PATH}
          stroke={colors.onSuccess}
          strokeWidth={TICK_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center' },
});
