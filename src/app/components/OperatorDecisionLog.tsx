import React from 'react';
import { History } from 'lucide-react';
import { DecisionLogEntry } from '../lib/types';

interface OperatorDecisionLogProps {
  decisionLog: DecisionLogEntry[];
}

export const OperatorDecisionLog: React.FC<OperatorDecisionLogProps> = ({ decisionLog }) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <span className="kpi-title" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <History size={10} /> Operator Decision Log
        </span>
        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>SESSION-LOG</span>
      </div>

      <div className="log-table-container">
        <table className="log-table" id="decision-log-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Loc</th>
              <th>Action Decision Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {decisionLog.length > 0 ? (
              decisionLog.map((log, i) => (
                <tr key={i}>
                  <td>{log.timestamp}</td>
                  <td style={{ fontWeight: 700 }}>{log.location}</td>
                  <td>{log.description}</td>
                  <td style={{ 
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
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                  No operator actions logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default OperatorDecisionLog;
