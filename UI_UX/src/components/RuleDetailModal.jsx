import { useEffect, useState } from 'react'
import { X, GitCompare, Clock } from 'lucide-react'
import { getRuleAudit } from '../services/api'
import DiffViewer from './DiffViewer'
import { formatDistanceToNow } from 'date-fns'

export default function RuleDetailModal({ rule, onClose }) {
  const [tab, setTab] = useState('details')
  const [audit, setAudit] = useState([])

  useEffect(() => {
    if (tab === 'audit') getRuleAudit(rule.id).then(setAudit)
  }, [tab])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{rule.ruleId}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Rule #{rule.ruleNumber}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="tabs">
            {['details', 'diff', 'audit'].map(t => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {tab === 'details' && <RuleDetails rule={rule} />}
          {tab === 'diff' && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                <GitCompare size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Field-level diff — previous snapshot vs current values
              </div>
              {rule.previousSnapshot ? (
                <DiffViewer before={rule.previousSnapshot} after={JSON.stringify(rule)} />
              ) : (
                <div className="empty"><div className="empty-icon">⊙</div><div>No previous snapshot — this is the original version</div></div>
              )}
            </div>
          )}
          {tab === 'audit' && (
            <div>
              {audit.length === 0 ? (
                <div className="empty"><div>No audit history</div></div>
              ) : audit.map(a => (
                <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{a.performedBy}</span>
                      {' '}<span style={{ color: 'var(--text-muted)' }}>{a.action.replace(/_/g, ' ').toLowerCase()}</span>
                    </div>
                    {a.comments && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>"{a.comments}"</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      <Clock size={10} style={{ verticalAlign: 'middle' }} /> {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 160, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, fontFamily: mono ? 'var(--mono)' : undefined, color: 'var(--text)' }}>{value ?? '—'}</div>
    </div>
  )
}

function RuleDetails({ rule }) {
  const statusMap = { APPROVED: 'approved', PENDING_REVIEW: 'pending', DRAFT: 'draft', REJECTED: 'rejected' }
  return (
    <div>
      <Row label="Description" value={<span style={{ color: 'var(--text-subtle)', lineHeight: 1.6 }}>{rule.description}</span>} />
      <Row label="Applicable Segment" value={rule.applicableSegment} />
      <Row label="Cutoffs" value={rule.cutoffs} mono />
      <Row label="Apply %" value={rule.applyPercentage ? `${(parseFloat(rule.applyPercentage) * 100).toFixed(0)}%` : '—'} mono />
      <Row label="Phase" value={rule.phase?.replace(/_/g, ' ')} />
      <Row label="Approval Status" value={<span className={`badge badge-${statusMap[rule.approvalStatus]}`}>{rule.approvalStatus?.replace(/_/g, ' ')}</span>} />
      <Row label="Environment" value={<span className={`badge badge-${rule.environment?.toLowerCase()}`}>{rule.environment}</span>} />
      <Row label="Submitted By" value={rule.submittedBy} />
      <Row label="Approved By" value={rule.approvedBy} />
      {rule.rejectionReason && <Row label="Rejection Reason" value={<span style={{ color: 'var(--danger)' }}>{rule.rejectionReason}</span>} />}
      <Row label="Created" value={rule.createdAt ? new Date(rule.createdAt).toLocaleString() : '—'} />
      <Row label="Updated" value={rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : '—'} />
    </div>
  )
}
