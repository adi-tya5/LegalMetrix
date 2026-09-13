import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

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
      setFees(data);
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading Fee Engine...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Configurable Fee Engine
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Authoritative fee configuration matrix enforcing backend pricing integrity across all verification applications.
          </p>
        </div>
      </div>

      <DemoDisclaimer customText="Demonstration / Indicative Fee Configuration — Not an official statutory fee. Backend enforces authoritative values to prevent client-side fee manipulation." />

      {error && <div style={{ color: '#DC2626', marginBottom: '1rem' }}>{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>💳</span> Active Indicative Fee Matrix
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Fee ID</th>
                <th>Instrument Category</th>
                <th>Component Description</th>
                <th>Authoritative Amount</th>
                <th>Version</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id}>
                  <td style={{ fontWeight: '700', fontFamily: 'monospace', color: '#007A64' }}>{fee.fee_id}</td>
                  <td style={{ fontWeight: '600' }}>{fee.category_type}</td>
                  <td>{fee.component_name}</td>
                  <td style={{ fontWeight: '800', color: '#0F2537', fontSize: '1rem' }}>
                    ₹{fee.amount.toFixed(2)}
                  </td>
                  <td>{fee.version}</td>
                  <td>
                    <span className={`badge ${fee.is_active ? 'badge-valid' : 'badge-expired'}`}>
                      {fee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(fee)}>
                      ✏️ Edit Fee
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingFee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title">
                Edit Fee: {editingFee.fee_id} ({editingFee.category_type})
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingFee(null)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Authoritative Verification Amount (₹ INR)</label>
                <input
                  type="number"
                  step="10"
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
                  Save Authoritative Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
