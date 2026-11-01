import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import axios from 'axios';
import API_URL from '../utils/api';
import { useToast } from '../hooks/useToast';
import { handleApiError } from '../utils/errorHandler';

export default function ProfileUpdateModal({ isOpen, onClose, updateType }) {
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newValue, setNewValue] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewValue('');
      setRepeatPassword('');
      setErrorMessage('');
      setIsSubmitting(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowRepeatPassword(false);
    }
  }, [isOpen, updateType]);

  // Escape key listener to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined' || !document.body) {
    return null;
  }

  const isPassword = updateType === 'password';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isPassword) {
      if (!newValue || !repeatPassword) {
        setErrorMessage('Please fill in all required fields.');
        return;
      }
      if (newValue !== repeatPassword) {
        setErrorMessage('New passwords do not match.');
        return;
      }
      if (newValue.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await axios.put(
          `${API_URL}/api/auth/change-password`,
          { newPassword: newValue },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success(res.data.message || 'Password updated successfully');
        onClose();
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.message || 'Failed to update password';
        setErrorMessage(msg);
        handleApiError(err, 'Failed to update password', null);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Email update
      if (!currentPassword || !newValue) {
        setErrorMessage('Please fill in all required fields.');
        return;
      }
      if (!newValue.includes('@') || !newValue.includes('.')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }

      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await axios.put(
          `${API_URL}/api/auth/update-profile`,
          {
            currentPassword,
            newEmail: newValue.trim()
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local session storage with new email
        const storedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          storedUser.email = res.data.email || newValue.trim();
          if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(storedUser));
          if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(storedUser));
        }

        toast.success(res.data.message || 'Email updated successfully');
        onClose();
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.message || 'Failed to update profile';
        setErrorMessage(msg);
        handleApiError(err, 'Failed to update profile', null);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{ borderTop: '4px solid var(--color-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-header"
          style={{
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isPassword ? <Lock size={24} /> : <Mail size={24} />}
            <h3 className="modal-title">Change {isPassword ? 'Password' : 'Email'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm, 4px)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger, #EF4444)',
              color: 'var(--color-danger, #EF4444)',
              borderRadius: 'var(--radius-md, 8px)',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {isPassword ? (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                    New Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="modal-input-field"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Enter new password"
                      required
                      autoFocus
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                    Repeat New Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRepeatPassword ? 'text' : 'password'}
                      className="modal-input-field"
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                      aria-label={showRepeatPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRepeatPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                    Current Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="modal-input-field"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      autoFocus
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                    New Email <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="modal-input-field"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Enter new email address"
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary modal-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary modal-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : `Update ${isPassword ? 'Password' : 'Email'}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

