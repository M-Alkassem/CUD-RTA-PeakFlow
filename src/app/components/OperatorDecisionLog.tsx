import React from 'react';
import { History } from 'lucide-react';
import { DecisionLogEntry } from '../lib/types';

interface OperatorDecisionLogProps {
  decisionLog: DecisionLogEntry[];
}

export const OperatorDecisionLog: React.FC<OperatorDecisionLogProps> = ({ decisionLog }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="kpi-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
          <History size={16} /> Operator Decision Log
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>SESSION LOG</span>
      </div>

      <div className="log-table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
        <table className="log-table" id="decision-log-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '15px' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '15px' }}>Corridor</th>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '15px' }}>Approved Action</th>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '15px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {decisionLog.length > 0 ? (
              decisionLog.map((log, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 14px', fontSize: '15px' }}>{log.timestamp}</td>
                  <td style={{ padding: '12px 14px', fontSize: '15px', fontWeight: 700 }}>{log.location}</td>
                  <td style={{ padding: '12px 14px', fontSize: '15px' }}>{log.description}</td>
                  <td style={{ 
                    padding: '12px 14px', 
                    fontSize: '15px',
                    color: log.status === 'APPROVED' ? 'var(--color-low)' : 
                           log.status === 'CANCELLED' ? 'var(--color-critical)' : 'var(--color-medium)',
                    fontWeight: 700
                  }}>
                    {log.status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '15px' }}>
                  No operator actions logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OperatorDecisionLog;
