import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { SpacingKey } from '@/shared/theme/tokens';

export type ScreenBackground = 'background' | 'surface';

export type ScreenProps = {
  children?: ReactNode;
  /** Scrolls the content and moves it out from under the keyboard on iOS. */
  scroll?: boolean;
  /** Spacing token applied around the content. Defaults to 4 (16pt). */
  padding?: SpacingKey;
  /** Rendered above the content, inside the safe area; never scrolls. */
  header?: ReactNode;
  /** Safe-area edges to pad. Defaults to top and bottom (tab bars and stack headers pad their own). */
  edges?: readonly Edge[];
  /** Background color role. Defaults to `background`. */
  background?: ScreenBackground;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  /** Style of the content container (the padded area that holds `children`). */
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Also applied as `${testID}-content` on the content container. */
  testID?: string;
};

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom'];

/** Safe-area aware page container: background token, optional scroll, header slot. */
export function Screen({
  children,
  scroll = false,
  padding = 4,
  header,
  edges = DEFAULT_EDGES,
  background = 'background',
  keyboardShouldPersistTaps = 'handled',
  contentStyle,
  style,
  testID,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const inset = (edge: Edge) => (edges.includes(edge) ? insets[edge] : 0);
  const pad = spacing[padding];
  const contentTestID = testID === undefined ? undefined : `${testID}-content`;

  const rootStyle = {
    backgroundColor: colors[background],
    paddingTop: inset('top'),
    paddingLeft: inset('left'),
    paddingRight: inset('right'),
  };
  const paddedContent = { padding: pad, paddingBottom: pad + inset('bottom') };

  return (
    <View testID={testID} style={[styles.flex, rootStyle, style]}>
      {header}
      {scroll ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
        >
          <ScrollView
            testID={contentTestID}
            style={styles.flex}
            contentContainerStyle={[styles.grow, paddedContent, contentStyle]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View testID={contentTestID} style={[styles.flex, paddedContent, contentStyle]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
});
