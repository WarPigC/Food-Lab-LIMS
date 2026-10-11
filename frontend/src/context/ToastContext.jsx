import React, { createContext, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { Check, X } from "lucide-react";

export const TOAST_VARIANTS = {
  success: {
    icon: <Check size={16} strokeWidth={2.2} />,
    accentColor: "var(--toast-accent-success)",
    defaultDuration: 4000,
  },
  error: {
    icon: <X size={16} strokeWidth={2.2} />,
    accentColor: "var(--toast-accent-error)",
    defaultDuration: 8000,
  },
};

export const ToastContext = createContext(null);

function ToastCard({ toast, onExitComplete }) {
  const variant = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.success;
  const accentColor = variant.accentColor;

  return (
    <div
      className={`toast-card ${toast.resolving ? "toast-exit" : "toast-enter"}`}
      onAnimationEnd={(e) => {
        if (toast.resolving && e.animationName === "toast-slide-out") {
          onExitComplete(toast.id);
        }
      }}
    >
      <div
        className="toast-stripe"
        style={{ backgroundColor: accentColor }}
      />
      <div
        style={{
          color: accentColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {variant.icon}
      </div>
      <span className="toast-message" title={toast.message}>
        {toast.message}
      </span>
      <div
        className="toast-progress-bar"
        style={{
          backgroundColor: accentColor,
          animation: `toast-progress ${toast.duration}ms linear forwards`,
        }}
      />
    </div>
  );
}

function ToastContainer({ toasts, onExitComplete }) {
  if (typeof document === "undefined" || !document.body) return null;

  return ReactDOM.createPortal(
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onExitComplete={onExitComplete}
        />
      ))}
    </div>,
    document.body
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToastImmediately = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startDismissal = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, resolving: true } : t))
    );
  }, []);

  const addToast = useCallback((type, message, opts = {}) => {
    const config = TOAST_VARIANTS[type] || TOAST_VARIANTS.success;
    const duration =
      typeof opts.duration === "number" ? opts.duration : config.defaultDuration;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newToast = {
      id,
      type,
      message,
      duration,
      resolving: false,
    };

    setToasts((prev) => {
      // Enforce cap of 3 visible toasts. If at cap, remove oldest active toast.
      let nextList = [...prev];
      if (nextList.length >= 3) {
        const evicted = nextList[0];
        if (timersRef.current.has(evicted.id)) {
          clearTimeout(timersRef.current.get(evicted.id));
          timersRef.current.delete(evicted.id);
        }
        nextList = nextList.slice(1);
      }
      return [...nextList, newToast];
    });

    const timer = setTimeout(() => {
      startDismissal(id);
    }, duration);

    timersRef.current.set(id, timer);
    return id;
  }, [startDismissal]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast: removeToastImmediately }}>
      {children}
      <ToastContainer toasts={toasts} onExitComplete={removeToastImmediately} />
    </ToastContext.Provider>
  );
}
