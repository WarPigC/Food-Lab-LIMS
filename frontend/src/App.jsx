import React, { lazy, Suspense, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './utils/clientLogger';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';

// Authenticated shell and role dashboards lazy-loaded on demand
// Unauthenticated visitors never download internal dashboards or role code
const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'));

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;
  }

  // Root Auth Gate: if not authenticated, expose only Login and catch-all redirect
  if (!user) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex-center" style={{ height: '100vh' }}>Loading...</div>}>
        <AuthenticatedApp />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
