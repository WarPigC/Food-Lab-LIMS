import axios from 'axios';

let systemErrorHandler = null;

/**
 * Registers the UI handler (from ModalContext) to display system error modals.
 * Called by SystemErrorBridge on mount.
 */
export function registerSystemErrorHandler(handler) {
  systemErrorHandler = handler;
  return () => {
    systemErrorHandler = null;
  };
}

/**
 * Dispatches a system error modal if a handler is registered.
 */
export function dispatchSystemErrorModal(config) {
  if (typeof systemErrorHandler === 'function') {
    return systemErrorHandler(config);
  }
  return null;
}

/**
 * Derives a human-friendly title and description for server outages.
 * Note: Network dropouts and websocket reboots are intentionally handled via quiet
 * reconnects or transient toasts rather than blocking modals.
 */
function getSystemErrorDetails(error) {
  const status = error.response?.status;
  const url = error.config?.url || '';
  const method = (error.config?.method || 'GET').toUpperCase();
  const rawData = error.response?.data;
  const serverMsg = typeof rawData === 'object' ? rawData?.message : (typeof rawData === 'string' ? rawData.slice(0, 300) : null);

  let title = 'Server Error';
  let body = 'An unexpected error occurred while communicating with the server.';

  if (status === 502) {
    title = 'Server Restarting / Unavailable';
    body = 'The application server is restarting or temporarily unreachable (502 Bad Gateway). Please wait a moment and reload the page.';
  } else if (status === 503) {
    title = 'Service Unavailable';
    body = 'The server is momentarily undergoing maintenance or overloaded (503 Service Unavailable). Please wait a moment and reload the page.';
  } else if (status === 504) {
    title = 'Gateway Timeout';
    body = 'The server took too long to complete your request (504 Gateway Timeout). Please wait a moment and try again.';
  } else if (status >= 500) {
    title = 'Internal Server Error';
    body = serverMsg
      ? `The server encountered an error processing your request: "${serverMsg}". You can copy debug details for support.`
      : 'An unexpected internal server error occurred (500). Your inputs are preserved.';
  }

  const debugInfo = {
    endpoint: url,
    method,
    status: status || 500,
    statusText: error.response?.statusText || 'Server Error',
    message: serverMsg || error.message,
    code: error.code || rawData?.code || 'ERR_SERVER',
    timestamp: new Date().toISOString()
  };

  return { title, body, debugInfo };
}

/**
 * Attaches the global Axios interceptor for 502, 503, 504, and 500 server crashes.
 * Ignores 401s (handled by AuthContext in-place re-auth), background polls, and network dropouts.
 */
export function initGlobalErrorInterceptor() {
  const interceptor = axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // 1. Skip cancelled requests
      if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
        return Promise.reject(error);
      }

      // 2. Skip 401 (handled exclusively by AuthContext in-place re-auth)
      if (error.response?.status === 401) {
        return Promise.reject(error);
      }

      // 3. Skip renew-session endpoint
      if (error.config?.url?.includes('/api/auth/renew-session')) {
        return Promise.reject(error);
      }

      // 4. Skip background polling requests (e.g. notification checking)
      if (error.config?.url?.includes('/api/notifications')) {
        return Promise.reject(error);
      }

      const status = error.response?.status;

      // Do NOT trigger blocking modals on network disconnects or websocket reboots.
      // Connection dropouts (ERR_NETWORK, !error.response) are handled quietly or via non-blocking toasts.
      const isServerCrashOrGateway = status === 500 || status === 502 || status === 503 || status === 504;

      if (isServerCrashOrGateway) {
        const { title, body, debugInfo } = getSystemErrorDetails(error);

        // Styled DevTools log for immediate developer debugging
        console.group(`%c[AIPER System Error] ${debugInfo.status}: ${debugInfo.method} ${debugInfo.endpoint}`, 'color: #ef4444; font-weight: bold;');
        console.table(debugInfo);
        console.error('Raw Axios Error:', error);
        console.groupEnd();

        // Flag error so downstream local catch blocks do not fire duplicate toasts
        error.handled = true;
        error._handledByModal = true;

        const isGetRequest = (error.config?.method || 'GET').toUpperCase() === 'GET';

        // Dispatch Error Modal:
        // For GET requests (initial page loads), offer a real 'Reload Page' action that recovers the view.
        // For mutating requests (POST/PUT/DELETE), provide 'Close' so user inputs remain preserved on the form.
        dispatchSystemErrorModal({
          title,
          body,
          debugInfo,
          wide: true,
          dismissLabel: 'Close',
          ...(isGetRequest ? {
            retryLabel: 'Reload Page',
            onRetry: () => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }
          } : {})
        });
      }

      return Promise.reject(error);
    }
  );

  return () => axios.interceptors.response.eject(interceptor);
}

/**
 * Shared helper for local component catch blocks.
 * If the error was already handled by the system error modal daemon,
 * it suppresses the local toast to avoid double notifications.
 * Otherwise, it formats the cleanest message and fires a toast.
 */
export function handleApiError(err, fallbackMessage, toast) {
  if (err?.handled || err?._handledByModal) {
    return;
  }

  const rawData = err?.response?.data;
  const isNetwork = !err?.response && (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error');

  const message =
    (typeof rawData === 'object' && rawData?.message) ||
    (typeof rawData === 'object' && rawData?.error) ||
    (typeof rawData === 'string' && rawData.trim() ? rawData.slice(0, 200) : null) ||
    (isNetwork ? 'Network connection lost. Please verify server connection and try again.' : null) ||
    err?.message ||
    fallbackMessage ||
    'Operation failed';

  if (toast && typeof toast.error === 'function') {
    toast.error(message);
  }

  return message;
}

