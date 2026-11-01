import React, {
  createContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import ReactDOM from "react-dom";
import {
  Check,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
} from "lucide-react";

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
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);
  const accentColor = "var(--color-danger, #EF4444)";

  const hasRetry = typeof modal.onRetry === "function";

  const handleDismiss = () => {
    if (typeof modal.onDismiss === "function") {
      modal.onDismiss();
    } else if (typeof modal.onConfirm === "function") {
      modal.onConfirm();
    }
    onResolve(false);
  };

  const handleRetry = () => {
    if (typeof modal.onRetry === "function") {
      modal.onRetry();
    }
    onResolve(true);
  };

  const handleCopyDebug = async () => {
    if (!modal.debugInfo) return;
    try {
      const text = typeof modal.debugInfo === "string"
        ? modal.debugInfo
        : JSON.stringify(modal.debugInfo, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Could not copy debug info to clipboard:", e);
    }
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

      {modal.debugInfo && (
        <div className="modal-debug-container">
          <div className="modal-debug-header">
            <button
              type="button"
              className="modal-debug-toggle"
              onClick={() => setShowDebug(!showDebug)}
              aria-expanded={showDebug}
            >
              {showDebug ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Technical Details</span>
            </button>
            <button
              type="button"
              className="modal-debug-copy-btn"
              onClick={handleCopyDebug}
              title="Copy details to clipboard"
            >
              {copied ? <Check size={13} style={{ color: "var(--color-success)" }} /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy Debug Info"}</span>
            </button>
          </div>
          {showDebug && (
            <pre className="modal-debug-panel">
              {typeof modal.debugInfo === "string"
                ? modal.debugInfo
                : JSON.stringify(modal.debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary modal-btn"
          style={{
            borderColor: hasRetry ? "var(--color-border)" : accentColor,
            color: hasRetry ? "var(--color-text-main)" : accentColor,
          }}
          onClick={handleDismiss}
          autoFocus={!hasRetry}
        >
          {modal.dismissLabel || (hasRetry ? "Close" : "Go Back & Fix")}
        </button>
        {hasRetry && (
          <button
            type="button"
            className="btn btn-primary modal-btn"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
            onClick={handleRetry}
            autoFocus
          >
            <RefreshCw size={15} />
            <span>{modal.retryLabel || "Retry"}</span>
          </button>
        )}
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

function CustomModalChildWrapper({ target, resolve, close, modalProps }) {
  if (typeof target === "function") {
    const TargetComponent = target;
    return <TargetComponent resolve={resolve} close={close} {...modalProps} />;
  }
  if (React.isValidElement(target)) {
    return React.cloneElement(target, { resolve, close });
  }
  return target;
}

function CustomModalView({ modal, onResolve }) {
  const showClose = modal.showClose !== false;
  const content =
    modal.content ||
    modal.render ||
    modal.component ||
    modal.children ||
    modal.body;
  const hasHeader =
    modal.header !== false && Boolean(modal.title || modal.icon || showClose);

  const cardStyle = {
    ...(modal.accentColor
      ? { borderTop: `4px solid ${modal.accentColor}` }
      : {}),
    ...(modal.maxWidth ? { maxWidth: modal.maxWidth } : {}),
    ...(modal.style || {}),
  };

  const close = useCallback(
    (val = null) => {
      if (typeof modal.onDismiss === "function") {
        modal.onDismiss();
      }
      onResolve(val);
    },
    [modal, onResolve]
  );

  const resolve = useCallback(
    (val) => {
      if (typeof modal.onConfirm === "function") {
        modal.onConfirm(val);
      }
      onResolve(val);
    },
    [modal, onResolve]
  );

  if (modal.frameless) {
    return (
      <div
        className={modal.className || undefined}
        style={modal.style || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <CustomModalChildWrapper
          target={content}
          resolve={resolve}
          close={close}
          modalProps={modal.props}
        />
      </div>
    );
  }

  return (
    <div
      className={`modal-card${modal.wide ? " modal-card--wide" : ""}${
        modal.className ? ` ${modal.className}` : ""
      }`}
      style={cardStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {hasHeader && (
        <div className="modal-header modal-header--custom">
          <div className="modal-header-content">
            {modal.icon && <span className="modal-header-icon">{modal.icon}</span>}
            {modal.title &&
              (typeof modal.title === "string" ? (
                <h3 className="modal-title">{modal.title}</h3>
              ) : (
                modal.title
              ))}
          </div>
          {showClose && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => close(null)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      {content && (
        <div className="modal-custom-content">
          <CustomModalChildWrapper
            target={content}
            resolve={resolve}
            close={close}
            modalProps={modal.props}
          />
        </div>
      )}

      {modal.detail && (
        <div className="modal-detail-panel">{modal.detail}</div>
      )}

      {modal.footer && (
        <div className="modal-footer">
          <CustomModalChildWrapper
            target={modal.footer}
            resolve={resolve}
            close={close}
            modalProps={modal.props}
          />
        </div>
      )}
    </div>
  );
}

function ModalPortal({ currentModal, onResolve }) {
  useEffect(() => {
    if (!currentModal) return;

    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        if (currentModal.type === "custom") {
          if (currentModal.dismissOnEsc !== false) {
            e.preventDefault();
            if (typeof currentModal.onDismiss === "function") {
              currentModal.onDismiss();
            }
            onResolve(null);
          }
          return;
        }
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

    if (currentModal.type === "custom") {
      if (currentModal.dismissOnBackdrop !== false) {
        if (typeof currentModal.onDismiss === "function") {
          currentModal.onDismiss();
        }
        onResolve(null);
      }
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
      {currentModal.type === "custom" && (
        <CustomModalView modal={currentModal} onResolve={onResolve} />
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__appModal = {
        openModal,
        resolveModal,
        confirm: (opts = {}) => openModal("confirm", opts),
        error: (opts = {}) => {
          const config = typeof opts === "string" ? { body: opts } : opts;
          return openModal("error", config);
        },
        input: (opts = {}) => openModal("input", opts),
        custom: (opts = {}) => openModal("custom", opts),
        close: resolveModal,
      };
    }
  }, [openModal, resolveModal]);

  return (
    <ModalContext.Provider value={{ openModal, resolveModal }}>
      {children}
      <ModalPortal currentModal={currentModal} onResolve={resolveModal} />
    </ModalContext.Provider>
  );
}
