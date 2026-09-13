import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

export const NotificationsPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [checking, setChecking] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/notifications/');
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const data = await apiRequest('/notifications/check', { method: 'POST' });
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to check notifications:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_status: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_status: true }))
      );
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.read_status;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_status).length;

  const getTypeStyle = (type) => {
    switch (type) {
      case 'EXPIRY_SOON':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '⏳', label: 'EXPIRING SOON' };
      case 'EXPIRED':
        return { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '🚨', label: 'CERTIFICATE EXPIRED' };
      case 'RE_VERIFICATION_REQUIRED':
        return { bg: '#FFF1F2', border: '#FDA4AF', text: '#9F1239', icon: '🛑', label: 'RE-VERIFICATION REQUIRED' };
      case 'WORKFLOW':
        return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '📋', label: 'WORKFLOW ASSIGNMENT' };
      default:
        return { bg: '#F8FAFC', border: '#E2E8F0', text: '#334155', icon: '🔔', label: type || 'ALERT' };
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0F2537' }}>
            Notifications &amp; Alerts
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            Authoritative certificate validity monitoring, expiry warnings, and inspection reminders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleCheckNow}
            disabled={checking}
          >
            {checking ? 'Evaluating...' : '🔄 Check Expiry Now'}
          </button>
          {unreadCount > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleMarkAllRead}
            >
              ✓ Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <DemoDisclaimer />

      {/* Filter Tabs & Summary Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('ALL')}
            style={{ fontSize: '0.8rem' }}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'UNREAD' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('UNREAD')}
            style={{ fontSize: '0.8rem' }}
          >
            Unread Only ({unreadCount})
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
          {unreadCount > 0 ? (
            <span style={{ color: '#D97706', fontWeight: '700' }}>
              ● {unreadCount} unread action items
            </span>
          ) : (
            <span style={{ color: '#059669', fontWeight: '600' }}>
              ✓ All notifications caught up
            </span>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Loading notifications...</div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔔</div>
          <h3 style={{ color: '#0F2537', fontWeight: '800', marginBottom: '0.5rem' }}>
            No Notifications Found
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            {filter === 'UNREAD'
              ? 'You have marked all notifications as read.'
              : 'There are currently no active alerts for your registered instruments.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredNotifications.map(n => {
            const style = getTypeStyle(n.notification_type);
            const isUnread = !n.read_status;

            return (
              <div
                key={n.id}
                className="card"
                style={{
                  background: isUnread ? style.bg : '#FFFFFF',
                  border: `1px solid ${isUnread ? style.border : '#E2E8F0'}`,
                  padding: '1.25rem',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  borderLeft: `4px solid ${style.text}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>{style.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0F2537' }}>
                          {n.title}
                        </h4>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            backgroundColor: style.border,
                            color: style.text,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            letterSpacing: '0.5px'
                          }}
                        >
                          {style.label}
                        </span>
                        {isUnread && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} title="Unread" />
                        )}
                      </div>

                      <p style={{ margin: '0.25rem 0 0.5rem 0', color: '#334155', fontSize: '0.875rem', lineHeight: '1.45' }}>
                        {n.message}
                      </p>

                      {/* Metadata row */}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.775rem', color: '#64748B', marginTop: '0.5rem' }}>
                        {n.instrument_uid && (
                          <div>
                            <strong>Instrument:</strong> {n.instrument_uid}
                          </div>
                        )}
                        {n.certificate_number && (
                          <div>
                            <strong>Certificate:</strong> {n.certificate_number}
                          </div>
                        )}
                        <div>
                          <strong>Date:</strong> {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '150px' }}>
                    {/* Call to action for owners */}
                    {(n.notification_type === 'EXPIRY_SOON' || n.notification_type === 'EXPIRED' || n.notification_type === 'RE_VERIFICATION_REQUIRED') && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', fontSize: '0.775rem', whiteSpace: 'nowrap' }}
                        onClick={() => onNavigate('apply-verification', n.instrument_id)}
                      >
                        📝 Apply Re-Verification
                      </button>
                    )}

                    {/* Call to action for verifiers */}
                    {n.notification_type === 'WORKFLOW' && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', fontSize: '0.775rem', whiteSpace: 'nowrap' }}
                        onClick={() => onNavigate('field-verification')}
                      >
                        📋 Open Field Docket
                      </button>
                    )}

                    {/* Mark as read button */}
                    {isUnread ? (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: '100%', fontSize: '0.75rem' }}
                        onClick={() => handleMarkRead(n.id)}
                      >
                        ✓ Mark as Read
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
