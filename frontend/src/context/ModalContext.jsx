import React, {
  createContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import ReactDOM from "react-dom";
import { Check, Trash2, AlertTriangle, AlertCircle, X } from "lucide-react";

export const MODAL_VARIANTS = {
  default: {
    accentColor: "var(--color-primary, #2563EB)",
    icon: <Check size={26} strokeWidth={2.2} />,
    confirmBtnClass: "btn btn-primary",
  },
  danger: {
    accentColor: "var(--color-danger, #EF4444)",
    icon: <Trash2 size={26} strokeWidth={2.2} />,
    confirmBtnClass: "btn btn-danger",
  },
  warning: {
    accentColor: "var(--color-warning, #F59E0B)",
    icon: <AlertTriangle size={26} strokeWidth={2.2} />,
    confirmBtnClass: "btn",
    confirmBtnStyle: {
      backgroundColor: "var(--color-warning, #F59E0B)",
      color: "#ffffff",
      border: "none",
    },
  },
};

export const ModalContext = createContext(null);

function ConfirmModalView({ modal, onResolve }) {
  const variantKey = modal.variant || "default";
  const variant = MODAL_VARIANTS[variantKey] || MODAL_VARIANTS.default;
  const showCancel = modal.cancelLabel !== null && modal.cancelLabel !== false;

  const handleConfirm = () => {
    if (typeof modal.onConfirm === "function") {
      modal.onConfirm();
    }
    onResolve(true);
  };

  const handleCancel = () => {
    onResolve(false);
  };

  return (
    <div
      className={`modal-card${modal.wide ? " modal-card--wide" : ""}`}
      style={{ borderTop: `4px solid ${variant.accentColor}` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header" style={{ color: variant.accentColor }}>
        {variant.icon}
        <h3 className="modal-title">{modal.title || "Confirm Action"}</h3>
      </div>

      {modal.body && (
        <div className="modal-body">
          {typeof modal.body === "string" ? modal.body : modal.body}
        </div>
      )}

      {modal.detail && (
        <div className="modal-detail-panel">{modal.detail}</div>
      )}

      <div className="modal-footer">
        {showCancel && (
          <button
            type="button"
            className="btn btn-secondary modal-btn"
            onClick={handleCancel}
          >
            {modal.cancelLabel || "Cancel"}
          </button>
        )}
        <button
          type="button"
          className={`${variant.confirmBtnClass} modal-btn`}
          style={variant.confirmBtnStyle}
          onClick={handleConfirm}
          autoFocus
        >
          {modal.confirmLabel || "Confirm"}
        </button>
      </div>
    </div>
  );
}

function ErrorModalView({ modal, onResolve }) {
  const accentColor = "var(--color-danger, #EF4444)";

  const handleDismiss = () => {
    if (typeof modal.onConfirm === "function") {
      modal.onConfirm();
    }
    onResolve(true);
  };

  return (
    <div
      className={`modal-card${modal.wide ? " modal-card--wide" : ""}`}
      style={{ borderTop: `4px solid ${accentColor}` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header" style={{ color: accentColor }}>
        <AlertTriangle size={26} strokeWidth={2.2} />
        <h3 className="modal-title">{modal.title || "Validation Error"}</h3>
      </div>

      <div className="modal-body modal-body-prewrap">
        {modal.body || "An unexpected error occurred."}
      </div>

      {modal.detail && (
        <div className="modal-detail-panel">{modal.detail}</div>
      )}

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary modal-btn"
          style={{
            borderColor: accentColor,
            color: accentColor,
          }}
          onClick={handleDismiss}
          autoFocus
        >
          {modal.dismissLabel || "Go Back & Fix"}
        </button>
      </div>
    </div>
  );
}

function InputModalView({ modal, onResolve }) {
  const [value, setValue] = useState(modal.defaultValue || "");
  const isRequired = modal.required !== false;
  const isMultiline = modal.multiline !== false;
  const accentColor = "var(--color-primary, #2563EB)";

  const isConfirmDisabled = isRequired && !value.trim();

  const handleConfirm = (e) => {
    if (e) e.preventDefault();
    if (isConfirmDisabled) return;
    const trimmed = value.trim();
    if (typeof modal.onConfirm === "function") {
      modal.onConfirm(trimmed);
    }
    onResolve(trimmed);
  };

  const handleCancel = () => {
    onResolve(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!isMultiline) {
        e.preventDefault();
        handleConfirm();
      } else if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleConfirm();
      }
    }
  };

  return (
    <div
      className={`modal-card${modal.wide ? " modal-card--wide" : ""}`}
      style={{ borderTop: `4px solid ${accentColor}` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header" style={{ color: accentColor }}>
        <AlertCircle size={26} strokeWidth={2.2} />
        <h3 className="modal-title">{modal.title || "Input Required"}</h3>
      </div>

      {modal.body && <div className="modal-body">{modal.body}</div>}

      <form onSubmit={handleConfirm}>
        <div className="modal-input-container">
          {isMultiline ? (
            <textarea
              className="modal-input-field modal-textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={modal.placeholder || "Enter details..."}
              rows={4}
              required={isRequired}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="modal-input-field"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={modal.placeholder || "Enter value..."}
              required={isRequired}
              autoFocus
            />
          )}
        </div>

        {modal.detail && (
          <div className="modal-detail-panel">{modal.detail}</div>
        )}

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary modal-btn"
            onClick={handleCancel}
          >
            {modal.cancelLabel || "Cancel"}
          </button>
          <button
            type="submit"
            className="btn btn-primary modal-btn"
            disabled={isConfirmDisabled}
          >
            {modal.confirmLabel || "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalPortal({ currentModal, onResolve }) {
  useEffect(() => {
    if (!currentModal) return;

    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (currentModal.type === "input") {
          onResolve(null);
        } else if (currentModal.type === "error") {
          onResolve(true);
        } else {
          onResolve(false);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (currentModal.type === "confirm") {
          e.preventDefault();
          if (typeof currentModal.onConfirm === "function") {
            currentModal.onConfirm();
          }
          onResolve(true);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [currentModal, onResolve]);

  if (!currentModal || typeof document === "undefined" || !document.body) {
    return null;
  }

  const handleBackdropClick = () => {
    // Danger confirm modals require an explicit button click
    if (
      currentModal.type === "confirm" &&
      currentModal.variant === "danger"
    ) {
      return;
    }

    if (currentModal.type === "input") {
      onResolve(null);
    } else if (currentModal.type === "error") {
      onResolve(true);
    } else {
      onResolve(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      {currentModal.type === "confirm" && (
        <ConfirmModalView modal={currentModal} onResolve={onResolve} />
      )}
      {currentModal.type === "error" && (
        <ErrorModalView modal={currentModal} onResolve={onResolve} />
      )}
      {currentModal.type === "input" && (
        <InputModalView modal={currentModal} onResolve={onResolve} />
      )}
    </div>,
    document.body
  );
}

export function ModalProvider({ children }) {
  const [currentModal, setCurrentModal] = useState(null);
  const queueRef = useRef([]);
  const resolversRef = useRef(new Map());
  const nextTimeoutRef = useRef(null);

  const resolveModal = useCallback((result) => {
    setCurrentModal((active) => {
      if (active) {
        const resolver = resolversRef.current.get(active.id);
        if (resolver) {
          resolver(result);
          resolversRef.current.delete(active.id);
        }
      }
      return null;
    });

    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
    }

    nextTimeoutRef.current = setTimeout(() => {
      nextTimeoutRef.current = null;
      if (queueRef.current.length > 0) {
        const nextModal = queueRef.current.shift();
        setCurrentModal(nextModal);
      }
    }, 150);
  }, []);

  const openModal = useCallback((type, config = {}) => {
    return new Promise((resolve) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const modalItem = {
        id,
        type,
        ...config,
      };

      resolversRef.current.set(id, resolve);

      setCurrentModal((active) => {
        if (!active && !nextTimeoutRef.current) {
          return modalItem;
        } else {
          queueRef.current.push(modalItem);
          return active;
        }
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, resolveModal }}>
      {children}
      <ModalPortal currentModal={currentModal} onResolve={resolveModal} />
    </ModalContext.Provider>
  );
}
