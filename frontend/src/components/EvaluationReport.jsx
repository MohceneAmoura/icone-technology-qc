import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function EvaluationReport({ modelId, modelName, deviceType, evaluationId, token, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let url;
        if (evaluationId) {
          url = `/api/evaluations/${evaluationId}`;
        } else {
          url = `/api/models/${modelId}/evaluation`;
        }
        console.log('Fetching report from:', url); // Log URL

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Response status:', response.status, response.ok);

        // Check if response is HTML (not JSON)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error(`Server returned non-JSON response: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched report data:', data);
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load report data');
        }

        setReportData(data);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message || 'Error fetching report details');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [modelId, evaluationId, token]);

  const handleExportPDF = () => {
    if (!reportData) return;

    const { evaluation, details } = reportData;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    // Color definitions
    const primaryColor = [15, 23, 42]; // Dark slate
    const accentColor = [14, 165, 233]; // Sky blue
    
    // Header Branding
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 280, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Icone Technology - Quality Control Report', 15, 16);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text('SYSTEM LOG REPORT', 240, 16);

    // Meta Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    
    // Left Column
    doc.setFont('Helvetica', 'bold');
    doc.text('Device Type:', 15, 38);
    doc.setFont('Helvetica', 'normal');
    doc.text(deviceType, 42, 38);

    doc.setFont('Helvetica', 'bold');
    doc.text('Model Name:', 15, 45);
    doc.setFont('Helvetica', 'normal');
    doc.text(modelName, 42, 45);

    doc.setFont('Helvetica', 'bold');
    doc.text('Serial Number:', 15, 52);
    doc.setFont('Helvetica', 'normal');
    doc.text(evaluation.serial_number, 42, 52);

    // Right Column
    doc.setFont('Helvetica', 'bold');
    doc.text('Evaluation Date:', 150, 38);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(evaluation.evaluation_date).toLocaleString(), 185, 38);

    doc.setFont('Helvetica', 'bold');
    doc.text('QC Inspector:', 150, 45);
    doc.setFont('Helvetica', 'normal');
    doc.text(evaluation.evaluator_name || 'IT Support', 185, 45);

    doc.setFont('Helvetica', 'bold');
    doc.text('Evaluation Score:', 150, 52);
    doc.setFont('Helvetica', 'bold');
    
    // Dynamic score color indicator
    const scoreVal = parseFloat(evaluation.score);
    if (scoreVal === 100) {
      doc.setTextColor(22, 163, 74); // Green
    } else {
      doc.setTextColor(220, 38, 38); // Red
    }
    doc.text(`${scoreVal.toFixed(1)}% (${evaluation.status})`, 185, 52);
    doc.setTextColor(15, 23, 42); // Reset

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 58, 265, 58);

    // General Notes
    doc.setFont('Helvetica', 'bold');
    doc.text('General Notes & Observations:', 15, 66);
    doc.setFont('Helvetica', 'normal');
    const notesText = evaluation.general_notes || 'No general notes recorded.';
    const splitNotes = doc.splitTextToSize(notesText, 250);
    doc.text(splitNotes, 15, 72);

    // Table of Checklist Details
    const tableHeaders = [['Item Name', 'Status', 'Inspector Comments']];
    const tableData = details.map(item => [
      item.item_name,
      item.status.toUpperCase(),
      item.comments || '-'
    ]);

    doc.autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 85,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [14, 165, 233], // Sky blue header
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 160 }
      },
      didParseCell: function (data) {
        if (data.column.index === 1) {
          if (data.cell.text[0] === 'APPROVED') {
            data.cell.styles.textColor = [22, 163, 74];
          } else if (data.cell.text[0] === 'PENDING') {
            data.cell.styles.textColor = [217, 119, 6];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    });

    // Save report
    const formattedDate = new Date(evaluation.evaluation_date).toISOString().slice(0,10);
    doc.save(`qc_report_${modelName.replace(/\s+/g, '_')}_${evaluation.serial_number}_${formattedDate}.pdf`);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🔍 Quality Control Evaluation Report</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>Loading evaluation details...</p>
            </div>
          ) : error ? (
            <div className="login-error">{error}</div>
          ) : !reportData ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>No evaluation report data available for this model.</p>
            </div>
          ) : (
            <div>
              {/* Info grid */}
              <div className="report-info-card">
                <div className="report-info-item">
                  <span className="label">Device Name</span>
                  <span className="val">{modelName}</span>
                </div>
                <div className="report-info-item">
                  <span className="label">Device Type</span>
                  <span className="val">{deviceType}</span>
                </div>
                <div className="report-info-item">
                  <span className="label">Serial Number (S/N)</span>
                  <span className="val">{reportData.evaluation.serial_number}</span>
                </div>
                <div className="report-info-item">
                  <span className="label">Evaluation Date</span>
                  <span className="val">{new Date(reportData.evaluation.evaluation_date).toLocaleString()}</span>
                </div>
                <div className="report-info-item">
                  <span className="label">Inspector</span>
                  <span className="val">{reportData.evaluation.evaluator_name || 'IT Support'}</span>
                </div>
                <div className="report-info-item">
                  <span className="label">Quality Score & Status</span>
                  <span className="val" style={{ 
                    color: parseFloat(reportData.evaluation.score) === 100 ? 'var(--success)' : 'var(--danger)',
                    fontWeight: 700 
                  }}>
                    {parseFloat(reportData.evaluation.score).toFixed(1)}% ({reportData.evaluation.status})
                  </span>
                </div>
              </div>

              {/* General Notes */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700 }}>
                  📝 General Observations
                </h4>
                <div style={{ background: 'hsla(217, 30%, 8%, 0.4)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {reportData.evaluation.general_notes || 'No general notes recorded.'}
                </div>
              </div>

              {/* Itemized Table */}
              <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 700 }}>
                📋 Checklist Items Details
              </h4>
              <table className="report-details-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Status</th>
                    <th>Specific Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.details.map((item) => (
                    <tr key={item.item_name}>
                      <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                      <td>
                        <span className={`status-badge ${
                          item.status === 'Approved' ? 'validated' : 
                          item.status === 'Not Approved' ? 'failed' : 'pending'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ color: item.comments ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {item.comments || 'No comment'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {reportData && (
            <button className="btn-primary" onClick={handleExportPDF}>
              📄 Download PDF Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
