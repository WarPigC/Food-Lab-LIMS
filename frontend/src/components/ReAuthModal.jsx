import React, { useState, useContext, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Lock, Eye, EyeOff, LogOut, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

export default function ReAuthModal() {
  const { user, isReAuthOpen, renewSession, logout } = useContext(AuthContext);
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const currentUser = user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null);

  useEffect(() => {
    if (isReAuthOpen) {
      setPassword('');
      setErrorMessage('');
      setShowPassword(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isReAuthOpen]);

  if (!isReAuthOpen || typeof document === 'undefined' || !document.body) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || submitting) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      await renewSession(password);
      toast.success('Session renewed for 12 hours. You can continue your work.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid password. Please try again.';
      setErrorMessage(msg);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 100000 }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '460px',
          borderTop: '4px solid var(--color-primary, #2563EB)',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '1rem', color: 'var(--color-primary, #2563EB)' }}>
          <ShieldAlert size={28} strokeWidth={2.2} />
          <div>
            <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>Session Expired</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Your 12-hour session has expired
            </p>
          </div>
        </div>

        <div className="modal-body" style={{ marginBottom: '1.25rem' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
            To prevent losing any unsaved work on your screen, enter your password to renew your session.
          </p>

          {currentUser?.email && (
            <div
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Account</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{currentUser.name || currentUser.email}</span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--color-primary, #2563EB)',
                }}
              >
                {currentUser.role}
              </span>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger, #EF4444)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="reauth-password"
                style={{
                  display: 'block',
                  marginBottom: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--color-text-main)',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="reauth-password"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  className="modal-input-field"
                  placeholder="Enter your password"
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    height: '44px',
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary modal-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.85rem',
                  padding: '0.5rem 1rem',
                }}
                disabled={submitting}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary modal-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.4rem',
                }}
                disabled={submitting || !password.trim()}
              >
                {submitting && <RefreshCw size={16} className="spinner" />}
                <span>{submitting ? 'Renewing...' : 'Renew Session'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

