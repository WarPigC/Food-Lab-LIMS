import { useContext, useMemo } from "react";
import { ToastContext } from "../context/ToastContext";

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast, removeToast } = context;

  const toast = useMemo(() => {
    return {
      success: (message, opts) => addToast("success", message, opts),
      error: (message, opts) => addToast("error", message, opts),
      remove: removeToast,
    };
  }, [addToast, removeToast]);

  return toast;
}

export default useToast;
