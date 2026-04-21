import { createContext, useContext } from 'react';
import type { ToastItem } from '../ui/components/Toast';

export type ToastKind = ToastItem['kind'];

export interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const v = useContext(ToastContext);
  if (!v) throw new Error('ToastProvider is missing.');
  return v;
}
