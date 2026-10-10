import {
  Dumbbell,
  Flame,
  Flower2,
  Hand,
  HeartPulse,
  LayoutGrid,
  Music,
  PersonStanding,
  Sparkles,
  Stethoscope,
  Swords,
  ThermometerSun,
  WavesLadder,
  type LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '@/shared/theme';

/** Lucide components for the kebab-case icon names stored on catalog categories. */
const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  'waves-ladder': WavesLadder,
  'flower-2': Flower2,
  'person-standing': PersonStanding,
  music: Music,
  swords: Swords,
  flame: Flame,
  sparkles: Sparkles,
  'thermometer-sun': ThermometerSun,
  hand: Hand,
  stethoscope: Stethoscope,
  'heart-pulse': HeartPulse,
};

/** The lucide component for a category icon name; unknown names fall back to a neutral grid. */
export function categoryIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutGrid;
}

export type CategoryIconProps = {
  /** Kebab-case lucide name from the data (e.g. "waves-ladder"). */
  icon: string;
  /** Defaults to 18pt. */
  size?: number;
  /** Defaults to the primary brand color. */
  color?: string;
};

/** Decorative category glyph; hidden from assistive tech (the category name carries meaning). */
export function CategoryIcon({ icon, size = 18, color }: CategoryIconProps) {
  const { colors } = useTheme();
  const Icon = ICONS[icon] ?? LayoutGrid;
  return <Icon size={size} color={color ?? colors.primary} strokeWidth={2} />;
}
