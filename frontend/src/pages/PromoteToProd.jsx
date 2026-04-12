import { useEffect, useState } from 'react'
import {
  getRules, getStates, getChannels,
  promoteRule, promoteState, promoteChannel
} from '../services/api'
import { Zap, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import DiffViewer from '../components/DiffViewer'

const PROMOTER = 'approver'

export default function PromoteToProd() {
  const [tab, setTab] = useState('rules')
  const [testRules, setTestRules] = useState([])
  const [prodRules, setProdRules] = useState([])
  const [testStates, setTestStates] = useState([])
  const [prodStates, setProdStates] = useState([])
  const [testChannels, setTestChannels] = useState([])
  const [prodChannels, setProdChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [diffItem, setDiffItem] = useState(null)
  const [promoting, setPromoting] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      getRules('TEST'), getRules('PROD'),
      getStates('TEST'), getStates('PROD'),
      getChannels('TEST'), getChannels('PROD'),
    ]).then(([tr, pr, ts, ps, tc, pc]) => {
      setTestRules(tr); setProdRules(pr)
      setTestStates(ts); setProdStates(ps)
      setTestChannels(tc); setProdChannels(pc)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getProdVersion = (type, id) => {
    if (type === 'rule') return prodRules.find(r => r.ruleId === id)
    if (type === 'state') return prodStates.find(s => s.stateCode === id)
    if (type === 'channel') return prodChannels.find(c => c.channelCode === id)
  }

  const handlePromote = async (type, item) => {
    setPromoting(item.id)
    try {
      if (type === 'rule') await promoteRule(item.id, PROMOTER)
      if (type === 'state') await promoteState(item.id, PROMOTER)
      if (type === 'channel') await promoteChannel(item.id, PROMOTER)
      toast.success(`✅ Promoted to PRODUCTION`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Promotion failed — item must be approved first')
    } finally {
      setPromoting(null)
    }
  }

  const testItems = { rules: testRules, states: testStates, channels: testChannels }[tab]
  const type = tab === 'rules' ? 'rule' : tab === 'states' ? 'state' : 'channel'
  const getKey = (item) => item.ruleId ?? item.stateCode ?? item.channelCode

  const promotable = testItems.filter(i => i.approvalStatus === 'APPROVED')
  const nonPromotable = testItems.filter(i => i.approvalStatus !== 'APPROVED')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Promote to Production</div>
          <div className="page-subtitle">Compare TEST vs PROD — deploy approved configs</div>
        </div>
      </div>

      {/* Env comparison header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 0, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ padding: '14px 20px', background: 'var(--purple-dim)', borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)', border: '1px solid rgba(167,139,250,0.25)', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TEST</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Source Environment</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card2)', height: '100%', border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
          <ArrowRight size={16} color="var(--text-muted)" />
        </div>
        <div style={{ padding: '14px 20px', background: 'var(--success-dim)', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', border: '1px solid rgba(34,197,94,0.25)', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PROD</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Target Environment</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 16 }}>
        <div className="tabs">
          {['rules', 'states', 'channels'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'rules' && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--success)' }}>({testRules.filter(r => r.approvalStatus === 'APPROVED').length} ready)</span>}
              {t === 'states' && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--success)' }}>({testStates.filter(s => s.approvalStatus === 'APPROVED').length} ready)</span>}
              {t === 'channels' && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--success)' }}>({testChannels.filter(c => c.approvalStatus === 'APPROVED').length} ready)</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Promotable */}
          {promotable.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} /> {promotable.length} Ready to Promote
              </div>
              {promotable.map(item => {
                const key = getKey(item)
                const prod = getProdVersion(type, key)
                const hasDiff = !!prod
                return (
                  <div key={item.id} className="card" style={{ marginBottom: 10, borderColor: 'rgba(34,197,94,0.25)' }}>
                    <div style={{ padding: '14px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)', fontSize: 14 }}>{key}</span>
                          <span className="badge badge-approved">APPROVED</span>
                          {hasDiff
                            ? <span style={{ fontSize: 11, color: 'var(--warning)' }}>⚡ Will overwrite existing PROD</span>
                            : <span style={{ fontSize: 11, color: 'var(--success)' }}>✦ New to PROD</span>
                          }
                        </div>
                        {type === 'rule' && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {item.description?.substring(0, 100)}{item.description?.length > 100 ? '…' : ''}
                          </div>
                        )}
                        {type === 'state' && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Loan: ${item.minLoanAmount?.toLocaleString()}–${item.maxLoanAmount?.toLocaleString()} | APR: {item.minApr}%–{item.maxApr}% | {item.stateOnOff === 'OFF' ? '🔴 OFF' : '🟢 ON'}
                          </div>
                        )}
                        {type === 'channel' && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Loan: ${item.minLoanAmount?.toLocaleString()}–${item.maxLoanAmount?.toLocaleString()} | APR: {item.minApr}%–{item.maxApr}%
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {hasDiff && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setDiffItem(diffItem?.id === item.id ? null : { ...item, prod })}>
                            Compare
                          </button>
                        )}
                        <button
                          className="btn btn-success"
                          disabled={promoting === item.id}
                          onClick={() => handlePromote(type, item)}
                          style={{ minWidth: 120 }}
                        >
                          {promoting === item.id
                            ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Promoting…</>
                            : <><Zap size={13} /> Promote to PROD</>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Side-by-side diff */}
                    {diffItem?.id === item.id && prod && (
                      <div style={{ padding: '0 20px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                          📊 TEST (proposed) vs PROD (current) — field-level comparison
                        </div>
                        <DiffViewer before={JSON.stringify(prod)} after={JSON.stringify(item)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Non-promotable */}
          {nonPromotable.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> {nonPromotable.length} Not Ready (needs approval first)
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Approval Status</th>
                        <th>Submitted By</th>
                        <th>Action Needed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonPromotable.map(item => {
                        const key = getKey(item)
                        const statusMap = { DRAFT: 'draft', PENDING_REVIEW: 'pending', REJECTED: 'rejected' }
                        return (
                          <tr key={item.id}>
                            <td><span className="tag">{key}</span></td>
                            <td><span className={`badge badge-${statusMap[item.approvalStatus] ?? 'draft'}`}>{item.approvalStatus?.replace(/_/g, ' ')}</span></td>
                            <td>{item.submittedBy ?? '—'}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {item.approvalStatus === 'DRAFT' ? 'Submit for review first' :
                               item.approvalStatus === 'PENDING_REVIEW' ? 'Awaiting Approver sign-off' :
                               'Fix rejection and resubmit'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {testItems.length === 0 && (
            <div className="card">
              <div className="empty" style={{ padding: 60 }}>
                <div className="empty-icon">📭</div>
                <div>No {tab} in TEST environment</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
