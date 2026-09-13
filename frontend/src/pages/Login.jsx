import React, { useState } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const Login = ({ onLoginSuccess }) => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('owner_rajesh');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  const handleQuickFill = (roleKey) => {
    const cred = DEMO_CREDENTIALS[roleKey];
    if (cred) {
      setUsername(cred.username);
      setPassword(cred.password);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '1.5rem auto', padding: '0.75rem' }}>
      <div className="card" style={{ padding: 'clamp(1rem, 4vw, 2rem)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="brand-logo" style={{ margin: '0 auto 0.75rem auto', width: '48px', height: '48px', fontSize: '1.5rem' }}>
            LM
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F2537' }}>LegalMetrix Portal</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Unified Digital Verification &amp; Calibration Platform
          </p>
        </div>

        <DemoDisclaimer />

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Registered Email</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* 1-Click Quick Fill Demo Section */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
            Quick-Fill Demo Credentials (SIH 2026)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('USER')}
              style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
            >
              👤 Owner (Rajesh)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('LMO')}
              style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
            >
              ⚖️ LMO Officer (Vijay)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('GATC')}
              style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
            >
              🔬 GATC (Govt Approved Test Centre)
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickFill('ADMIN')}
              style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
            >
              🛡️ Admin (Sunil)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
