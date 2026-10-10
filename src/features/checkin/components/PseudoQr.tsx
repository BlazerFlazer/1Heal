import { useMemo } from 'react';
import Svg, { G, Rect } from 'react-native-svg';

import { FINDER_ORIGINS, FINDER_SIZE, QR_MODULES, qrModules } from '../qrPattern';

export type PseudoQrProps = {
  userId: string;
  minute: number;
  size: number;
  color: string;
  background: string;
  accessibilityLabel: string;
  testID?: string;
};

/** Draws the decorative minute-rotating member code (see qrPattern.ts: not verifiable). */
export function PseudoQr({
  userId,
  minute,
  size,
  color,
  background,
  accessibilityLabel,
  testID,
}: PseudoQrProps) {
  const cells = useMemo(() => qrModules(userId, minute), [userId, minute]);
  const unit = size / QR_MODULES;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Rect x={0} y={0} width={QR_MODULES} height={QR_MODULES} fill={background} />
      {cells.map(([row, col]) => (
        <Rect
          key={`${row}-${col}`}
          x={col + 0.06}
          y={row + 0.06}
          width={0.88}
          height={0.88}
          rx={unit > 8 ? 0.2 : 0}
          fill={color}
        />
      ))}
      {FINDER_ORIGINS.map(([row, col]) => (
        <G key={`finder-${row}-${col}`}>
          <Rect x={col} y={row} width={FINDER_SIZE} height={FINDER_SIZE} rx={1.4} fill={color} />
          <Rect
            x={col + 1}
            y={row + 1}
            width={FINDER_SIZE - 2}
            height={FINDER_SIZE - 2}
            rx={0.9}
            fill={background}
          />
          <Rect x={col + 2} y={row + 2} width={3} height={3} rx={0.6} fill={color} />
        </G>
      ))}
    </Svg>
  );
}
