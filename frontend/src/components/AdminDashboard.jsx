import React, { useState, useEffect } from 'react';
import { useTheme } from '../App';
import EvaluationReport from './EvaluationReport';
import FirmwareEvaluationReport from './FirmwareEvaluationReport';
import ChatComponent from './ChatComponent';
import ProfileModal from './ProfileModal';

export default function AdminDashboard({ user, token, onLogout }) {
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [models, setModels] = useState([]);
  const [firmware, setFirmware] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [firmwareHistory, setFirmwareHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_active_tab') || 'validation';
  }); // 'validation', 'firmware-validation', 'history', 'firmware-history', 'models', 'firmware', or 'users'
  
  const [users, setUsers] = useState([]);
  
  // Modal states
  const [viewingReportModel, setViewingReportModel] = useState(null); // { id, name, type }
  const [viewingReportFirmware, setViewingReportFirmware] = useState(null);
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [isAddFirmwareModalOpen, setIsAddFirmwareModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null); // { id, name, device_type }
  const [editingFirmware, setEditingFirmware] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isUserEditMode, setIsUserEditMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [modelFormData, setModelFormData] = useState({ name: '', device_type: 'TV Box' });
  const [firmwareFormData, setFirmwareFormData] = useState({ name: '', version: '', version_date: '', machine: '', device_type: 'TV Box' });

  // Fetch all admin panel data
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
      
      // Fetch users
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to fetch users');
      setUsers(usersData);

    } catch (err) {
      setError(err.message || 'Error loading administrator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);
  
  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  // Admin validation handler
  const handleValidate = async (modelId) => {
    setActionLoadingId(modelId);
    setError('');

    try {
      const response = await fetch(`/api/models/${modelId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate system');
      }

      fetchData();
    } catch (err) {
      setError(err.message || 'Error occurred during validation');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin firmware validation handler
  const handleValidateFirmware = async (firmwareId) => {
    setActionLoadingId(firmwareId);
    setError('');

    try {
      const response = await fetch(`/api/firmware/${firmwareId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate firmware');
      }

      fetchData();
    } catch (err) {
      setError(err.message || 'Error occurred during firmware validation');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Model management handlers
  const handleAddModel = async (e) => {
    e.preventDefault();
    setActionLoadingId('add');
    setError('');

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(modelFormData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create model');
      }

      setIsAddModelModalOpen(false);
      setModelFormData({ name: '', device_type: 'TV Box' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Error creating model');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEditModel = (model) => {
    setEditingModel({ id: model.id, name: model.name, device_type: model.device_type });
    setModelFormData({ name: model.name, device_type: model.device_type });
  };

  const handleUpdateModel = async (e) => {
    e.preventDefault();
    setActionLoadingId(editingModel.id);
    setError('');

    try {
      const response = await fetch(`/api/models/${editingModel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(modelFormData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update model');
      }

      setEditingModel(null);
      setModelFormData({ name: '', device_type: 'TV Box' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Error updating model');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!window.confirm('Are you sure you want to delete this model? All related evaluations will also be deleted.')) {
      return;
    }
    setActionLoadingId(modelId);
    setError('');

    try {
      const response = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete model');
      }

      fetchData();
    } catch (err) {
      setError(err.message || 'Error deleting model');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Firmware management handlers
  const handleAddFirmware = async (e) => {
    e.preventDefault();
    setActionLoadingId('add-firmware');
    setError('');

    try {
      const response = await fetch('/api/firmware', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(firmwareFormData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create firmware');
      }

      setIsAddFirmwareModalOpen(false);
      setFirmwareFormData({ name: '', version: '', version_date: '', machine: '', device_type: 'TV Box' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Error creating firmware');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEditFirmware = (fw) => {
    setEditingFirmware({ id: fw.id, name: fw.name, version: fw.version, version_date: fw.version_date, machine: fw.machine, device_type: fw.device_type });
    setFirmwareFormData({ name: fw.name, version: fw.version, version_date: fw.version_date, machine: fw.machine, device_type: fw.device_type });
  };

  const handleUpdateFirmware = async (e) => {
    e.preventDefault();
    setActionLoadingId(editingFirmware.id);
    setError('');

    try {
      const response = await fetch(`/api/firmware/${editingFirmware.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(firmwareFormData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update firmware');
      }

      setEditingFirmware(null);
      setFirmwareFormData({ name: '', version: '', version_date: '', machine: '', device_type: 'TV Box' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Error updating firmware');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteFirmware = async (firmwareId) => {
    if (!window.confirm('Are you sure you want to delete this firmware? All related evaluations will also be deleted.')) {
      return;
    }
    setActionLoadingId(firmwareId);
    setError('');

    try {
      const response = await fetch(`/api/firmware/${firmwareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete firmware');
      }

      fetchData();
    } catch (err) {
      setError(err.message || 'Error deleting firmware');
    } finally {
      setActionLoadingId(null);
    }
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
      setError(err.message || 'Error deleting evaluation');
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
      setError(err.message || 'Error deleting firmware evaluation');
    }
  };
  
  // Edit user profile handler
  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setIsEditUserModalOpen(true);
  };
  
  const handleSaveUserProfile = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setActionLoadingId(editingUser.id);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${editingUser.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: editingUser.nom,
          prenom: editingUser.prenom,
          age: editingUser.age,
          diplome: editingUser.diplome,
          poste: editingUser.poste,
          entreprise: editingUser.entreprise,
          photo: editingUser.photo
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      setError(err.message || 'Error updating profile');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="app-container">
      {/* Branded Header */}
      <header className="app-header">
        <div className="header-logo">
          <img src={isDarkMode ? "/logo2.jpg" : "/logo.png"} alt="Icone Technology Logo" />
          <h1>Icone Technology Admin Control</h1>
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
            {user.photo ? (
              <img 
                src={user.photo} 
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
            <span>{user.fullname}</span>
            <span className="user-role-tag admin">Administrator</span>
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
                <span className="stat-label">Pending Admin Validation</span>
                <span className="stat-value">{stats.approvedByIT}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--success)' }}>🛡️</div>
              <div className="stat-info">
                <span className="stat-label">Validated Systems</span>
                <span className="stat-value">{stats.validated}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--danger)' }}>❌</div>
              <div className="stat-info">
                <span className="stat-label">Failed QC Tests</span>
                <span className="stat-value">{stats.failed}</span>
              </div>
            </div>
          </div>
        )}

        {error && <div className="login-error">{error}</div>}

        {/* Workspace Panels */}
        <div className="glass-panel" style={{ flex: 1 }}>
          
          {/* Tab buttons */}
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
              onClick={() => setActiveTab('validation')}
            >
              🛡️ System Validation Workflow
            </button>
            <button 
              className={`tab-btn ${activeTab === 'firmware-validation' ? 'active' : ''}`}
              onClick={() => setActiveTab('firmware-validation')}
            >
              💾 Firmware Validation Workflow
            </button>
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📜 Models QC Inspection Logs
            </button>
            <button 
              className={`tab-btn ${activeTab === 'firmware-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('firmware-history')}
            >
              📜 Firmware QC Inspection Logs
            </button>
            <button 
              className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              📦 Model Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'firmware' ? 'active' : ''}`}
              onClick={() => setActiveTab('firmware')}
            >
              💾 Firmware Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 User Management
            </button>
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </button>
          </div>

          <div className="tab-content">
            {loading && !actionLoadingId ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p>Loading dashboard details...</p>
              </div>
            ) : activeTab === 'validation' ? (
              
              /* VALIDATION WORKFLOW TAB */
              <div className="models-list-panel animate-fade-in">
                
                {/* Header Row */}
                <div className="model-header-row">
                  <span>Model Details</span>
                  <span>QC Status</span>
                  <span>Latest S/N</span>
                  <span>Evaluated By</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {models.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No models registered in database.
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
                          {model.validation_status === 'Pending' && '⏳ Pending IT QC'}
                          {model.validation_status === 'Approved by IT' && '✅ Approved by IT'}
                          {model.validation_status === 'Validated' && '🛡️ Validated'}
                          {model.validation_status === 'Failed' && '❌ QC Failed'}
                        </span>
                      </div>

                      {/* Serial Number */}
                      <div style={{ color: model.serial_number ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {model.serial_number || 'No evaluations'}
                      </div>

                      {/* Evaluator / Validator */}
                      <div>
                        {model.validation_status === 'Validated' ? (
                          <div className="score-value">
                            <span className="percent" style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
                              Validated By Admin
                            </span>
                            <span className="date">
                              {model.validated_by_name || 'Admin'}
                            </span>
                          </div>
                        ) : model.evaluator_name ? (
                          <div className="score-value">
                            <span className="percent" style={{ fontSize: '0.9rem' }}>
                              {model.evaluator_name}
                            </span>
                            <span className="date">
                              Score: {parseFloat(model.score).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Not inspected</span>
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
                            🔍 Review Report
                          </button>
                        )}
                        
                        {model.validation_status === 'Approved by IT' && (
                          <button 
                            className="btn-success"
                            onClick={() => handleValidate(model.id)}
                            disabled={actionLoadingId === model.id}
                          >
                            {actionLoadingId === model.id ? 'Validating...' : '🛡️ Approve & Validate'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'firmware-validation' ? (
              
              /* FIRMWARE VALIDATION WORKFLOW TAB */
              <div className="models-list-panel animate-fade-in">
                
                {/* Header Row */}
                <div className="model-header-row">
                  <span>Firmware Details</span>
                  <span>QC Status</span>
                  <span>Machine</span>
                  <span>Evaluated By</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {firmware.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No firmware registered in database.
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
                          {fw.validation_status === 'Pending' && '⏳ Pending IT QC'}
                          {fw.validation_status === 'Approved by IT' && '✅ Approved by IT'}
                          {fw.validation_status === 'Validated' && '🛡️ Validated'}
                          {fw.validation_status === 'Failed' && '❌ QC Failed'}
                        </span>
                      </div>

                      {/* Machine */}
                      <div style={{ color: fw.machine ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {fw.machine || 'No machine info'}
                      </div>

                      {/* Evaluated By */}
                      <div>
                        {fw.validation_status === 'Validated' ? (
                          <div className="score-value">
                            <span className="percent" style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
                              Validated By Admin
                            </span>
                            <span className="date">
                              {fw.validated_by_name || 'Admin'}
                            </span>
                          </div>
                        ) : fw.evaluator_name ? (
                          <div className="score-value">
                            <span className="percent" style={{ fontSize: '0.9rem' }}>
                              {fw.evaluator_name}
                            </span>
                            <span className="date">
                              Score: {parseFloat(fw.score).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Not inspected</span>
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
                            🔍 Review Report
                          </button>
                        )}
                        
                        {fw.validation_status === 'Approved by IT' && (
                          <button 
                            className="btn-success"
                            onClick={() => handleValidateFirmware(fw.id)}
                            disabled={actionLoadingId === fw.id}
                          >
                            {actionLoadingId === fw.id ? 'Validating...' : '🛡️ Approve & Validate'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'history' ? (
              
              /* HISTORY LOGS TAB */
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
                      <th>QC Result</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No inspection logs found.
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
                            {/* Admin can always delete! */}
                            <button 
                              className="btn-danger"
                              onClick={() => handleDeleteEvaluation(log.evaluation_id)}
                            >
                              🗑️ Delete
                            </button>
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
                      <th>Version</th>
                      <th>Device Type</th>
                      <th>Inspector</th>
                      <th>Score</th>
                      <th>QC Result</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firmwareHistory.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No firmware inspection logs found.
                        </td>
                      </tr>
                    ) : (
                      firmwareHistory.map((log) => (
                        <tr key={log.evaluation_id}>
                          <td>{new Date(log.evaluation_date).toLocaleString()}</td>
                          <td style={{ fontWeight: 700 }}>{log.firmware_name}</td>
                          <td>{log.version}</td>
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
                            {/* Admin can always delete! */}
                            <button 
                              className="btn-danger"
                              onClick={() => handleDeleteFirmwareEvaluation(log.evaluation_id)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'models' ? (
              
              /* MODEL MANAGEMENT TAB */
              <div className="animate-fade-in">
                <div className="model-management-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="glass-panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                    📦 Manage Models
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={() => setIsAddModelModalOpen(true)}
                  >
                    ➕ Add New Model
                  </button>
                </div>

                <div className="models-list-panel">
                  <div className="model-header-row" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr' }}>
                    <span>Model Name</span>
                    <span>Device Type</span>
                    <span>Created Date</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                  </div>

                  {models.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No models registered in database. Click "Add New Model" to create one.
                    </div>
                  ) : (
                    models.map((model) => (
                      <div key={model.id} className="model-row-item" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr' }}>
                        <div className="model-name-wrapper">
                          <span className="model-name">{model.name}</span>
                        </div>
                        <div>
                          <span className={model.device_type === 'TV Box' ? 'model-type-tag-tv' : 'model-type-tag-receiver'}>
                            {model.device_type}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {new Date(model.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-secondary"
                            onClick={() => handleEditModel(model)}
                            disabled={actionLoadingId === model.id}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn-danger"
                            onClick={() => handleDeleteModel(model.id)}
                            disabled={actionLoadingId === model.id}
                          >
                            {actionLoadingId === model.id ? 'Deleting...' : '🗑️ Delete'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'firmware' ? (
              
              /* FIRMWARE MANAGEMENT TAB */
              <div className="animate-fade-in">
                <div className="model-management-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="glass-panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                    💾 Manage Firmware
                  </div>
                  <button 
                    className="btn-primary"
                    onClick={() => setIsAddFirmwareModalOpen(true)}
                  >
                    ➕ Add New Firmware
                  </button>
                </div>

                <div className="models-list-panel">
                  <div className="model-header-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                    <span>Firmware Name</span>
                    <span>Version</span>
                    <span>Device Type</span>
                    <span>Created Date</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                  </div>

                  {firmware.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No firmware registered in database. Click "Add New Firmware" to create one.
                    </div>
                  ) : (
                    firmware.map((fw) => (
                      <div key={fw.id} className="model-row-item" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                        <div className="model-name-wrapper">
                          <span className="model-name">{fw.name}</span>
                        </div>
                        <div>
                          v{fw.version}
                        </div>
                        <div>
                          <span className={fw.device_type === 'TV Box' ? 'model-type-tag-tv' : 'model-type-tag-receiver'}>
                            {fw.device_type}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {new Date(fw.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-secondary"
                            onClick={() => handleEditFirmware(fw)}
                            disabled={actionLoadingId === fw.id}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn-danger"
                            onClick={() => handleDeleteFirmware(fw.id)}
                            disabled={actionLoadingId === fw.id}
                          >
                            {actionLoadingId === fw.id ? 'Deleting...' : '🗑️ Delete'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'users' ? (
              /* USER MANAGEMENT TAB */
              <div className="animate-fade-in">
                <div className="tab-description">Manage user accounts and their profile information</div>
                <div className="models-list-panel">
                  <div className="model-header-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr' }}>
                    <span>User Information</span>
                    <span>Role</span>
                    <span>Joined</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                  </div>
                  {users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      No users found in database.
                    </div>
                  ) : (
                    users.map((usr) => (
                      <div key={usr.id} className="model-row-item" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr' }}>
                        <div className="model-name-wrapper">
                          {usr.photo ? (
                            <img 
                              src={usr.photo} 
                              alt={usr.fullname} 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                marginRight: '0.75rem'
                              }} 
                            />
                          ) : (
                            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>👤</span>
                          )}
                          <div>
                            <div className="model-name">{usr.fullname}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {usr.nom && usr.prenom ? `${usr.prenom} ${usr.nom}` : usr.username}
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className={usr.role === 'admin' ? 'user-role-tag admin' : 'user-role-tag it_support'}>
                            {usr.role === 'admin' ? 'Administrator' : 'IT Support Specialist'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {new Date(usr.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-secondary"
                            onClick={() => {
                              setIsUserEditMode(false);
                              handleEditUser(usr);
                            }}
                          >
                            👁️ Consulter
                          </button>
                          {usr.role === 'admin' && (
                            <button 
                              className="btn-primary"
                              onClick={() => {
                                setIsUserEditMode(true);
                                handleEditUser(usr);
                              }}
                            >
                              ✏️ Edit Profile
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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

      {/* Add/Edit Model Modal */}
      {(isAddModelModalOpen || editingModel) && (
        <div className="modal-overlay" onClick={() => {
          setIsAddModelModalOpen(false);
          setEditingModel(null);
          setModelFormData({ name: '', device_type: 'TV Box' });
        }}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingModel ? '✏️ Edit Model' : '➕ Add New Model'}
              </h3>
              <button className="btn-close" onClick={() => {
                setIsAddModelModalOpen(false);
                setEditingModel(null);
                setModelFormData({ name: '', device_type: 'TV Box' });
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={editingModel ? handleUpdateModel : handleAddModel} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Model Name</label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                    placeholder="Enter model name"
                  />
                </div>
                <div className="form-group">
                  <label>Device Type</label>
                  <select
                    className="select-control"
                    value={modelFormData.device_type}
                    onChange={(e) => setModelFormData({ ...modelFormData, device_type: e.target.value })}
                  >
                    <option value="TV Box">TV Box</option>
                    <option value="Receiver Satellite">Receiver Satellite</option>
                  </select>
                </div>
                <div className="modal-footer" style={{ padding: '1rem 0 0 0', borderTop: 'none', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsAddModelModalOpen(false);
                      setEditingModel(null);
                      setModelFormData({ name: '', device_type: 'TV Box' });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={actionLoadingId === 'add' || actionLoadingId === editingModel?.id}
                  >
                    {actionLoadingId === 'add' || actionLoadingId === editingModel?.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Firmware Modal */}
      {(isAddFirmwareModalOpen || editingFirmware) && (
        <div className="modal-overlay" onClick={() => {
          setIsAddFirmwareModalOpen(false);
          setEditingFirmware(null);
          setFirmwareFormData({ name: '', version: '', version_date: '', machine: '', device_type: 'TV Box' });
        }}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingFirmware ? '✏️ Edit Firmware' : '➕ Add New Firmware'}
              </h3>
              <button className="btn-close" onClick={() => {
                setIsAddFirmwareModalOpen(false);
                setEditingFirmware(null);
                setFirmwareFormData({ name: '', version: '', version_date: '', machine: '', device_type: 'TV Box' });
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={editingFirmware ? handleUpdateFirmware : handleAddFirmware} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Firmware Name</label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    value={firmwareFormData.name}
                    onChange={(e) => setFirmwareFormData({ ...firmwareFormData, name: e.target.value })}
                    placeholder="Enter firmware name"
                  />
                </div>
                <div className="form-group">
                  <label>Version</label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    value={firmwareFormData.version}
                    onChange={(e) => setFirmwareFormData({ ...firmwareFormData, version: e.target.value })}
                    placeholder="e.g., 1.0.0"
                  />
                </div>
                <div className="form-group">
                  <label>Version Date</label>
                  <input
                    type="date"
                    className="input-control"
                    value={firmwareFormData.version_date}
                    onChange={(e) => setFirmwareFormData({ ...firmwareFormData, version_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Machine</label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    value={firmwareFormData.machine}
                    onChange={(e) => setFirmwareFormData({ ...firmwareFormData, machine: e.target.value })}
                    placeholder="e.g., D20 CTT"
                  />
                </div>
                <div className="form-group">
                  <label>Device Type</label>
                  <select
                    className="select-control"
                    value={firmwareFormData.device_type}
                    onChange={(e) => setFirmwareFormData({ ...firmwareFormData, device_type: e.target.value })}
                  >
                    <option value="TV Box">TV Box</option>
                    <option value="Receiver Satellite">Receiver Satellite</option>
                  </select>
                </div>
                <div className="modal-footer" style={{ padding: '1rem 0 0 0', borderTop: 'none', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsAddFirmwareModalOpen(false);
                      setEditingFirmware(null);
                      setFirmwareFormData({ name: '', version: '', version_date: '', machine: '', device_type: 'TV Box' });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={actionLoadingId === 'add-firmware' || actionLoadingId === editingFirmware?.id}
                  >
                    {actionLoadingId === 'add-firmware' || actionLoadingId === editingFirmware?.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
          user={user} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      )}
      
      {/* View/Edit User Profile Modal */}
      {isEditUserModalOpen && editingUser && (
        <div className="modal-overlay" onClick={() => {
          setIsEditUserModalOpen(false);
          setEditingUser(null);
          setIsUserEditMode(false);
        }}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isUserEditMode ? '✏️ Edit User Profile' : '👁️ Consulter le profil'}</h3>
              <button className="btn-close" onClick={() => {
                setIsEditUserModalOpen(false);
                setEditingUser(null);
                setIsUserEditMode(false);
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {isUserEditMode ? (
                <form onSubmit={handleSaveUserProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label>Last Name (Nom)</label>
                    <input
                      type="text"
                      className="input-control"
                      value={editingUser.nom || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, nom: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div className="form-group">
                    <label>First Name (Prénom)</label>
                    <input
                      type="text"
                      className="input-control"
                      value={editingUser.prenom || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, prenom: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input
                      type="number"
                      className="input-control"
                      value={editingUser.age || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, age: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Enter age"
                    />
                  </div>
                  <div className="form-group">
                    <label>Diploma (Diplôme)</label>
                    <input
                      type="text"
                      className="input-control"
                      value={editingUser.diplome || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, diplome: e.target.value })}
                      placeholder="Enter diploma"
                    />
                  </div>
                  <div className="form-group">
                    <label>Position (Poste)</label>
                    <input
                      type="text"
                      className="input-control"
                      value={editingUser.poste || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, poste: e.target.value })}
                      placeholder="Enter position"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company (Entreprise)</label>
                    <input
                      type="text"
                      className="input-control"
                      value={editingUser.entreprise || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, entreprise: e.target.value })}
                      placeholder="Enter company"
                    />
                  </div>
                  <div className="form-group">
                    <label>Profile Photo URL</label>
                    <input
                      type="text"
                      className="input-control"
                      value={editingUser.photo || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, photo: e.target.value })}
                      placeholder="Enter profile photo URL"
                    />
                  </div>
                  <div className="modal-footer" style={{ padding: '1rem 0 0 0', borderTop: 'none', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setIsEditUserModalOpen(false);
                        setEditingUser(null);
                        setIsUserEditMode(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={actionLoadingId === editingUser.id}
                    >
                      {actionLoadingId === editingUser.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  {editingUser.photo && (
                    <img 
                      src={editingUser.photo} 
                      alt="Profile" 
                      style={{ 
                        width: '150px', 
                        height: '150px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                      }}
                    />
                  )}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-card-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nom</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{editingUser.nom || '-'}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-card-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Prénom</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{editingUser.prenom || '-'}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-card-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Âge</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{editingUser.age ? `${editingUser.age} ans` : '-'}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-card-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Diplôme</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{editingUser.diplome || '-'}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-card-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Poste</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{editingUser.poste || '-'}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      backgroundColor: 'var(--bg-card-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Entreprise</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{editingUser.entreprise || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
