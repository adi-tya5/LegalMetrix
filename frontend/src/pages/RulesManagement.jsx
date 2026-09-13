import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

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
      setRules(data);
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading Rules Engine...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Configurable &amp; Version-Controlled Rules Engine
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Hierarchical rule resolution: Exact (Type+Class+Param) &rarr; Fallback &rarr; Generic Default &rarr; Demo Fallback.
          </p>
        </div>
      </div>

      <DemoDisclaimer customText="Demonstration Configuration — actual permissible limits must be configured according to applicable instrument, test conditions, jurisdiction, and current regulatory requirements. Historical verification calculations are preserved permanently." />

      {error && <div style={{ color: '#DC2626', marginBottom: '1rem' }}>{error}</div>}

      {/* Quick Test Case 3 Helper Card */}
      <div className="card" style={{ background: '#F8FAFC', border: '1px dashed #007A64' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#007A64', marginBottom: '0.35rem' }}>
          💡 SIH Test Case 3 Live Simulation:
        </div>
        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
          For <strong>RULE-DWM-001</strong> (Digital Weighing Machine), change the permissible tolerance from <strong>±0.50%</strong> to <strong>±0.10%</strong>.
          Notice that a +0.15% reading immediately changes from PASS to FAIL, while already-issued historical certificates stay unaffected!
        </div>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>⚙️</span> Active Rule Hierarchy
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Instrument Type</th>
                <th>Accuracy Class</th>
                <th>Test Parameter</th>
                <th>Permissible Limit</th>
                <th>Period</th>
                <th>Version</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>{rule.rule_id}</td>
                  <td style={{ fontWeight: '600' }}>{rule.instrument_type}</td>
                  <td>{rule.accuracy_class || 'Any'}</td>
                  <td>{rule.test_parameter}</td>
                  <td style={{ fontWeight: '700', color: '#0F2537' }}>
                    ±{rule.permissible_limit_value.toFixed(2)}%
                  </td>
                  <td>{rule.verification_period_days} Days</td>
                  <td>{rule.version}</td>
                  <td>
                    <span className={`badge ${rule.is_active ? 'badge-valid' : 'badge-expired'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(rule)}>
                        ✏️ Edit Limit
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleToggleActive(rule)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {rule.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title">
                Edit Permissible Limit: {editingRule.rule_id}
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
