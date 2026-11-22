import React, { useState, useEffect } from 'react';
import { apiRequest } from './api/client';
import LandingPage from './pages/LandingPage';
import Workspace from './pages/Workspace';
import AuthModal from './components/AuthModal';

export default function App() {
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rinsego_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState(() => (localStorage.getItem('rinsego_user') ? 'workspace' : 'landing'));
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login', role: 'customer' });
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function fetchPlans() {
    try {
      const data = await apiRequest('/plans');
      setPlans(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  function handleAuthSuccess(loggedInUser) {
    setUser(loggedInUser);
    setView('workspace');
    showToast(`Logged in as ${loggedInUser.name} (${loggedInUser.role})`);
  }

  function handleLogout() {
    localStorage.removeItem('rinsego_token');
    localStorage.removeItem('rinsego_user');
    setUser(null);
    setView('landing');
    showToast('Signed out safely.');
  }

  return (
    <>
      {view === 'landing' || !user ? (
        <LandingPage
          plans={plans}
          user={user}
          onOpenAuth={(mode, role) => setAuthModal({ open: true, mode, role })}
          onReturnDashboard={() => setView('workspace')}
        />
      ) : (
        <Workspace
          user={user}
          plans={plans}
          onUserUpdate={(updated) => {
            setUser(updated);
            localStorage.setItem('rinsego_user', JSON.stringify(updated));
          }}
          onPlansUpdate={fetchPlans}
          onNavigateWebsite={() => {
            setView('landing');
            showToast('Navigated to RinseGo Website (you are still signed in).');
          }}
          onLogout={handleLogout}
          onToast={showToast}
        />
      )}

      <AuthModal
        open={authModal.open}
        initialMode={authModal.mode}
        initialRole={authModal.role}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        onSuccess={handleAuthSuccess}
        onToast={showToast}
      />

      {toast && <div className="toast">&#10003; {toast}</div>}
    </>
  );
}
