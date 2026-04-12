import { useState, useEffect } from 'react'
import { RefreshCw, GitBranch, ChevronRight, CheckCircle, Clock, AlertTriangle, RotateCcw, Zap, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { formatDistanceToNow, format } from 'date-fns'

const v1 = axios.create({ baseURL: '/api/v1/config-versions', timeout: 10000 })

const api = {
  getAll:     (scope) => v1.get('', { params: scope ? { scope } : {} }).then(r => r.data),
  getPending: ()     => v1.get('/pending').then(r => r.data),
  getCurrent: (scope) => v1.get('/current', { params: { scope } }).then(r => r.data).catch(() => null),
  submit:     (id, by) => v1.post(`/${id}/submit`, {}, { params: { submittedBy: by } }).then(r => r.data),
  approve:    (id, by, notes) => v1.post(`/${id}/approve`, { notes }, { params: { approvedBy: by } }).then(r => r.data),
  reject:     (id, by, reason) => v1.post(`/${id}/reject`, { reason }, { params: { rejectedBy: by } }).then(r => r.data),
  promote:    (id, by) => v1.post(`/${id}/promote`, {}, { params: { promotedBy: by } }).then(r => r.data),
  rollback:   (id, by) => v1.post(`/${id}/rollback`, {}, { params: { rolledBackBy: by } }).then(r => r.data),
}

const STATUS_META = {
  DRAFT:          { color:'var(--muted)',    bg:'var(--border)',       icon:'○', label:'Draft' },
  PENDING_REVIEW: { color:'var(--warning)',  bg:'var(--warning-dim)',  icon:'⊙', label:'Pending Review' },
  APPROVED:       { color:'var(--success)',  bg:'var(--success-dim)',  icon:'✔', label:'Approved' },
  PROMOTED:       { color:'var(--cyan)',     bg:'var(--cyan-dim)',     icon:'⚡', label:'Promoted' },
  REJECTED:       { color:'var(--danger)',   bg:'var(--danger-dim)',   icon:'✖', label:'Rejected' },
  ROLLED_BACK:    { color:'var(--muted)',    bg:'var(--border)',       icon:'↩', label:'Rolled Back' },
}

const SCOPE_COLOR = {
  RULES:        'var(--accent)',
  OFFER_CONFIG: 'var(--purple)',
  CUTOFFS:      'var(--warning)',
  MASTER:       'var(--cyan)',
}

export default function ConfigVersionManager() {
  const [versions, setVersions] = useState([])
  const [pending, setPending] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('history')
  const [scopeFilter, setScopeFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [reviewAction, setReviewAction] = useState(null)  // { id, action }
  const [reviewNote, setReviewNote] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.getAll(scopeFilter !== 'ALL' ? scopeFilter : null),
      api.getPending(),
    ]).then(([v, p]) => { setVersions(v); setPending(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [scopeFilter])

  const doAction = async (fn, successMsg) => {
    try { await fn(); toast.success(successMsg); load() }
    catch (e) { toast.error(e.response?.data?.error || e.message) }
  }

  const handleReview = async () => {
    if (!reviewAction) return
    const { id, action } = reviewAction
    if (action === 'approve') await doAction(() => api.approve(id, 'manager', reviewNote), 'Approved ✓')
    else await doAction(() => api.reject(id, 'manager', reviewNote), 'Rejected')
    setReviewAction(null); setReviewNote('')
  }

  const filteredVersions = versions

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Config Version Manager</div>
          <div className="page-subtitle">
            Flyway-style versioned config — collision prevention, parallel-safe editing, full promotion lifecycle
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {pending.length > 0 && (
            <div style={{ background:'var(--warning-dim)', border:'1px solid rgba(245,158,11,.25)', borderRadius:8, padding:'6px 12px', fontSize:11, color:'var(--warning)', fontWeight:600 }}>
              ⊙ {pending.length} Pending Review
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12}/> Refresh</button>
        </div>
      </div>

      {/* How versioning works */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { icon:'🔢', title:'Unique Versions', desc:'Each save requires x.y.z — duplicates rejected immediately', color:'var(--accent)' },
          { icon:'🔀', title:'Parallel Safe', desc:'Multiple analysts work on different versions simultaneously', color:'var(--purple)' },
          { icon:'🔍', title:'Review Required', desc:'All versions go through DRAFT → PENDING → APPROVED before prod', color:'var(--warning)' },
          { icon:'↩', title:'Rollback Ready', desc:'Any previous PROD version can be restored with one click', color:'var(--success)' },
        ].map(c => (
          <div key={c.title} className="card" style={{ padding:14, borderTop:`2px solid ${c.color}` }}>
            <div style={{ fontSize:20, marginBottom:5 }}>{c.icon}</div>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:3 }}>{c.title}</div>
            <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div className="tabs">
          <button className={`tab ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}>
            Version History {versions.length > 0 && `(${versions.length})`}
          </button>
          <button className={`tab ${tab==='review'?'active':''}`} onClick={()=>setTab('review')}>
            Review Queue {pending.length > 0 && <span style={{ marginLeft:4, color:'var(--warning)', fontWeight:700 }}>({pending.length})</span>}
          </button>
          <button className={`tab ${tab==='lifecycle'?'active':''}`} onClick={()=>setTab('lifecycle')}>Lifecycle Guide</button>
        </div>
        {tab === 'history' && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--muted)' }}>Scope:</span>
            <div className="tabs">
              {['ALL','RULES','OFFER_CONFIG','CUTOFFS','MASTER'].map(s => (
                <button key={s} className={`tab ${scopeFilter===s?'active':''}`} onClick={()=>setScopeFilter(s)} style={{ fontSize:10 }}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── VERSION HISTORY ── */}
      {tab === 'history' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
          {/* Timeline */}
          <div>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner"/></div>
            ) : filteredVersions.length === 0 ? (
              <div className="card">
                <div style={{ padding:48, textAlign:'center', color:'var(--muted)' }}>
                  <GitBranch size={28} style={{ marginBottom:10, opacity:.4 }}/>
                  <div style={{ fontWeight:600, marginBottom:4 }}>No versions yet</div>
                  <div style={{ fontSize:12 }}>Save your first rule set with a version number to get started</div>
                </div>
              </div>
            ) : (
              <div className="card">
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'90px 80px 90px 1fr 100px 120px', padding:'8px 16px', background:'var(--bg-card2)', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>
                  <div>Version</div><div>Scope</div><div>Env</div><div>Description</div><div>Status</div><div>Age</div>
                </div>
                {filteredVersions.map(v => {
                  const sm = STATUS_META[v.status] || STATUS_META.DRAFT
                  return (
                    <div key={v.id} onClick={() => setSelected(v === selected ? null : v)}
                      style={{ display:'grid', gridTemplateColumns:'90px 80px 90px 1fr 100px 120px', padding:'11px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer', background: selected?.id===v.id ? 'var(--bg-hover)' : 'transparent', transition:'background .1s' }}>
                      <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:'var(--text)' }}>v{v.version}</div>
                      <div>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`color-mix(in srgb, ${SCOPE_COLOR[v.configScope]||'var(--accent)'} 14%, transparent)`, color:SCOPE_COLOR[v.configScope]||'var(--accent)', fontWeight:600 }}>
                          {v.configScope?.replace('_',' ')}
                        </span>
                      </div>
                      <div>
                        <span className={`badge ${v.environment==='PROD'?'badge-approved':'badge-test'}`} style={{ fontSize:9 }}>{v.environment}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-subtle)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
                        {v.description || <span style={{ color:'var(--muted)', fontStyle:'italic' }}>No description</span>}
                      </div>
                      <div>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:sm.bg, color:sm.color, fontWeight:600 }}>
                          {sm.icon} {sm.label}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>
                        {v.createdAt ? formatDistanceToNow(new Date(v.createdAt), {addSuffix:true}) : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="card">
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>v{selected.version}</div>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:STATUS_META[selected.status]?.bg, color:STATUS_META[selected.status]?.color, fontWeight:600 }}>
                    {STATUS_META[selected.status]?.label}
                  </span>
                  {selected.isCurrent && <span className="badge badge-approved" style={{ fontSize:9 }}>CURRENT</span>}
                </div>
                <div style={{ padding:16 }}>
                  <Field label="Batch ID" value={selected.batchId} mono/>
                  <Field label="Scope" value={selected.configScope?.replace('_',' ')}/>
                  <Field label="Environment" value={selected.environment}/>
                  <Field label="Description" value={selected.description}/>
                  <Field label="Created By" value={selected.createdBy}/>
                  <Field label="Created At" value={selected.createdAt ? format(new Date(selected.createdAt), 'MMM d yyyy HH:mm') : '—'}/>
                  {selected.approvedBy && <Field label="Approved By" value={selected.approvedBy}/>}
                  {selected.promotedBy && <Field label="Promoted By" value={selected.promotedBy}/>}
                  {selected.changeNotes && <Field label="Notes" value={selected.changeNotes}/>}

                  {/* Actions */}
                  <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
                    {selected.status === 'DRAFT' && (
                      <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center' }}
                        onClick={() => doAction(() => api.submit(selected.id, 'lead-analyst'), 'Submitted for review')}>
                        ⊙ Submit for Review
                      </button>
                    )}
                    {selected.status === 'PENDING_REVIEW' && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-success" style={{ flex:1, justifyContent:'center' }}
                          onClick={() => setReviewAction({ id:selected.id, action:'approve' })}>
                          ✔ Approve
                        </button>
                        <button className="btn btn-danger" style={{ flex:1, justifyContent:'center' }}
                          onClick={() => setReviewAction({ id:selected.id, action:'reject' })}>
                          ✖ Reject
                        </button>
                      </div>
                    )}
                    {selected.status === 'APPROVED' && selected.environment === 'TEST' && (
                      <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}
                        onClick={() => doAction(() => api.promote(selected.id, 'manager'), `v${selected.version} promoted to PROD ✓`)}>
                        <Zap size={13}/> Promote to PROD
                      </button>
                    )}
                    {selected.status === 'PROMOTED' && selected.environment === 'PROD' && (
                      <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', color:'var(--warning)' }}
                        onClick={() => doAction(() => api.rollback(selected.id, 'manager'), 'Rolled back ✓')}>
                        <RotateCcw size={13}/> Rollback to this version
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ height:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ textAlign:'center', color:'var(--muted)' }}>
                  <ChevronRight size={20} style={{ marginBottom:6, opacity:.4 }}/>
                  <div style={{ fontSize:12 }}>Select a version to view details</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEW QUEUE ── */}
      {tab === 'review' && (
        <div>
          {pending.length === 0 ? (
            <div className="card">
              <div style={{ padding:60, textAlign:'center', color:'var(--muted)' }}>
                <CheckCircle size={28} style={{ marginBottom:10, color:'var(--success)', opacity:.6 }}/>
                <div style={{ fontWeight:600 }}>All caught up — no pending reviews</div>
              </div>
            </div>
          ) : pending.map(v => (
            <div key={v.id} className="card" style={{ marginBottom:10, borderLeft:'3px solid var(--warning)' }}>
              <div style={{ padding:'14px 16px', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'var(--warning-dim)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:800, fontSize:13, fontFamily:'var(--mono)', color:'var(--warning)' }}>v{v.version}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`color-mix(in srgb, ${SCOPE_COLOR[v.configScope]||'var(--accent)'} 14%, transparent)`, color:SCOPE_COLOR[v.configScope]||'var(--accent)', fontWeight:600 }}>
                      {v.configScope?.replace('_',' ')}
                    </span>
                    <span className="badge badge-pending">PENDING REVIEW</span>
                    <span style={{ fontSize:10, color:'var(--muted)', marginLeft:'auto' }}>
                      {v.createdAt ? formatDistanceToNow(new Date(v.createdAt), {addSuffix:true}) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize:13, color:'var(--text)' }}>{v.description || <span style={{ color:'var(--muted)', fontStyle:'italic' }}>No description</span>}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>By <b style={{ color:'var(--text-subtle)' }}>{v.createdBy}</b> · batchId: <code style={{ fontFamily:'var(--mono)', fontSize:10 }}>{v.batchId?.slice(0,12)}…</code></div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button className="btn btn-success btn-sm" onClick={() => setReviewAction({ id:v.id, action:'approve' })}>✔ Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setReviewAction({ id:v.id, action:'reject' })}>✖ Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LIFECYCLE GUIDE ── */}
      {tab === 'lifecycle' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13 }}>Version Lifecycle</div>
            <div style={{ padding:16 }}>
              {[
                { from:'DRAFT', to:'PENDING_REVIEW', action:'Submit for Review', who:'Lead Analyst', icon:'⊙', color:'var(--purple)' },
                { from:'PENDING_REVIEW', to:'APPROVED', action:'Approve', who:'Manager', icon:'✔', color:'var(--success)' },
                { from:'PENDING_REVIEW', to:'REJECTED', action:'Reject', who:'Manager', icon:'✖', color:'var(--danger)' },
                { from:'REJECTED', to:'DRAFT', action:'Create new version', who:'Lead Analyst', icon:'○', color:'var(--muted)' },
                { from:'APPROVED', to:'PROMOTED', action:'Promote to PROD', who:'Manager', icon:'⚡', color:'var(--cyan)' },
                { from:'PROMOTED', to:'PROMOTED (prev)', action:'Rollback to prior version', who:'Manager', icon:'↩', color:'var(--warning)' },
              ].map((s,i) => (
                <div key={i} style={{ display:'flex', gap:12, marginBottom:12, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:`color-mix(in srgb, ${s.color} 15%, transparent)`, border:`1.5px solid ${s.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:s.color, flexShrink:0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>
                      <span style={{ fontFamily:'var(--mono)', color:'var(--text-subtle)' }}>{s.from}</span>
                      {' → '}
                      <span style={{ fontFamily:'var(--mono)', color:s.color }}>{s.to}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.action} — by <b>{s.who}</b></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13 }}>Semantic Versioning Rules</div>
            <div style={{ padding:16 }}>
              {[
                { ver:'x.y.z', part:'x', desc:'Major version — increment when a code deployment is also required (e.g. new internal model mapping, new adjuster type, new rule group)', color:'var(--danger)' },
                { ver:'x.y.z', part:'y', desc:'Minor version — value-only change that can go to production directly without any code changes (e.g. updating a cutoff value, turning a state OFF)', color:'var(--warning)' },
                { ver:'x.y.z', part:'z', desc:'Patch version — used by QA teams in test environments only. Not eligible for PROD promotion without incrementing y or x first.', color:'var(--success)' },
              ].map((s,i) => (
                <div key={i} style={{ marginBottom:14, padding:12, background:'var(--bg-card2)', borderRadius:'var(--radius)', border:`1px solid color-mix(in srgb, ${s.color} 30%, transparent)` }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                    <code style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:800, color:s.color }}>{s.part}</code>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>in {s.ver}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-subtle)', lineHeight:1.6 }}>{s.desc}</div>
                </div>
              ))}

              <div style={{ marginTop:10, padding:10, background:'var(--bg)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:600, marginBottom:6 }}>Collision Detection</div>
                <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.6 }}>
                  If two analysts both try to save as version 1.2.0 for the same scope, the second save is immediately rejected with:
                  <br/>
                  <code style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--danger)', display:'block', marginTop:4 }}>"Version 1.2.0 already exists — created by analyst on 2025-04-07 (APPROVED). Try 1.2.1"</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Review modal ── */}
      {reviewAction && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <div style={{ fontWeight:700, fontSize:15 }}>
                {reviewAction.action === 'approve' ? '✔ Approve Version' : '✖ Reject Version'}
              </div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{reviewAction.action === 'approve' ? 'Review Notes (optional)' : 'Rejection Reason *'}</label>
                <textarea className="form-control" rows={3} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}
                  placeholder={reviewAction.action === 'approve' ? 'Approved — changes look correct' : 'Explain why this version is being rejected…'}
                  autoFocus/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setReviewAction(null); setReviewNote('') }}>Cancel</button>
              <button
                className={`btn ${reviewAction.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                disabled={reviewAction.action === 'reject' && !reviewNote.trim()}
                onClick={handleReview}>
                {reviewAction.action === 'approve' ? '✔ Confirm Approval' : '✖ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, mono }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12, fontFamily: mono ? 'var(--mono)' : undefined, color:'var(--text)', wordBreak:'break-all' }}>{value || '—'}</div>
    </div>
  )
}
