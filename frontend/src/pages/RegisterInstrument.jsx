import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { DemoDisclaimer } from '../components/DemoDisclaimer';

const INSTRUMENT_TYPES = [
  { type: 'Digital Weighing Machine', category: 'Standard', unit: 'kg', class: 'Demo' },
  { type: 'Platform Weighing Machine', category: 'Platform', unit: 'kg', class: 'Class III' },
  { type: 'Heavy Weighbridge', category: 'Heavy Weighbridge', unit: 'kg', class: 'Class III' },
  { type: 'Petrol Pump Measuring Device', category: 'Precision', unit: 'L', class: 'Class 0.5' },
  { type: 'Retail Weighing Scale', category: 'Standard', unit: 'kg', class: 'Class III' },
];

export const RegisterInstrument = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    instrument_type: 'Digital Weighing Machine',
    category: 'Standard',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    max_capacity: 30.0,
    unit: 'kg',
    accuracy_class: 'Demo',
    location_address: '',
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTypeChange = (e) => {
    const selectedType = e.target.value;
    const match = INSTRUMENT_TYPES.find(t => t.type === selectedType);
    setFormData({
      ...formData,
      instrument_type: selectedType,
      category: match ? match.category : 'Standard',
      unit: match ? match.unit : 'kg',
      accuracy_class: match ? match.class : 'Demo',
    });
  };

  const handleUseGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6)
          }));
        },
        (err) => alert('Could not get GPS location: ' + err.message)
      );
    } else {
      alert('Geolocation not supported by this browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        max_capacity: parseFloat(formData.max_capacity),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      const res = await apiRequest('/instruments/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert(`Instrument registered successfully! Assigned UID: ${res.instrument_uid}`);
      onNavigate('instrument-detail', res.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '0.5rem' }}>
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F2537' }}>
            Register New Weighing or Measuring Instrument
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Creates a persistent digital instrument profile for continuous lifecycle calibration &amp; certification.
          </p>
        </div>
      </div>

      <DemoDisclaimer />

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Instrument Type</label>
              <select
                className="form-select"
                value={formData.instrument_type}
                onChange={handleTypeChange}
                required
              >
                {INSTRUMENT_TYPES.map(t => (
                  <option key={t.type} value={t.type}>{t.type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-input"
                value={formData.category}
                readOnly
                style={{ backgroundColor: '#F8FAFC' }}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Manufacturer Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Essae-Teraoka Ltd. / Mettler Toledo"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Model Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DS-215N"
                value={formData.model_number}
                onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Serial Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. SN-2026-9901"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Capacity</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <select
                className="form-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="L">L (Litres)</option>
                <option value="ton">ton (Metric Tonnes)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Accuracy Class</label>
            <input
              type="text"
              className="form-input"
              value={formData.accuracy_class}
              onChange={(e) => setFormData({ ...formData, accuracy_class: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Installation / Operating Address</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Full installation location or premises address"
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Latitude (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 19.0760"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Longitude (Optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 72.9980"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleUseGps}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📍 GPS
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('dashboard')} style={{ minWidth: '100px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: '1 1 auto' }}>
              {loading ? 'Registering...' : 'Register Instrument Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
