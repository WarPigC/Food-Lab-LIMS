import React, { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User as UserIcon, Menu, ChevronDown, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { openProfileUpdateModal } from './ProfileUpdateModal';
import { useModal } from '../hooks/useModal';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const modal = useModal();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      {/* Hamburger — visible only on mobile */}
      <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
        <Menu size={24} />
      </button>

      {/* Spacer to push right items to the end on mobile */}
      <div style={{ flex: 1 }} className="show-on-mobile" />

      <NotificationBell />
      
      <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div 
          className="header-user-section" 
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem', cursor: 'pointer' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserIcon size={18} />
          </div>
          <div className="header-user-name" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</span>
          </div>
          <ChevronDown size={16} color="var(--color-text-muted)" />
        </div>

        {showProfileMenu && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '1rem',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
            width: '200px', zIndex: 1000, overflow: 'hidden'
          }}>
            <button 
              onClick={() => { openProfileUpdateModal(modal, 'email'); setShowProfileMenu(false); }}
              style={{ width: '100%', textAlign: 'center', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Mail size={16} /> Change Email
            </button>
            <button 
              onClick={() => { openProfileUpdateModal(modal, 'password'); setShowProfileMenu(false); }}
              style={{ width: '100%', textAlign: 'center', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-main)' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Lock size={16} /> Change Password
            </button>
          </div>
        )}
      </div>

      <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem', marginLeft: '0.5rem', color: 'var(--color-text-muted)', backgroundColor: 'transparent' }} title="Logout">
        <LogOut size={20} />
      </button>
    </header>
  );
}

