import { CircleAlert, Lock, SearchX, WifiOff, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';

import { EmptyState, type EmptyStateProps, type StateAction } from '@/shared/ui/EmptyState';

export type ErrorStateVariant = 'generic' | 'offline' | 'permissionDenied' | 'notFound';

export type ErrorStateProps = Omit<EmptyStateProps, 'tone' | 'accessibilityLiveRegion'> & {
  /** Picks the default icon, copy and primary action. Defaults to `generic`. */
  variant?: ErrorStateVariant;
  /** Renders a retry button: primary, or secondary when the variant has its own primary action. */
  onRetry?: () => void;
  /** Defaults to `ui.errorState.retry`. */
  retryLabel?: string;
};

const ICONS: Record<ErrorStateVariant, LucideIcon> = {
  generic: CircleAlert,
  offline: WifiOff,
  permissionDenied: Lock,
  notFound: SearchX,
};

/** `common.states.*` block that holds each variant's title and body. */
const COPY_KEYS: Record<ErrorStateVariant, string> = {
  generic: 'common.states.error',
  offline: 'common.states.offline',
  permissionDenied: 'common.states.permissionDenied',
  notFound: 'common.states.notFound',
};

/** Opens the OS settings page for the app so the user can grant a denied permission. */
export function openAppSettings(): void {
  if (Platform.OS === 'web') {
    return;
  }
  void Linking.openSettings().catch(() => undefined);
}

/** Error placeholder with per-variant defaults; every prop overrides its default. */
export function ErrorState({
  variant = 'generic',
  onRetry,
  retryLabel,
  icon,
  title,
  body,
  primaryAction,
  secondaryAction,
  ...rest
}: ErrorStateProps) {
  const { t } = useTranslation();
  const copy = COPY_KEYS[variant];
  const retry: StateAction | undefined = onRetry
    ? { label: retryLabel ?? t('ui.errorState.retry'), onPress: onRetry }
    : undefined;
  const openSettings: StateAction | undefined =
    variant === 'permissionDenied'
      ? { label: t(`${copy}.openSettings`), onPress: openAppSettings }
      : undefined;
  const primary = primaryAction ?? openSettings ?? retry;
  const secondary = secondaryAction ?? (primary === retry ? undefined : retry);

  return (
    <EmptyState
      {...rest}
      tone="error"
      accessibilityLiveRegion="polite"
      icon={icon ?? ICONS[variant]}
      title={title ?? t(`${copy}.title`)}
      body={body ?? t(`${copy}.body`)}
      primaryAction={primary}
      secondaryAction={secondary}
    />
  );
}
