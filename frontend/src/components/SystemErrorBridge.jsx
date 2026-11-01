import { useEffect } from 'react';
import { useModal } from '../hooks/useModal';
import { registerSystemErrorHandler, initGlobalErrorInterceptor } from '../utils/errorHandler';

/**
 * SystemErrorBridge Component
 *
 * Bridges the global Axios error interceptor with ModalContext.
 * Because App is wrapped by ModalProvider, this component has direct
 * access to useModal(). It registers modal.error() as the handler for
 * system-level errors (502, 503, 504, 500, network dropouts) and initializes
 * the Axios response interceptor.
 */
export default function SystemErrorBridge() {
  const modal = useModal();

  useEffect(() => {
    // Register modal.error as the system error modal dispatcher
    const unregisterModal = registerSystemErrorHandler((config) => {
      return modal.error(config);
    });

    // Initialize global Axios interceptor
    const unregisterInterceptor = initGlobalErrorInterceptor();

    return () => {
      unregisterModal();
      unregisterInterceptor();
    };
  }, [modal]);

  return null;
}

