import { useEffect, useState } from 'react'
import { getRecentActivity } from '../services/api'
import { Clock, Filter } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const ACTION_META = {
  CREATED:              { color: 'var(--accent)',   icon: '✦', label: 'Created' },
  UPDATED:              { color: 'var(--warning)',  icon: '✎', label: 'Updated' },
  APPROVED:             { color: 'var(--success)',  icon: '✔', label: 'Approved' },
  REJECTED:             { color: 'var(--danger)',   icon: '✖', label: 'Rejected' },
  SUBMITTED_FOR_REVIEW: { color: 'var(--purple)',   icon: '⊙', label: 'Submitted for Review' },
  PROMOTED_TO_PROD:     { color: 'var(--cyan)',     icon: '⚡', label: 'Promoted to Prod' },
}

const TYPE_COLOR = {
  RULE:               'var(--accent)',
  STATE_CONSTRAINT:   'var(--purple)',
  CHANNEL_CONSTRAINT: 'var(--cyan)',
}

export default function VersionHistoryLog() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('ALL')
  const [filterAction, setFilterAction] = useState('ALL')

  useEffect(() => {
    getRecentActivity().then(setActivity).finally(() => setLoading(false))
  }, [])

  const filtered = activity.filter(a => {
    if (filterType !== 'ALL' && a.entityType !== filterType) return false
    if (filterAction !== 'ALL' && a.action !== filterAction) return false
    return true
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Version History Log</div>
          <div className="page-subtitle">Complete change history — {filtered.length} events</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { getRecentActivity().then(setActivity) }}>
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="action-bar" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Entity:</span>
          </div>
          <div className="tabs">
            {['ALL', 'RULE', 'STATE_CONSTRAINT', 'CHANNEL_CONSTRAINT'].map(t => (
              <button key={t} className={`tab ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>
                {t === 'ALL' ? 'All' : t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Action:</span>
          <div className="tabs">
            {['ALL', 'CREATED', 'UPDATED', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'PROMOTED_TO_PROD'].map(a => (
              <button key={a} className={`tab ${filterAction === a ? 'active' : ''}`} onClick={() => setFilterAction(a)}
                style={{ fontSize: 11 }}>
                {a === 'ALL' ? 'All' : (ACTION_META[a]?.label ?? a)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Timeline */}
          <div style={{ flex: 1 }}>
            <div className="card">
              {filtered.length === 0 ? (
                <div className="empty"><div>No events match the selected filters</div></div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 39, top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />

                  {filtered.map((a, idx) => {
                    const meta = ACTION_META[a.action] ?? { color: 'var(--text-muted)', icon: '○', label: a.action }
                    return (
                      <div key={a.id} style={{ display: 'flex', gap: 0, padding: '14px 20px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                        {/* Icon bubble */}
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginRight: 14, zIndex: 1,
                          background: `color-mix(in srgb, ${meta.color} 15%, var(--bg-card))`,
                          border: `1.5px solid color-mix(in srgb, ${meta.color} 40%, transparent)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: meta.color,
                        }}>{meta.icon}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{a.performedBy}</span>
                            <span style={{ fontSize: 12, color: meta.color, fontWeight: 500 }}>{meta.label}</span>
                            <span style={{
                              fontSize: 11, padding: '1px 7px', borderRadius: 4,
                              background: `color-mix(in srgb, ${TYPE_COLOR[a.entityType] ?? 'var(--accent)'} 12%, transparent)`,
                              color: TYPE_COLOR[a.entityType] ?? 'var(--accent)',
                              border: `1px solid color-mix(in srgb, ${TYPE_COLOR[a.entityType] ?? 'var(--accent)'} 25%, transparent)`,
                              fontFamily: 'var(--mono)',
                            }}>{a.entityType?.replace(/_/g, ' ')}</span>
                            <span className="tag">#{a.entityId}</span>
                          </div>

                          {a.comments && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontStyle: 'italic' }}>
                              "{a.comments}"
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={10} />
                              {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--border-light)' }}>
                              {format(new Date(a.timestamp), 'MMM d, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stats sidebar */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header"><span style={{ fontWeight: 600, fontSize: 13 }}>By Action</span></div>
              <div style={{ padding: '8px 0' }}>
                {Object.entries(ACTION_META).map(([key, meta]) => {
                  const count = activity.filter(a => a.action === key).length
                  if (!count) return null
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: meta.color, fontSize: 13 }}>{meta.icon}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{meta.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span style={{ fontWeight: 600, fontSize: 13 }}>By Entity</span></div>
              <div style={{ padding: '8px 0' }}>
                {['RULE', 'STATE_CONSTRAINT', 'CHANNEL_CONSTRAINT'].map(type => {
                  const count = activity.filter(a => a.entityType === type).length
                  return (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{type.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: TYPE_COLOR[type] }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
