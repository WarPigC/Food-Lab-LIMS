import { useContext, useMemo } from "react";
import { ModalContext } from "../context/ModalContext";

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }

  const { openModal, resolveModal } = context;

  const modal = useMemo(() => {
    return {
      confirm: (opts = {}) => openModal("confirm", opts),
      error: (opts = {}) => {
        const config = typeof opts === "string" ? { body: opts } : opts;
        return openModal("error", config);
      },
      input: (opts = {}) => openModal("input", opts),
      close: resolveModal,
    };
  }, [openModal, resolveModal]);

  return modal;
}

export default useModal;
