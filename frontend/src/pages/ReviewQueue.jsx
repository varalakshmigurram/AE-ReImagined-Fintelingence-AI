import { useEffect, useState } from 'react'
import {
  getPendingRules, reviewRule,
  getPendingStates, reviewState,
  getPendingChannels, reviewChannel
} from '../services/api'
import { CheckCircle, XCircle, GitCompare, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import DiffViewer from '../components/DiffViewer'

const REVIEWER = 'approver'

export default function ReviewQueue() {
  const [rules, setRules] = useState([])
  const [states, setStates] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [commenting, setCommenting] = useState({})
  const [comments, setComments] = useState({})

  const load = () => {
    setLoading(true)
    Promise.all([getPendingRules(), getPendingStates(), getPendingChannels()])
      .then(([r, s, c]) => { setRules(r); setStates(s); setChannels(c) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const total = rules.length + states.length + channels.length

  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const handleReview = async (type, id, action, comment) => {
    const payload = { action, reviewer: REVIEWER, comments: comment || '' }
    try {
      if (type === 'rule') await reviewRule(id, payload)
      if (type === 'state') await reviewState(id, payload)
      if (type === 'channel') await reviewChannel(id, payload)
      toast.success(`${action === 'APPROVE' ? '✅ Approved' : '❌ Rejected'} successfully`)
      load()
    } catch {
      toast.error('Review action failed')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Review Queue</div>
          <div className="page-subtitle">
            {total === 0 ? 'All caught up — no pending reviews' : `${total} item${total > 1 ? 's' : ''} awaiting review`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Rules', 'States', 'Channels'].map((t, i) => {
            const count = [rules.length, states.length, channels.length][i]
            return count > 0 ? (
              <span key={t} className="badge badge-pending">{count} {t}</span>
            ) : null
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
      ) : total === 0 ? (
        <div className="card">
          <div className="empty" style={{ padding: 80 }}>
            <div className="empty-icon">✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>All clear!</div>
            <div>No items pending review</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map(r => (
            <ReviewCard key={`rule-${r.id}`} type="rule" item={r}
              title={r.ruleId} subtitle={`Rule #${r.ruleNumber}`} description={r.description}
              meta={[
                { label: 'Segment', value: r.applicableSegment },
                { label: 'Cutoffs', value: r.cutoffs ?? '—', mono: true },
                { label: 'Phase', value: r.phase?.replace(/_/g, ' ') },
                { label: 'Submitted by', value: r.submittedBy },
              ]}
              expanded={expanded[`rule-${r.id}`]}
              onToggle={() => toggleExpand(`rule-${r.id}`)}
              commenting={commenting[`rule-${r.id}`]}
              onToggleComment={() => setCommenting(c => ({ ...c, [`rule-${r.id}`]: !c[`rule-${r.id}`] }))}
              comment={comments[`rule-${r.id}`] ?? ''}
              onCommentChange={v => setComments(c => ({ ...c, [`rule-${r.id}`]: v }))}
              onApprove={() => handleReview('rule', r.id, 'APPROVE', comments[`rule-${r.id}`])}
              onReject={() => handleReview('rule', r.id, 'REJECT', comments[`rule-${r.id}`])}
              before={r.previousSnapshot}
              after={JSON.stringify(r)}
            />
          ))}

          {states.map(s => (
            <ReviewCard key={`state-${s.id}`} type="state" item={s}
              title={`State: ${s.stateCode}`} subtitle="State Constraint" description={`Loan: $${s.minLoanAmount?.toLocaleString()}–$${s.maxLoanAmount?.toLocaleString()} | APR: ${s.minApr}%–${s.maxApr}% | Term: ${s.minTermMonths}–${s.maxTermMonths}mo`}
              meta={[
                { label: 'State', value: s.stateCode },
                { label: 'ON/OFF', value: s.stateOnOff ?? 'ON' },
                { label: 'Max APR', value: `${s.maxApr}%`, mono: true },
                { label: 'Submitted by', value: s.submittedBy },
              ]}
              expanded={expanded[`state-${s.id}`]}
              onToggle={() => toggleExpand(`state-${s.id}`)}
              commenting={commenting[`state-${s.id}`]}
              onToggleComment={() => setCommenting(c => ({ ...c, [`state-${s.id}`]: !c[`state-${s.id}`] }))}
              comment={comments[`state-${s.id}`] ?? ''}
              onCommentChange={v => setComments(c => ({ ...c, [`state-${s.id}`]: v }))}
              onApprove={() => handleReview('state', s.id, 'APPROVE', comments[`state-${s.id}`])}
              onReject={() => handleReview('state', s.id, 'REJECT', comments[`state-${s.id}`])}
              before={s.previousSnapshot}
              after={JSON.stringify(s)}
            />
          ))}

          {channels.map(c => (
            <ReviewCard key={`channel-${c.id}`} type="channel" item={c}
              title={`Channel: ${c.channelCode}`} subtitle="Channel Constraint" description={`Loan: $${c.minLoanAmount?.toLocaleString()}–$${c.maxLoanAmount?.toLocaleString()} | APR: ${c.minApr}%–${c.maxApr}%`}
              meta={[
                { label: 'Channel', value: c.channelCode },
                { label: 'Max Loan', value: `$${c.maxLoanAmount?.toLocaleString()}`, mono: true },
                { label: 'Max APR', value: `${c.maxApr}%`, mono: true },
                { label: 'Submitted by', value: c.submittedBy },
              ]}
              expanded={expanded[`channel-${c.id}`]}
              onToggle={() => toggleExpand(`channel-${c.id}`)}
              commenting={commenting[`channel-${c.id}`]}
              onToggleComment={() => setCommenting(c2 => ({ ...c2, [`channel-${c.id}`]: !c2[`channel-${c.id}`] }))}
              comment={comments[`channel-${c.id}`] ?? ''}
              onCommentChange={v => setComments(c2 => ({ ...c2, [`channel-${c.id}`]: v }))}
              onApprove={() => handleReview('channel', c.id, 'APPROVE', comments[`channel-${c.id}`])}
              onReject={() => handleReview('channel', c.id, 'REJECT', comments[`channel-${c.id}`])}
              before={c.previousSnapshot}
              after={JSON.stringify(c)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ type, title, subtitle, description, meta, expanded, onToggle,
  commenting, onToggleComment, comment, onCommentChange,
  onApprove, onReject, before, after }) {

  const typeColor = { rule: 'var(--accent)', state: 'var(--purple)', channel: 'var(--cyan)' }[type]

  return (
    <div className="card" style={{ borderLeft: `3px solid ${typeColor}` }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: typeColor, textTransform: 'uppercase'
        }}>{type[0]}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--mono)', color: typeColor }}>{title}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</span>
            <span className="badge badge-pending">PENDING REVIEW</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5, marginBottom: 8 }}>{description}</div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {meta.map(m => (
              <div key={m.label} style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{m.label}: </span>
                <span style={{ fontFamily: m.mono ? 'var(--mono)' : undefined, color: 'var(--text)' }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={onToggle} title="View Diff">
            <GitCompare size={12} />
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button className="btn btn-success btn-sm" onClick={onApprove}>
            <CheckCircle size={12} /> Approve
          </button>
          <button className="btn btn-danger btn-sm" onClick={onToggleComment}>
            <XCircle size={12} /> Reject
          </button>
        </div>
      </div>

      {/* Reject comment box */}
      {commenting && (
        <div style={{ padding: '0 20px 14px', paddingLeft: 70 }}>
          <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--danger)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>Rejection Reason</div>
            <textarea className="form-control" rows={2} value={comment} onChange={e => onCommentChange(e.target.value)} placeholder="Explain why this change is being rejected…" style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-danger btn-sm" onClick={onReject} disabled={!comment.trim()}>
                <XCircle size={11} /> Confirm Reject
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onToggleComment}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer */}
      {expanded && (
        <div style={{ padding: '0 20px 16px', paddingLeft: 70 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <GitCompare size={12} /> Field-level diff — previous vs proposed
          </div>
          {before ? (
            <DiffViewer before={before} after={after} />
          ) : (
            <div style={{ padding: '16px', background: 'var(--bg-card2)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              ℹ️ New entry — no previous snapshot to compare against
            </div>
          )}
        </div>
      )}
    </div>
  )
}
