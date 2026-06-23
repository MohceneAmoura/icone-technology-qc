import React, { useState, useEffect } from 'react';

export default function FirmwareEvaluationForm({ firmware, token, onSuccess, onCancel, selectedFirmwareId: initialFirmwareId }) {
  const [deviceType, setDeviceType] = useState('');
  const [selectedFirmwareId, setSelectedFirmwareId] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Checklist State: array of { id: '', name: '', desc: '', status: 'Pending', comments: '' }
  const [items, setItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter firmware based on selected device type
  const filteredFirmware = firmware.filter(f => f.device_type === deviceType);

  // Initialize with pre-selected firmware if provided
  useEffect(() => {
    if (initialFirmwareId) {
      const f = firmware.find(fw => fw.id === initialFirmwareId);
      if (f) {
        setDeviceType(f.device_type);
        setSelectedFirmwareId(initialFirmwareId);
      }
    }
  }, [initialFirmwareId, firmware]);

  // Fetch checklist items from backend when deviceType changes
  useEffect(() => {
    const fetchChecklist = async () => {
      if (!deviceType) {
        setItems([]);
        return;
      }
      
      try {
        setChecklistLoading(true);
        const response = await fetch(`/api/firmware/checklist/${encodeURIComponent(deviceType)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch checklist');
        }
        
        // Map database items to our form structure
        const checklistItems = data.map(item => ({
          id: item.id,
          name: item.item_name,
          desc: '',
          status: 'Pending',
          comments: ''
        }));
        setItems(checklistItems);
      } catch (err) {
        console.error('Error fetching checklist:', err);
        setError(err.message || 'Failed to load checklist');
      } finally {
        setChecklistLoading(false);
      }
    };
    
    fetchChecklist();
    
    // Don't reset selectedFirmwareId if it was set via prop
    if (!initialFirmwareId) {
      setSelectedFirmwareId('');
    }
  }, [deviceType, token, initialFirmwareId]);

  // Handle status toggle for an item
  const handleStatusChange = (index, newStatus) => {
    const updated = [...items];
    updated[index].status = newStatus;
    setItems(updated);
  };

  // Handle comment text input for an item
  const handleCommentChange = (index, commentText) => {
    const updated = [...items];
    updated[index].comments = commentText;
    setItems(updated);
  };

  // Score calculations
  const totalItems = items.length;
  const approvedCount = items.filter(item => item.status === 'Approved').length;
  const score = totalItems > 0 ? Math.round((approvedCount / totalItems) * 100) : 0;
  const allApproved = items.every(item => item.status === 'Approved');

  // Submit evaluation to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedFirmwareId) {
      setError('Please select a firmware.');
      return;
    }

    setLoading(true);

    try {
      const evaluationData = {
        score: score,
        status: allApproved ? 'APPROVED' : 'NOT APPROVED',
        items: items,
        general_notes: generalNotes.trim()
      };

      const response = await fetch(`/api/firmware/${selectedFirmwareId}/evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(evaluationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit evaluation');
      }

      onSuccess();
    } catch (err) {
      setError(err.message || 'Server error saving verification');
    } finally {
      setLoading(false);
    }
  };

  const resetChecklist = () => {
    if (items.length > 0) {
      const reset = items.map(item => ({ ...item, status: 'Pending', comments: '' }));
      setItems(reset);
      setGeneralNotes('');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Wizard Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🔧 New Software (Firmware) Quality Evaluation</h2>
        <button className="btn-back-to-dashboard" onClick={onCancel}>← Back to Dashboard</button>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="workspace-layout">
        
        {/* Left Side Panel: Configurations */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
          <h3 className="glass-panel-title">⚙️ Firmware Config</h3>
          
          <div className="form-group">
            <label>Device Type</label>
            <select 
              className="select-control"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              disabled={!!initialFirmwareId}
              required
            >
              <option value="">-- Choose Type --</option>
              <option value="TV Box">TV Box</option>
              <option value="Receiver Satellite">Receiver Satellite</option>
            </select>
          </div>

          <div className="form-group">
            <label>Firmware</label>
            <select
              className="select-control"
              value={selectedFirmwareId}
              onChange={(e) => setSelectedFirmwareId(e.target.value)}
              disabled={!!initialFirmwareId || !deviceType}
              required
            >
              <option value="">-- Choose Firmware --</option>
              {filteredFirmware.map(f => (
                <option key={f.id} value={f.id}>{f.name} (v{f.version} - {f.machine})</option>
              ))}
            </select>
          </div>

          {selectedFirmwareId && (
            <>
              <div className="form-group">
                <label>General Notes / Comments</label>
                <textarea
                  className="textarea-control"
                  rows="4"
                  placeholder="Add summary notes about the firmware evaluation..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                />
              </div>

              <div className="info-alert-card">
                <h4>ℹ️ Guidelines</h4>
                <ul>
                  <li>Select device type and firmware to evaluate.</li>
                  <li>Check every item in the checklist on the right.</li>
                  <li>Add specific comments for failed or pending items.</li>
                  <li>Submit once all components are checked.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Right Side Panel: Checklist */}
        <div className="glass-panel">
          <h3 className="glass-panel-title">📋 Checklist Items</h3>
          
          {!selectedFirmwareId ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚙️</span>
              <p style={{ fontWeight: 600 }}>Please select a Device Type and Firmware to load the checklist items.</p>
            </div>
          ) : checklistLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⏳</span>
              <p style={{ fontWeight: 600 }}>Loading checklist items...</p>
            </div>
          ) : (
            <div>
              {/* Score header */}
              <div className="evaluation-header-summary animate-fade-in">
                <div className="evaluation-model-info">
                  <h2>{firmware.find(f => f.id == selectedFirmwareId)?.name} (v{firmware.find(f => f.id == selectedFirmwareId)?.version})</h2>
                  <span className="status-badge pending">In Progress</span>
                </div>
                
                <div className="evaluation-progress-block">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${score}%` }}></div>
                  </div>
                  <div className="progress-percent">{score}%</div>
                </div>
              </div>

              {/* Checklist items list */}
              <div className="checklist-container">
                {items.map((item, idx) => (
                  <div 
                    key={item.id || item.name} 
                    className={`checklist-card animate-fade-in ${
                      item.status === 'Approved' ? 'approved' : 
                      item.status === 'Not Approved' ? 'not-approved' : 'pending'
                    }`}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <div className="checklist-card-header">
                      <div className="item-name-info">
                        <span className="item-title">{item.name}</span>
                        <span className="item-desc">{item.desc}</span>
                      </div>

                      {/* Status selectors */}
                      <div className="status-options-group">
                        <button
                          type="button"
                          className={`status-option-btn ${item.status === 'Approved' ? 'selected approved' : ''}`}
                          onClick={() => handleStatusChange(idx, 'Approved')}
                        >
                          ✅ Approved
                        </button>
                        <button
                          type="button"
                          className={`status-option-btn ${item.status === 'Pending' ? 'selected pending' : ''}`}
                          onClick={() => handleStatusChange(idx, 'Pending')}
                        >
                          ⏳ Pending
                        </button>
                        <button
                          type="button"
                          className={`status-option-btn ${item.status === 'Not Approved' ? 'selected not-approved' : ''}`}
                          onClick={() => handleStatusChange(idx, 'Not Approved')}
                        >
                          ❌ Not Approved
                        </button>
                      </div>
                    </div>

                    {/* Comments row */}
                    <div className="item-comment-box">
                      <label htmlFor={`comment-${idx}`}>💬 Specific Comment</label>
                      <input
                        type="text"
                        id={`comment-${idx}`}
                        placeholder="Add comments if necessary..."
                        value={item.comments}
                        onChange={(e) => handleCommentChange(idx, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Wizard Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn-danger" 
                  onClick={resetChecklist}
                  disabled={loading}
                >
                  🔄 Reset Checklist
                </button>
                
                <button 
                  type="button" 
                  className="btn-success" 
                  style={{ flex: 1, padding: '1rem' }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Saving Evaluation...' : '✅ Save & Submit Quality Report'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}