import React from 'react';

export default function ProfileModal({ 
  user, 
  onClose, 
  isEditMode = false, 
  editFormData, 
  onEditFormChange, 
  onSave, 
  onCancel, 
  onEdit, 
  isSaving = false 
}) {
  if (!user) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ zIndex: 300 }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '500px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{isEditMode ? '✏️ Modifier Mon Profil' : '👤 Mon Profil'}</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isEditMode ? (
            <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Last Name (Nom)</label>
                <input
                  type="text"
                  className="input-control"
                  value={editFormData.nom || ''}
                  onChange={(e) => onEditFormChange('nom', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
              <div className="form-group">
                <label>First Name (Prénom)</label>
                <input
                  type="text"
                  className="input-control"
                  value={editFormData.prenom || ''}
                  onChange={(e) => onEditFormChange('prenom', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  className="input-control"
                  value={editFormData.age || ''}
                  onChange={(e) => onEditFormChange('age', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Enter age"
                />
              </div>
              <div className="form-group">
                <label>Diplôme</label>
                <input
                  type="text"
                  className="input-control"
                  value={editFormData.diplome || ''}
                  onChange={(e) => onEditFormChange('diplome', e.target.value)}
                  placeholder="Enter diploma"
                />
              </div>
              <div className="form-group">
                <label>Poste</label>
                <input
                  type="text"
                  className="input-control"
                  value={editFormData.poste || ''}
                  onChange={(e) => onEditFormChange('poste', e.target.value)}
                  placeholder="Enter position"
                />
              </div>
              <div className="form-group">
                <label>Entreprise</label>
                <input
                  type="text"
                  className="input-control"
                  value={editFormData.entreprise || ''}
                  onChange={(e) => onEditFormChange('entreprise', e.target.value)}
                  placeholder="Enter company"
                />
              </div>
              <div className="form-group">
                <label>Profile Photo URL</label>
                <input
                  type="text"
                  className="input-control"
                  value={editFormData.photo || ''}
                  onChange={(e) => onEditFormChange('photo', e.target.value)}
                  placeholder="Enter profile photo URL"
                />
              </div>
              <div className="modal-footer" style={{ padding: '1rem 0 0 0', borderTop: 'none', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              {user.photo && (
                <img 
                  src={user.photo} 
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
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.nom || '-'}</span>
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
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.prenom || '-'}</span>
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
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.age ? `${user.age} ans` : '-'}</span>
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
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.diplome || '-'}</span>
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
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.poste || '-'}</span>
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
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.entreprise || '-'}</span>
                </div>
              </div>
              {onEdit && (
                <div style={{ marginTop: '1.5rem', width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-primary" onClick={onEdit}>
                    ✏️ Modifier Mon Profil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
