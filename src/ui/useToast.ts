import { createContext, useContext } from 'react';

/** How long a toast stays on screen; at least five seconds so it can be read. */
export const TOAST_MS = 6_000;

export const ToastContext = createContext<(message: string) => void>(() => {});

/** Shows a short confirmation after a state change: `const toast = useToast(); toast('Saved')`. */
export const useToast = () => useContext(ToastContext);
