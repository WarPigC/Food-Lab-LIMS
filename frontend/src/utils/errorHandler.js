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
 * Derives a human-friendly title and description for server/network outages.
 */
function getSystemErrorDetails(error) {
  const status = error.response?.status;
  const url = error.config?.url || '';
  const method = (error.config?.method || 'GET').toUpperCase();
  const rawData = error.response?.data;
  const serverMsg = typeof rawData === 'object' ? rawData?.message : (typeof rawData === 'string' ? rawData.slice(0, 300) : null);

  let title = 'System Error';
  let body = 'An unexpected error occurred while communicating with the server.';

  if (!error.response || error.code === 'ERR_NETWORK') {
    title = 'Connection Lost';
    body = 'Unable to reach the server. Please check your internet connection and tap Retry.';
  } else if (status === 502) {
    title = 'Server Restarting / Unavailable';
    body = 'The application server is restarting or temporarily unreachable (502 Bad Gateway). Your unsaved inputs are preserved; tap Retry in a moment.';
  } else if (status === 503) {
    title = 'Service Unavailable';
    body = 'The server is momentarily undergoing maintenance or overloaded (503 Service Unavailable). Please tap Retry to try again.';
  } else if (status === 504) {
    title = 'Gateway Timeout';
    body = 'The server took too long to complete your request (504 Gateway Timeout). Please tap Retry.';
  } else if (status >= 500) {
    title = 'Internal Server Error';
    body = serverMsg
      ? `The server encountered an error processing your request: "${serverMsg}". You can tap Retry or copy debug details for support.`
      : 'An unexpected internal server error occurred (500). Your inputs are preserved; please tap Retry.';
  }

  const debugInfo = {
    endpoint: url,
    method,
    status: status || 'NETWORK_ERROR',
    statusText: error.response?.statusText || (error.code === 'ERR_NETWORK' ? 'Network Error' : 'Unknown'),
    message: serverMsg || error.message,
    code: error.code || rawData?.code || 'ERR_UNKNOWN',
    timestamp: new Date().toISOString()
  };

  return { title, body, debugInfo };
}

/**
 * Attaches the global Axios interceptor for 502, 503, 504, 500, and Network dropouts.
 * Ignores 401s (handled by AuthContext in-place re-auth) and operational 4xx errors.
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

      const status = error.response?.status;
      const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
      const isServerCrashOrGateway = status === 500 || status === 502 || status === 503 || status === 504;

      if (isNetworkError || isServerCrashOrGateway) {
        const { title, body, debugInfo } = getSystemErrorDetails(error);

        // Styled DevTools log for immediate developer debugging
        console.group(`%c[AIPER System Error] ${debugInfo.status}: ${debugInfo.method} ${debugInfo.endpoint}`, 'color: #ef4444; font-weight: bold;');
        console.table(debugInfo);
        console.error('Raw Axios Error:', error);
        console.groupEnd();

        // Flag error so downstream local catch blocks do not fire duplicate toasts
        error.handled = true;
        error._handledByModal = true;

        // Dispatch Error Modal with "Retry" action
        dispatchSystemErrorModal({
          title,
          body,
          debugInfo,
          wide: true,
          retryLabel: 'Retry',
          dismissLabel: 'Close',
          onRetry: () => {
            // Re-invoke the exact failed Axios request
            if (error.config) {
              return axios(error.config);
            }
          }
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
  const message =
    (typeof rawData === 'object' && rawData?.message) ||
    (typeof rawData === 'object' && rawData?.error) ||
    (typeof rawData === 'string' && rawData.trim() ? rawData.slice(0, 200) : null) ||
    err?.message ||
    fallbackMessage ||
    'Operation failed';

  if (toast && typeof toast.error === 'function') {
    toast.error(message);
  }

  return message;
}

