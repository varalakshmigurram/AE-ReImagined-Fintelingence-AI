import { useEffect, useState } from 'react'
import { getStates, upsertState, submitStateForReview } from '../services/api'
import { Plus, Edit2, Send, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import StateModal from '../components/StateModal'

export default function StateConfig() {
  const [env, setEnv] = useState('TEST')
  const [states, setStates] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')

  const load = () => {
    setLoading(true)
    getStates(env).then(d => { setStates(d); setFiltered(d) }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [env])

  useEffect(() => {
    let f = states
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'OFF') f = f.filter(s => s.stateOnOff === 'OFF')
      else if (filterStatus === 'ON') f = f.filter(s => s.stateOnOff !== 'OFF')
      else f = f.filter(s => s.approvalStatus === filterStatus)
    }
    if (search) f = f.filter(s => s.stateCode?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(f)
  }, [states, search, filterStatus])

  const handleSave = async (data) => {
    try {
      await upsertState({ ...data, environment: env })
      toast.success(`State ${data.stateCode} saved`)
      setShowModal(false); setEditState(null); load()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data || e?.message || 'Error saving state'
      toast.error(String(msg))
    }
  }

  const handleSubmit = async (s) => {
    try {
      await submitStateForReview(s.id)
      toast.success(`State ${s.stateCode} submitted for review`)
      load()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data || e?.message || 'Could not submit'
      toast.error(String(msg))
    }
  }

  const statusBadge = (s) => {
    const map = { APPROVED: 'approved', PENDING_REVIEW: 'pending', DRAFT: 'draft', REJECTED: 'rejected' }
    return <span className={`badge badge-${map[s] ?? 'draft'}`}>{s?.replace(/_/g, ' ')}</span>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">State Configuration</div>
          <div className="page-subtitle">Loan constraints per US state — FEB state management</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <EnvToggle env={env} setEnv={setEnv} />
          <button className="btn btn-primary" onClick={() => { setEditState(null); setShowModal(true) }}>
            <Plus size={14} /> Add State
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="action-bar">
        <div className="tabs">
          {['ALL', 'OFF', 'ON', 'PENDING_REVIEW', 'DRAFT'].map(s => (
            <button key={s} className={`tab ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s.replace(/_/g, ' ')}
              {s === 'OFF' && <span style={{ marginLeft: 4, color: 'var(--danger)', fontWeight: 700 }}>
                ({states.filter(x => x.stateOnOff === 'OFF').length})
              </span>}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input className="form-control" placeholder="Search state…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>

      {/* State Grid Cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
          {filtered.map(s => (
            <div key={s.id} className="card" style={{
              borderColor: s.stateOnOff === 'OFF' ? 'rgba(239,68,68,0.3)' : 'var(--border)',
              opacity: s.stateOnOff === 'OFF' ? 0.85 : 1
            }}>
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: s.stateOnOff === 'OFF' ? 'var(--danger)' : 'var(--text)' }}>{s.stateCode}</span>
                    {s.stateOnOff === 'OFF'
                      ? <span className="badge badge-off">OFF</span>
                      : <span className="badge badge-on">ON</span>
                    }
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {statusBadge(s.approvalStatus)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <MiniStat label="Loan Range" value={`$${(s.minLoanAmount/1000).toFixed(0)}K–$${(s.maxLoanAmount/1000).toFixed(0)}K`} />
                  <MiniStat label="APR Range" value={`${s.minApr}%–${s.maxApr}%`} />
                  <MiniStat label="Term (mo)" value={`${s.minTermMonths}–${s.maxTermMonths}`} />
                  {s.maxOriginationFee && <MiniStat label="Max Orig Fee" value={`$${s.maxOriginationFee}`} />}
                </div>

                {s.originationFeeLogic && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {s.originationFeeLogic}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditState(s); setShowModal(true) }}>
                    <Edit2 size={11} /> Edit
                  </button>
                  {(s.approvalStatus === 'DRAFT' || s.approvalStatus === 'REJECTED') && (
                    <button className="btn btn-sm" style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.25)' }} onClick={() => handleSubmit(s)}>
                      <Send size={11} /> Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>}

      {/* Table view */}
      <div className="card">
        <div className="card-header"><span style={{ fontWeight: 600, fontSize: 14 }}>State Constraints Table</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Min Loan</th>
                <th>Max Loan</th>
                <th>Min APR%</th>
                <th>Max APR%</th>
                <th>Min Term</th>
                <th>Max Term</th>
                <th>Max Orig Fee</th>
                <th>Max Orig Fee %</th>
                <th>Status</th>
                <th>ON/OFF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{s.stateCode}</td>
                  <td>${s.minLoanAmount?.toLocaleString()}</td>
                  <td>${s.maxLoanAmount?.toLocaleString()}</td>
                  <td>{s.minApr}%</td>
                  <td>{s.maxApr}%</td>
                  <td>{s.minTermMonths}m</td>
                  <td>{s.maxTermMonths}m</td>
                  <td>{s.maxOriginationFee ? `$${s.maxOriginationFee}` : '—'}</td>
                  <td>{s.maxOriginationFeePercentage ? `${(s.maxOriginationFeePercentage * 100).toFixed(0)}%` : '—'}</td>
                  <td>{statusBadge(s.approvalStatus)}</td>
                  <td>
                    {s.stateOnOff === 'OFF'
                      ? <span className="badge badge-off">OFF</span>
                      : <span className="badge badge-on">ON</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditState(s); setShowModal(true) }}><Edit2 size={11} /></button>
                      {(s.approvalStatus === 'DRAFT' || s.approvalStatus === 'REJECTED') && (
                        <button className="btn btn-sm" style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.25)' }} onClick={() => handleSubmit(s)}>
                          <Send size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <StateModal state={editState} onSave={handleSave} onClose={() => { setShowModal(false); setEditState(null) }} />}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 6, padding: '5px 8px' }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function EnvToggle({ env, setEnv }) {
  return (
    <div className="env-selector">
      {['TEST', 'PROD'].map(e => (
        <button key={e} className={`env-btn ${e.toLowerCase()} ${env === e ? 'active' : ''}`} onClick={() => setEnv(e)}>{e}</button>
      ))}
    </div>
  )
}
