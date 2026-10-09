import { createContext, useContext } from 'react';

import type { ToastOptions } from './toastQueue';

export type ToastHandle = { id: number; dismiss: () => void };

export type ToastApi = {
  show: (options: ToastOptions) => ToastHandle;
  dismiss: (id: number) => void;
  dismissAll: () => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

/** Imperative toast API; must be used under a `ToastProvider`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return api;
}
