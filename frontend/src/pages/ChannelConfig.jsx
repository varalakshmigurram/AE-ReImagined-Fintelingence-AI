import { useEffect, useState } from 'react'
import { getChannels, upsertChannel, submitChannelForReview } from '../services/api'
import { Edit2, Send, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import ChannelModal from '../components/ChannelModal'

const CHANNEL_META = {
  CMPQ:  { color:'#2563EB', bg:'#EFF6FF', label:'Credit Match Pre-Qualify',   short:'CMPQ' },
  CKPQ:  { color:'#7C3AED', bg:'#F5F3FF', label:'Credit Karma Pre-Qualify',   short:'CKPQ' },
  CMACT: { color:'#0891B2', bg:'#ECFEFF', label:'Credit Match ACT',            short:'CMACT' },
  QS:    { color:'#D97706', bg:'#FFFBEB', label:'Quin Street',                 short:'QS' },
  LT:    { color:'#059669', bg:'#ECFDF5', label:'Lending Tree',                short:'LT' },
  ML:    { color:'#EA580C', bg:'#FFF7ED', label:'Money Lion',                  short:'ML' },
  MO:    { color:'#DB2777', bg:'#FDF2F8', label:'Monevo',                      short:'MO' },
}

export default function ChannelConfig() {
  const [env, setEnv] = useState('TEST')
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [editChannel, setEditChannel] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = () => { setLoading(true); getChannels(env).then(setChannels).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [env])

  const handleSave = async (data) => {
    try {
      await upsertChannel({ ...data, environment: env })
      toast.success(`Channel ${data.channelCode} saved`)
      setShowModal(false); setEditChannel(null); load()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data || e?.message || 'Error saving channel'
      toast.error(String(msg))
    }
  }
  const handleSubmit = async (c) => {
    try {
      await submitChannelForReview(c.id)
      toast.success(`${CHANNEL_META[c.channelCode]?.label || c.channelCode} submitted for Lead Lead Analyst review`)
      load()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data || e?.message || 'Could not submit'
      toast.error(String(msg))
    }
  }

  const statusBadge = (s) => {
    const map = { APPROVED:'approved', PENDING_REVIEW:'pending', DRAFT:'draft', REJECTED:'rejected' }
    return <span className={`badge badge-${map[s]??'draft'}`}>{s?.replace(/_/g,' ')}</span>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Channel Configuration</div>
          <div className="page-subtitle">Loan constraints per acquisition channel — {channels.length} channels configured</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div className="env-selector">
            {['TEST','PROD'].map(e=><button key={e} className={`env-btn ${e.toLowerCase()} ${env===e?'active':''}`} onClick={()=>setEnv(e)}>{e}</button>)}
          </div>
        </div>
      </div>

      {/* Channel cards */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner"/></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14, marginBottom:20 }}>
          {channels.map(c => {
            const meta = CHANNEL_META[c.channelCode] || { color:'#64748B', bg:'#F8FAFC', label:c.channelCode }
            return (
              <div key={c.id} className="card" style={{ borderTop:`3px solid ${meta.color}` }}>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:700, fontFamily:'var(--mono)', background:meta.bg, color:meta.color, padding:'2px 8px', borderRadius:4, border:`1px solid ${meta.color}22` }}>
                          {c.channelCode}
                        </span>
                        {statusBadge(c.approvalStatus)}
                      </div>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{meta.label}</div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                    {[
                      ['Min Loan', `$${c.minLoanAmount?.toLocaleString()}`],
                      ['Max Loan', `$${c.maxLoanAmount?.toLocaleString()}`],
                      ['Min APR', `${c.minApr}%`],
                      ['Max APR', `${c.maxApr}%`],
                      ['Min Term', `${c.minTermMonths} mo`],
                      ['Max Term', `${c.maxTermMonths} mo`],
                    ].map(([l,v])=>(
                      <div key={l} style={{ background:'var(--bg-card2)', borderRadius:'var(--radius-sm)', padding:'6px 10px', border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2, fontWeight:600 }}>{l}</div>
                        <div style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'var(--text)' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{ setEditChannel(c); setShowModal(true) }}><Edit2 size={12}/> Edit</button>
                    {(c.approvalStatus==='DRAFT'||c.approvalStatus==='REJECTED') && (
                      <button className="btn btn-sm" style={{ background:'var(--purple-light)', color:'var(--purple)', border:'1px solid rgba(124,58,237,.25)' }} onClick={()=>handleSubmit(c)}>
                        <Send size={12}/> Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight:600, fontSize:14 }}>All Channels — {env} Environment</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Code</th><th>Full Name</th><th>Min Loan</th><th>Max Loan</th><th>Min APR</th><th>Max APR</th><th>Term Range</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {channels.map(c => {
                const meta = CHANNEL_META[c.channelCode] || { color:'#64748B', label:c.channelCode }
                return (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:meta.color, fontSize:12 }}>{c.channelCode}</span>
                    </td>
                    <td style={{ fontWeight:500, color:'var(--text)' }}>{meta.label}</td>
                    <td>${c.minLoanAmount?.toLocaleString()}</td>
                    <td>${c.maxLoanAmount?.toLocaleString()}</td>
                    <td>{c.minApr}%</td>
                    <td>{c.maxApr}%</td>
                    <td>{c.minTermMonths}–{c.maxTermMonths} mo</td>
                    <td>{statusBadge(c.approvalStatus)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={()=>{ setEditChannel(c); setShowModal(true) }}><Edit2 size={11}/></button>
                        {(c.approvalStatus==='DRAFT'||c.approvalStatus==='REJECTED') && (
                          <button className="btn btn-sm" style={{ background:'var(--purple-light)', color:'var(--purple)', border:'1px solid rgba(124,58,237,.25)' }} onClick={()=>handleSubmit(c)}><Send size={11}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <ChannelModal channel={editChannel} onSave={handleSave} onClose={()=>{ setShowModal(false); setEditChannel(null) }}/>}
    </div>
  )
}
