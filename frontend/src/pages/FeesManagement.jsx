import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DemoDisclaimer } from '../components/DemoDisclaimer';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { SkeletonTable } from '../components/SkeletonLoader';
import { ArrowLeft, CreditCard, Edit, RefreshCw } from 'lucide-react';

export const FeesManagement = ({ onNavigate }) => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFee, setEditingFee] = useState(null);
  const [newAmount, setNewAmount] = useState('');
  const [error, setError] = useState(null);

  const loadFees = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/fees/');
      setFees(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const handleEdit = (fee) => {
    setEditingFee(fee);
    setNewAmount(fee.amount.toString());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/fees/${editingFee.fee_id}`, {
        method: 'PUT',
        body: JSON.stringify({ amount: parseFloat(newAmount) })
      });
      alert(`Fee for ${editingFee.category_type} updated to ₹${newAmount}!`);
      setEditingFee(null);
      loadFees();
    } catch (err) {
      alert(`Failed to update fee: ${err.message}`);
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
          <h1 className="page-main-title">Fee Governance Engine</h1>
          <p className="page-sub-title">
            Authoritative fee configuration matrix enforcing backend pricing integrity across all verification applications
          </p>
        </div>

        <div className="page-actions-group">
          <button type="button" className="btn btn-outline btn-sm" onClick={loadFees}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <DemoDisclaimer customText="Demonstration / Indicative Fee Configuration — Not an official statutory fee. Backend enforces authoritative values to prevent client-side fee manipulation." />

      {error && <div className="error-banner">{error}</div>}

      <div className="section-card">
        <div className="section-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} className="text-teal" />
            <h3 className="section-card-title">Active Indicative Fee Matrix ({fees.length})</h3>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={5} />
        ) : (
          <ResponsiveTable
            columns={[
              {
                key: 'fee_id',
                label: 'Fee ID',
                render: (row) => (
                  <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>
                    {row.fee_id}
                  </span>
                )
              },
              {
                key: 'category_type',
                label: 'Category',
                render: (row) => <strong>{row.category_type}</strong>
              },
              {
                key: 'component_name',
                label: 'Component Description',
                render: (row) => row.component_name
              },
              {
                key: 'amount',
                label: 'Authoritative Fee',
                render: (row) => (
                  <strong style={{ color: '#0F2537', fontSize: '1rem' }}>
                    ₹{row.amount.toFixed(2)}
                  </strong>
                )
              },
              {
                key: 'version',
                label: 'Version',
                render: (row) => `v${row.version}`
              },
              {
                key: 'actions',
                label: 'Action',
                isAction: true,
                render: (row) => (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleEdit(row)}
                  >
                    <Edit size={12} />
                    <span>Edit Fee</span>
                  </button>
                )
              }
            ]}
            data={fees}
            renderMobileCard={(row) => (
              <div>
                <div className="mobile-card-header">
                  <div>
                    <span className="mobile-card-title-label">Fee ID</span>
                    <div className="mobile-card-title-val font-mono" style={{ color: '#007A64' }}>
                      {row.fee_id}
                    </div>
                  </div>
                  <span style={{ fontWeight: '800', color: '#0F2537', fontSize: '1.1rem' }}>
                    ₹{row.amount.toFixed(2)}
                  </span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Category</span>
                  <span className="mobile-card-val">{row.category_type}</span>
                </div>

                <div className="mobile-card-row">
                  <span className="mobile-card-label">Component</span>
                  <span className="mobile-card-val">{row.component_name}</span>
                </div>

                <div className="mobile-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-block"
                    onClick={() => handleEdit(row)}
                  >
                    Edit Fee
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Edit Fee Modal */}
      {editingFee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title">
                Edit Fee: {editingFee.category_type}
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingFee(null)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#64748B' }}>
                Fee Component: <strong>{editingFee.component_name}</strong> ({editingFee.fee_id})
              </div>

              <div className="form-group">
                <label className="form-label">Authoritative Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingFee(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
