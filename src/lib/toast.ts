"use client";

export type ToastVariant = "default" | "success" | "error";

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(title: string, options?: { description?: string; variant?: ToastVariant }) {
  counter += 1;
  const message: ToastMessage = {
    id: counter,
    title,
    description: options?.description,
    variant: options?.variant ?? "default",
  };
  listeners.forEach((listener) => listener(message));
}

export function subscribeToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
