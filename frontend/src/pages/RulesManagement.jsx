import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonTable } from '../components/SkeletonLoader';
import { ArrowLeft, Sliders, Edit, Check, X, RefreshCw } from 'lucide-react';

export const RulesManagement = ({ onNavigate }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [newLimit, setNewLimit] = useState('');
  const [error, setError] = useState(null);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/rules/');
      setRules(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setNewLimit(rule.permissible_limit_value.toString());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/rules/${editingRule.rule_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          permissible_limit_value: parseFloat(newLimit)
        })
      });
      alert(`Rule ${editingRule.rule_id} permissible limit updated to ±${newLimit}%!`);
      setEditingRule(null);
      loadRules();
    } catch (err) {
      alert(`Failed to update rule: ${err.message}`);
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await apiRequest(`/rules/${rule.rule_id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      loadRules();
    } catch (err) {
      alert(`Could not toggle status: ${err.message}`);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header-block">
        <div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('dashboard')}
            style={{ marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="page-main-title">Rules Governance Engine</h1>
          <p className="page-sub-title">
            Hierarchical rule resolution: Exact (Type+Class+Param) &rarr; Fallback &rarr; Generic Default &rarr; Demo Fallback
          </p>
        </div>

        <div className="page-actions-group">
          <button type="button" className="btn btn-outline btn-sm" onClick={loadRules}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer customText="Demonstration Configuration — actual permissible limits must be configured according to applicable instrument, test conditions, jurisdiction, and regulatory requirements. Historical verification records remain permanently preserved." />

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ background: '#F8FAFC', border: '1px dashed #007A64', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#007A64', marginBottom: '0.25rem' }}>
          💡 SIH Live Verification Rule Adjustment:
        </div>
        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
          For <strong>RULE-DWM-001</strong> (Digital Weighing Machine), change the permissible tolerance from <strong>±0.50%</strong> to <strong>±0.10%</strong>. A +0.15% test reading immediately transitions to FAIL, while already-issued historical certificates remain immutable.
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} className="text-teal" />
            <h3 className="section-card-title">Active Rule Hierarchy ({rules.length})</h3>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : (
          <ResponsiveTable
            columns={[
              {
                key: 'rule_id',
                label: 'Rule ID',
                render: (row) => (
                  <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>
                    {row.rule_id}
                  </span>
                )
              },
              {
                key: 'instrument_type',
                label: 'Instrument Type',
                render: (row) => (
                  <div>
                    <strong>{row.instrument_type}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Class: {row.accuracy_class || 'Any'}</div>
                  </div>
                )
              },
              {
                key: 'test_parameter',
                label: 'Parameter',
                render: (row) => row.test_parameter
              },
              {
                key: 'permissible_limit_value',
                label: 'Permissible Limit',
                render: (row) => (
                  <strong style={{ color: '#0F2537' }}>
                    ±{row.permissible_limit_value.toFixed(2)}%
                  </strong>
                )
              },
              {
                key: 'verification_period_days',
                label: 'Validity Period',
                render: (row) => `${row.verification_period_days} Days`
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span className={`badge ${row.is_active ? 'badge-valid' : 'badge-expired'}`}>
                    ● {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                isAction: true,
                render: (row) => (
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEdit(row)}
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleToggleActive(row)}
                    >
                      {row.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                )
              }
            ]}
            data={rules}
            renderMobileCard={(row) => (
              <div>
                <div className="mobile-card-header">
                  <div>
                    <span className="mobile-card-title-label">Rule</span>
                    <div className="mobile-card-title-val font-mono" style={{ color: '#007A64' }}>
                      {row.rule_id}
                    </div>
                  </div>
                  <span className={`badge ${row.is_active ? 'badge-valid' : 'badge-expired'}`}>
                    ● {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Instrument</span>
                  <span className="mobile-card-val">{row.instrument_type}</span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Permissible Limit</span>
                  <span className="mobile-card-val" style={{ fontWeight: '700' }}>
                    ±{row.permissible_limit_value.toFixed(2)}%
                  </span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Validity</span>
                  <span className="mobile-card-val">{row.verification_period_days} Days</span>
                </div>

                <div className="mobile-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEdit(row)}
                  >
                    Edit Limit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleToggleActive(row)}
                  >
                    {row.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title">
                Edit Tolerance: {editingRule.rule_id}
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingRule(null)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#64748B' }}>
                Instrument: <strong>{editingRule.instrument_type}</strong> ({editingRule.accuracy_class || 'General'})
              </div>

              <div className="form-group">
                <label className="form-label">Permissible Limit (Percentage ±%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingRule(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save New Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
