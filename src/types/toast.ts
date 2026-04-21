export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}
