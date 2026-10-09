export type IllustrationProps = {
  /** Width and height in points; every illustration is square. */
  size: number;
  /** Spoken description of the scene. */
  accessibilityLabel: string;
  testID?: string;
};

/** Shared drawing surface: every scene is laid out on a 200 × 200 grid. */
export const ILLUSTRATION_VIEWBOX = '0 0 200 200';
export const ILLUSTRATION_CENTER = 100;
