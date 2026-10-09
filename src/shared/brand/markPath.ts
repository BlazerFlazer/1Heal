/**
 * The 1Heal mark: a rounded leaf whose vein forms a plus, drawn as one even-odd path in a
 * 256 x 256 box (the plus is a hole, so the mark works in any single colour on any background).
 * Source of truth for the shape is assets/brand/mark.svg; a test keeps the two in sync.
 */
export const MARK_VIEWBOX = '0 0 256 256' as const;

export const MARK_PATH =
  'M 115.27 24.66 A 18 18 0 0 1 140.73 24.66 L 163.36 47.29 A 100 100 0 0 1 163.36 188.71 L 138.34 213.72 A 8 8 0 0 0 136 219.38 L 136 228.6 A 8 8 0 0 1 128 236.6 A 8 8 0 0 1 120 228.6 L 120 219.38 A 8 8 0 0 0 117.66 213.72 L 92.64 188.71 A 100 100 0 0 1 92.64 47.29 Z M 119 89 A 9 9 0 0 1 128 80 A 9 9 0 0 1 137 89 L 137 111 A 2 2 0 0 0 139 113 L 161 113 A 9 9 0 0 1 170 122 A 9 9 0 0 1 161 131 L 139 131 A 2 2 0 0 0 137 133 L 137 155 A 9 9 0 0 1 128 164 A 9 9 0 0 1 119 155 L 119 133 A 2 2 0 0 0 117 131 L 95 131 A 9 9 0 0 1 86 122 A 9 9 0 0 1 95 113 L 117 113 A 2 2 0 0 0 119 111 Z' as const;
