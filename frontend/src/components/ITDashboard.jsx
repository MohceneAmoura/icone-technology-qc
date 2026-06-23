import React, { useState, useEffect } from 'react';
import { useTheme } from '../App';
import EvaluationForm from './EvaluationForm';
import EvaluationReport from './EvaluationReport';
import FirmwareEvaluationForm from './FirmwareEvaluationForm';
import FirmwareEvaluationReport from './FirmwareEvaluationReport';
import ChatComponent from './ChatComponent';
import ProfileModal from './ProfileModal';

export default function ITDashboard({ user, token, onLogout }) {
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [models, setModels] = useState([]);
  const [firmware, setFirmware] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [firmwareHistory, setFirmwareHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('it_active_tab') || 'models';
  }); // 'models', 'firmware', 'history', 'firmware-history', 'chat'
  
  // View controls
  const [evaluatingModelId, setEvaluatingModelId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlModelId = urlParams.get('evaluating');
    if (urlModelId) {
      return parseInt(urlModelId, 10);
    }
    const saved = localStorage.getItem('it_evaluating_model_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [evaluatingFirmwareId, setEvaluatingFirmwareId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlFirmwareId = urlParams.get('evaluating-firmware');
    if (urlFirmwareId) {
      return parseInt(urlFirmwareId, 10);
    }
    const saved = localStorage.getItem('it_evaluating_firmware_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [viewingReportModel, setViewingReportModel] = useState(null);
  const [viewingReportFirmware, setViewingReportFirmware] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  const [editProfileFormData, setEditProfileFormData] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all dashboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch models
      const modelsRes = await fetch('/api/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const modelsData = await modelsRes.json();
      if (!modelsRes.ok) throw new Error(modelsData.error || 'Failed to fetch models');
      setModels(modelsData);

      // Fetch firmware
      const firmwareRes = await fetch('/api/firmware', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const firmwareData = await firmwareRes.json();
      if (!firmwareRes.ok) throw new Error(firmwareData.error || 'Failed to fetch firmware');
      setFirmware(firmwareData);

      // Fetch stats
      const statsRes = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.error || 'Failed to fetch stats');
      setStats(statsData);

      // Fetch model history
      const historyRes = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      if (!historyRes.ok) throw new Error(historyData.error || 'Failed to fetch history');
      setHistory(historyData);

      // Fetch firmware history
      const firmwareHistoryRes = await fetch('/api/firmware/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const firmwareHistoryData = await firmwareHistoryRes.json();
      if (!firmwareHistoryRes.ok) throw new Error(firmwareHistoryData.error || 'Failed to fetch firmware history');
      setFirmwareHistory(firmwareHistoryData);

    } catch (err) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);
  
  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('it_active_tab', activeTab);
  }, [activeTab]);
  
  // Save evaluating model to localStorage and update URL
  useEffect(() => {
    const newUrl = new URL(window.location.href);
    
    if (evaluatingModelId) {
      localStorage.setItem('it_evaluating_model_id', evaluatingModelId.toString());
      newUrl.searchParams.set('evaluating', evaluatingModelId.toString());
      window.history.replaceState({ evaluatingModelId }, '', newUrl);
    } else {
      localStorage.removeItem('it_evaluating_model_id');
      newUrl.searchParams.delete('evaluating');
      window.history.replaceState({}, '', newUrl);
    }
  }, [evaluatingModelId]);

  // Save evaluating firmware to localStorage and update URL
  useEffect(() => {
    const newUrl = new URL(window.location.href);
    
    if (evaluatingFirmwareId) {
      localStorage.setItem('it_evaluating_firmware_id', evaluatingFirmwareId.toString());
      newUrl.searchParams.set('evaluating-firmware', evaluatingFirmwareId.toString());
      window.history.replaceState({ evaluatingFirmwareId }, '', newUrl);
    } else {
      localStorage.removeItem('it_evaluating_firmware_id');
      newUrl.searchParams.delete('evaluating-firmware');
      window.history.replaceState({}, '', newUrl);
    }
  }, [evaluatingFirmwareId]);

  const handleEvaluationSuccess = () => {
    setEvaluatingModelId(null);
    fetchData();
  };

  const handleFirmwareEvaluationSuccess = () => {
    setEvaluatingFirmwareId(null);
    fetchData();
  };

  const handleCancelEvaluation = () => {
    setEvaluatingModelId(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('evaluating');
    window.history.replaceState({}, '', newUrl);
  };

  const handleCancelFirmwareEvaluation = () => {
    setEvaluatingFirmwareId(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('evaluating-firmware');
    window.history.replaceState({}, '', newUrl);
  };

  const handleDeleteEvaluation = async (evaluationId) => {
    if (!window.confirm('Are you sure you want to delete this evaluation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete evaluation');
      }

      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting evaluation');
    }
  };

  const handleDeleteFirmwareEvaluation = async (evaluationId) => {
    if (!window.confirm('Are you sure you want to delete this firmware evaluation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/firmware/evaluations/${evaluationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete firmware evaluation');
      }

      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting firmware evaluation');
    }
  };

  const handleEditProfile = () => {
    setEditProfileFormData({
      nom: currentUser.nom,
      prenom: currentUser.prenom,
      age: currentUser.age,
      diplome: currentUser.diplome,
      poste: currentUser.poste,
      entreprise: currentUser.entreprise,
      photo: currentUser.photo
    });
    setIsProfileEditMode(true);
  };

  const handleEditProfileFormChange = (field, value) => {
    setEditProfileFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editProfileFormData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setCurrentUser(data.user);
      setIsProfileEditMode(false);
    } catch (err) {
      alert(err.message || 'Error updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEditProfile = () => {
    setIsProfileEditMode(false);
    setEditProfileFormData({});
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event) => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlModelId = urlParams.get('evaluating');
      const urlFirmwareId = urlParams.get('evaluating-firmware');
      
      if (urlModelId) {
        setEvaluatingModelId(parseInt(urlModelId, 10));
      } else {
        setEvaluatingModelId(null);
        localStorage.removeItem('it_evaluating_model_id');
      }

      if (urlFirmwareId) {
        setEvaluatingFirmwareId(parseInt(urlFirmwareId, 10));
      } else {
        setEvaluatingFirmwareId(null);
        localStorage.removeItem('it_evaluating_firmware_id');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  if (evaluatingModelId) {
    return (
      <div className="dashboard-main">
        <EvaluationForm
          models={models}
          token={token}
          onSuccess={handleEvaluationSuccess}
          onCancel={handleCancelEvaluation}
          selectedModelId={evaluatingModelId}
        />
      </div>
    );
  }

  if (evaluatingFirmwareId) {
    return (
      <div className="dashboard-main">
        <FirmwareEvaluationForm
          firmware={firmware}
          token={token}
          onSuccess={handleFirmwareEvaluationSuccess}
          onCancel={handleCancelFirmwareEvaluation}
          selectedFirmwareId={evaluatingFirmwareId}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Branded Header */}
      <header className="app-header">
        <div className="header-logo">
          <img src={isDarkMode ? "/logo2.jpg" : "/logo.png"} alt="Icone Technology Logo" />
          <h1>Icone Technology QC Workspace</h1>
        </div>
        <div className="header-user-info">
          <button className="btn-theme" onClick={toggleTheme}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <div 
            className="user-badge" 
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setIsProfileModalOpen(true)}
          >
            {currentUser.photo ? (
              <img 
                src={currentUser.photo} 
                alt="Profile" 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span>👤</span>
            )}
            <span>{currentUser.fullname}</span>
            <span className="user-role-tag it_support">IT Support Specialist</span>
          </div>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="dashboard-main">
        
        {/* Statistics Widgets */}
        {stats && (
          <div className="stats-grid animate-fade-in">
            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--primary)' }}>📊</div>
              <div className="stat-info">
                <span className="stat-label">Total Models</span>
                <span className="stat-value">{stats.totalModels}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--warning)' }}>⏳</div>
              <div className="stat-info">
                <span className="stat-label">Pending Reviews</span>
                <span className="stat-value">{stats.pending}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--success)' }}>✅</div>
              <div className="stat-info">
                <span className="stat-label">Approved by IT</span>
                <span className="stat-value">{stats.approvedByIT}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'hsl(145, 63%, 50%)' }}>🛡️</div>
              <div className="stat-info">
                <span className="stat-label">Validated systems</span>
                <span className="stat-value">{stats.validated}</span>
              </div>
            </div>
          </div>
        )}

        {error && <div className="login-error">{error}</div>}

        {/* Workspace Panels */}
        <div className="glass-panel" style={{ flex: 1 }}>
          
          {/* Tabs header */}
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              📋 Models Quality Checklist
            </button>
            <button 
              className={`tab-btn ${activeTab === 'firmware' ? 'active' : ''}`}
              onClick={() => setActiveTab('firmware')}
            >
              💾 Software (Firmware) Quality Checklist
            </button>
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 Models QC History
            </button>
            <button 
              className={`tab-btn ${activeTab === 'firmware-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('firmware-history')}
            >
              📜 Firmware QC History
            </button>
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </button>
          </div>

          <div className="tab-content">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>Loading dashboard data...</p>
              </div>
            ) : activeTab === 'models' ? (
              
              /* MODELS CHECKLIST TAB */
              <div className="models-list-panel animate-fade-in">
                
                {/* Header Row */}
                <div className="model-header-row">
                  <span>Model Details</span>
                  <span>QC Status</span>
                  <span>Latest S/N</span>
                  <span>Score</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {models.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No models registered in the database.
                  </div>
                ) : (
                  models.map((model) => (
                    <div key={model.id} className="model-row-item">
                      
                      {/* Name & Type */}
                      <div className="model-name-wrapper">
                        <span className="model-name">{model.name}</span>
                        <span className="model-type-tag">Device: {model.device_type}</span>
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`status-badge ${
                          model.validation_status === 'Pending' ? 'pending' :
                          model.validation_status === 'Approved by IT' ? 'approved_by_it' :
                          model.validation_status === 'Validated' ? 'validated' : 'failed'
                        }`}>
                          {model.validation_status === 'Pending' && '⏳ Pending Review'}
                          {model.validation_status === 'Approved by IT' && '✅ Approved by IT'}
                          {model.validation_status === 'Validated' && '🛡️ Validated'}
                          {model.validation_status === 'Failed' && '❌ QC Failed'}
                        </span>
                      </div>

                      {/* Serial Number */}
                      <div style={{ color: model.serial_number ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {model.serial_number || 'No records'}
                      </div>

                      {/* Score */}
                      <div>
                        {model.score !== null ? (
                          <div className="score-value">
                            <span className="percent" style={{ 
                              color: parseFloat(model.score) === 100 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {parseFloat(model.score).toFixed(1)}%
                            </span>
                            <span className="date">
                              {new Date(model.evaluation_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {model.latest_evaluation_id && (
                          <button 
                            className="btn-secondary"
                            onClick={() => setViewingReportModel({ 
                              modelId: model.id, 
                              name: model.name, 
                              type: model.device_type,
                              evaluationId: model.latest_evaluation_id
                            })}
                          >
                            🔍 Report
                          </button>
                        )}
                        
                        {model.validation_status !== 'Validated' && (
                          <button 
                            className="btn-primary"
                            onClick={() => {
                              const newUrl = new URL(window.location.href);
                              newUrl.searchParams.set('evaluating', model.id);
                              window.history.pushState({ evaluatingModelId: model.id }, '', newUrl);
                              setEvaluatingModelId(model.id);
                            }}
                          >
                            ⚙️ Evaluate
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'firmware' ? (
              
              /* FIRMWARE CHECKLIST TAB */
              <div className="models-list-panel animate-fade-in">
                
                {/* Header Row */}
                <div className="model-header-row">
                  <span>Firmware Details</span>
                  <span>QC Status</span>
                  <span>Machine</span>
                  <span>Score</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {firmware.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No firmware registered in the database.
                  </div>
                ) : (
                  firmware.map((fw) => (
                    <div key={fw.id} className="model-row-item">
                      
                      {/* Name & Type */}
                      <div className="model-name-wrapper">
                        <span className="model-name">{fw.name} v{fw.version}</span>
                        <span className="model-type-tag">Device: {fw.device_type}</span>
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`status-badge ${
                          fw.validation_status === 'Pending' ? 'pending' :
                          fw.validation_status === 'Approved by IT' ? 'approved_by_it' :
                          fw.validation_status === 'Validated' ? 'validated' : 'failed'
                        }`}>
                          {fw.validation_status === 'Pending' && '⏳ Pending Review'}
                          {fw.validation_status === 'Approved by IT' && '✅ Approved by IT'}
                          {fw.validation_status === 'Validated' && '🛡️ Validated'}
                          {fw.validation_status === 'Failed' && '❌ QC Failed'}
                        </span>
                      </div>

                      {/* Machine */}
                      <div style={{ color: fw.machine ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {fw.machine || 'No records'}
                      </div>

                      {/* Score */}
                      <div>
                        {fw.score !== null ? (
                          <div className="score-value">
                            <span className="percent" style={{ 
                              color: parseFloat(fw.score) === 100 ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {parseFloat(fw.score).toFixed(1)}%
                            </span>
                            <span className="date">
                              {fw.evaluation_date ? new Date(fw.evaluation_date).toLocaleDateString() : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {fw.latest_evaluation_id && (
                          <button 
                            className="btn-secondary"
                            onClick={() => setViewingReportFirmware({ 
                              firmwareId: fw.id, 
                              name: fw.name, 
                              type: fw.device_type,
                              evaluationId: fw.latest_evaluation_id
                            })}
                          >
                            🔍 Report
                          </button>
                        )}
                        
                        {fw.validation_status !== 'Validated' && (
                          <button 
                            className="btn-primary"
                            onClick={() => {
                              const newUrl = new URL(window.location.href);
                              newUrl.searchParams.set('evaluating-firmware', fw.id);
                              window.history.pushState({ evaluatingFirmwareId: fw.id }, '', newUrl);
                              setEvaluatingFirmwareId(fw.id);
                            }}
                          >
                            ⚙️ Evaluate
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'history' ? (
              
              /* MODELS HISTORY LOGS TAB */
              <div className="animate-fade-in" style={{ overflowX: 'auto' }}>
                <table className="history-list-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Model</th>
                      <th>Device Type</th>
                      <th>Serial Number</th>
                      <th>Inspector</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No quality evaluations have been submitted yet.
                        </td>
                      </tr>
                    ) : (
                      history.map((log) => (
                        <tr key={log.evaluation_id}>
                          <td>{new Date(log.evaluation_date).toLocaleString()}</td>
                          <td style={{ fontWeight: 700 }}>{log.model_name}</td>
                          <td>{log.device_type}</td>
                          <td style={{ fontFamily: 'Courier, monospace' }}>{log.serial_number}</td>
                          <td>{log.evaluator_name}</td>
                          <td style={{ 
                            color: parseFloat(log.score) === 100 ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 700 
                          }}>
                            {parseFloat(log.score).toFixed(1)}%
                          </td>
                          <td>
                            <span className={`status-badge ${log.evaluation_status === 'APPROVED' ? 'validated' : 'failed'}`}>
                              {log.evaluation_status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn-secondary"
                              onClick={() => setViewingReportModel({ 
                                modelId: log.model_id, 
                                name: log.model_name, 
                                type: log.device_type,
                                evaluationId: log.evaluation_id
                              })}
                            >
                              🔍 View Report
                            </button>
                            {(log.evaluator_id === user.id || user.role === 'admin') && !(log.is_latest_evaluation && log.model_status === 'Validated') && (
                              <button 
                                className="btn-danger"
                                onClick={() => handleDeleteEvaluation(log.evaluation_id)}
                              >
                                🗑️ Delete
                              </button>
                            )}
                            {(log.evaluator_id === user.id || user.role === 'admin') && log.is_latest_evaluation && log.model_status === 'Validated' && (
                              <button 
                                className="btn-danger"
                                disabled
                                title="Cannot delete because model has been validated by admin"
                              >
                                🚫 Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'firmware-history' ? (
              
              /* FIRMWARE HISTORY LOGS TAB */
              <div className="animate-fade-in" style={{ overflowX: 'auto' }}>
                <table className="history-list-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Firmware</th>
                      <th>Device Type</th>
                      <th>Inspector</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firmwareHistory.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No firmware quality evaluations have been submitted yet.
                        </td>
                      </tr>
                    ) : (
                      firmwareHistory.map((log) => (
                        <tr key={log.evaluation_id}>
                          <td>{new Date(log.evaluation_date).toLocaleString()}</td>
                          <td style={{ fontWeight: 700 }}>{log.firmware_name} v{log.version}</td>
                          <td>{log.device_type}</td>
                          <td>{log.evaluator_name}</td>
                          <td style={{ 
                            color: parseFloat(log.score) === 100 ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 700 
                          }}>
                            {parseFloat(log.score).toFixed(1)}%
                          </td>
                          <td>
                            <span className={`status-badge ${log.evaluation_status === 'APPROVED' ? 'validated' : 'failed'}`}>
                              {log.evaluation_status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn-secondary"
                              onClick={() => setViewingReportFirmware({ 
                                firmwareId: log.firmware_id, 
                                name: log.firmware_name, 
                                type: log.device_type,
                                evaluationId: log.evaluation_id
                              })}
                            >
                              🔍 View Report
                            </button>
                            {(log.evaluator_id === user.id || user.role === 'admin') && !(log.is_latest_evaluation && log.firmware_status === 'Validated') && (
                              <button 
                                className="btn-danger"
                                onClick={() => handleDeleteFirmwareEvaluation(log.evaluation_id)}
                              >
                                🗑️ Delete
                              </button>
                            )}
                            {(log.evaluator_id === user.id || user.role === 'admin') && log.is_latest_evaluation && log.firmware_status === 'Validated' && (
                              <button 
                                className="btn-danger"
                                disabled
                                title="Cannot delete because firmware has been validated by admin"
                              >
                                🚫 Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CHAT TAB */
              <div className="animate-fade-in">
                <ChatComponent currentUser={user} token={token} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Evaluation Report Modal */}
      {viewingReportModel && (
        <EvaluationReport
          modelId={viewingReportModel.modelId || viewingReportModel.id}
          evaluationId={viewingReportModel.evaluationId}
          modelName={viewingReportModel.name}
          deviceType={viewingReportModel.type}
          token={token}
          onClose={() => setViewingReportModel(null)}
        />
      )}

      {/* Firmware Evaluation Report Modal */}
      {viewingReportFirmware && (
        <FirmwareEvaluationReport
          firmwareId={viewingReportFirmware.firmwareId}
          evaluationId={viewingReportFirmware.evaluationId}
          firmwareName={viewingReportFirmware.name}
          deviceType={viewingReportFirmware.type}
          token={token}
          onClose={() => setViewingReportFirmware(null)}
        />
      )}
      
      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal 
          user={currentUser} 
          onClose={() => {
            setIsProfileModalOpen(false);
            setIsProfileEditMode(false);
            setEditProfileFormData({});
          }}
          isEditMode={isProfileEditMode}
          editFormData={editProfileFormData}
          onEditFormChange={handleEditProfileFormChange}
          onSave={handleSaveProfile}
          onCancel={handleCancelEditProfile}
          onEdit={handleEditProfile}
          isSaving={isSavingProfile}
        />
      )}
    </div>
  );
}
