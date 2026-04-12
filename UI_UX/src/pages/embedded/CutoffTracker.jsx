import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, RefreshCw, Database, Filter, Download, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const v1 = axios.create({ baseURL: '/api/v1/embedded', timeout: 15000 })

const getCutoffEntries = (groupName, env) =>
  v1.get('/cutoffs/entries', { params: { ...(groupName ? { groupName } : {}), environment: env } }).then(r => r.data)
const getCutoffGroups  = () => v1.get('/cutoffs/groups').then(r => r.data)
const saveCutoffs      = (payload) => v1.post('/rules/save', payload).then(r => r.data)

const GRADE_OPTIONS   = ['A','A1','A2','B','B1','B2','C','C1','C2','D','D1','D2','E','E1','E2','F']
const CHANNEL_OPTIONS = ['CMPQ','CKPQ','QS','LT','ML','MO','CMACT','ORG','ONLINE','DEFAULT']
const CHANNEL_NAMES   = { CMPQ:'Credit Match Pre-Qualify', CKPQ:'Credit Karma Pre-Qualify', QS:'Quin Street', LT:'Lending Tree', ML:'Money Lion', MO:'Monevo', CMACT:'Credit Match ACT', ORG:'Originations', ONLINE:'Online', DEFAULT:'Default' }
const STATE_OPTIONS   = ['AK','AL','AZ','CA','CO','DE','FL','HI','ID','IN','KS','KY','LA','MI','MN','MS','MT','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI','ALL']
const DIM_PRESETS     = {
  'grade,channel,state': { dims:['creditGrade','channelCode','stateCode'], label:'Grade × Channel × State' },
  'grade,channel':       { dims:['creditGrade','channelCode'],              label:'Grade × Channel' },
  'grade,state':         { dims:['creditGrade','stateCode'],                label:'Grade × State' },
  'grade':               { dims:['creditGrade'],                             label:'Grade Only' },
  'all':                 { dims:[],                                          label:'Single Value (All)' },
}
const DIM_OPTIONS = { creditGrade: GRADE_OPTIONS, channelCode: CHANNEL_OPTIONS, stateCode: STATE_OPTIONS }

// ─── Inline cell editor ────────────────────────────────────────────────────
function EditableValue({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (editing) return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      <input type="number" value={val} onChange={e=>setVal(e.target.value)}
        style={{ width:80, padding:'2px 6px', border:'1px solid var(--accent)', borderRadius:4, fontFamily:'var(--mono)', fontSize:12 }}
        onKeyDown={e=>{ if(e.key==='Enter'){onSave(Number(val));setEditing(false)} if(e.key==='Escape')setEditing(false) }}
        autoFocus/>
      <button onClick={()=>{onSave(Number(val));setEditing(false)}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--success)', padding:2 }}><Check size={13}/></button>
      <button onClick={()=>setEditing(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:2 }}><X size={13}/></button>
    </div>
  )
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }} onClick={()=>setEditing(true)}>
      <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)', fontSize:13 }}>{value}</span>
      <Edit2 size={11} color="var(--text-muted)" style={{ opacity:.5 }}/>
    </div>
  )
}

// ─── Add new group dialog ──────────────────────────────────────────────────
function AddGroupPanel({ onAdd, onClose }) {
  const [name, setName]     = useState('')
  const [preset, setPreset] = useState('grade,channel,state')
  const [version, setVersion] = useState('1.0.0')
  const [desc, setDesc]     = useState('')

  return (
    <div className="card" style={{ padding:18, marginBottom:16, border:'2px dashed var(--accent)', background:'var(--accent-light)' }}>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:'var(--accent)' }}>New Cutoff Group</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px 1fr', gap:12, marginBottom:12 }}>
        <div className="form-group">
          <label className="form-label">Group Name *</label>
          <input className="form-control" value={name} onChange={e=>setName(e.target.value)} placeholder="cvScoreCutoff" style={{ fontFamily:'var(--mono)' }}/>
        </div>
        <div className="form-group">
          <label className="form-label">Dimension Preset</label>
          <select className="form-control" value={preset} onChange={e=>setPreset(e.target.value)}>
            {Object.entries(DIM_PRESETS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Version</label>
          <input className="form-control" value={version} onChange={e=>setVersion(e.target.value)} placeholder="1.0.0" style={{ fontFamily:'var(--mono)' }}/>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-control" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What this cutoff group controls"/>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary btn-sm" disabled={!name.trim()} onClick={()=>onAdd({ name:name.trim(), preset, version, desc })}>Add Group</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export default function CutoffTracker() {
  const [env, setEnv]               = useState('TEST')
  const [entries, setEntries]        = useState([])  // from DB
  const [groups, setGroups]          = useState([])  // distinct group names from DB
  const [selectedGroup, setSelGroup] = useState(null)
  const [loading, setLoading]        = useState(true)
  const [saving, setSaving]          = useState(false)

  // Local draft editor
  const [draft, setDraft]           = useState({})  // groupName -> [{dimKey, dims, value}]
  const [draftMeta, setDraftMeta]   = useState({})  // groupName -> {preset, version, desc}
  const [showAddGroup, setShowAdd]  = useState(false)
  const [activeTab, setActiveTab]   = useState('table') // table | editor

  const load = async () => {
    setLoading(true)
    try {
      const [ents, grps] = await Promise.all([ getCutoffEntries(null, env), getCutoffGroups() ])
      setEntries(ents)
      setGroups(grps)
    } catch(e) { toast.error('Could not load cutoff data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [env])

  // Group entries by groupName for the table view
  const byGroup = entries.reduce((acc, e) => {
    if (!acc[e.groupName]) acc[e.groupName] = []
    acc[e.groupName].push(e)
    return acc
  }, {})

  // Add new draft group
  const handleAddGroup = ({ name, preset, version, desc }) => {
    const dims = DIM_PRESETS[preset]?.dims || []
    const emptyRow = { _id: Math.random(), value: 0, dims: Object.fromEntries(dims.map(d => [d, DIM_OPTIONS[d]?.[0] || ''])) }
    setDraft(d => ({ ...d, [name]: [emptyRow] }))
    setDraftMeta(m => ({ ...m, [name]: { preset, version, desc } }))
    setShowAdd(false)
    setActiveTab('editor')
    setSelGroup(name)
  }

  const addRow = (gname) => {
    const preset = draftMeta[gname]?.preset || 'grade,channel,state'
    const dims = DIM_PRESETS[preset]?.dims || []
    const emptyRow = { _id: Math.random(), value: 0, dims: Object.fromEntries(dims.map(d => [d, DIM_OPTIONS[d]?.[0] || ''])) }
    setDraft(d => ({ ...d, [gname]: [...(d[gname]||[]), emptyRow] }))
  }
  const removeRow = (gname, id) => setDraft(d => ({ ...d, [gname]: d[gname].filter(r => r._id !== id) }))
  const updateRow = (gname, id, field, val) =>
    setDraft(d => ({ ...d, [gname]: d[gname].map(r => r._id !== id ? r : field === 'value' ? {...r, value: val} : {...r, dims:{...r.dims,[field]:val}}) }))

  const buildDimKey = (dims, row) => dims.length === 0 ? 'ALL' : dims.map(d => row.dims[d] || '*').join(',')

  const handleSave = async () => {
    if (Object.keys(draft).length === 0) { toast.error('No cutoff groups to save'); return }
    setSaving(true)
    try {
      const version = Object.values(draftMeta)[0]?.version || '1.0.0'
      const versionDesc = Object.values(draftMeta).map(m => m.desc).filter(Boolean).join('; ')

      const cutoffs = {}
      for (const [gname, rows] of Object.entries(draft)) {
        const preset = draftMeta[gname]?.preset || 'grade,channel,state'
        const dims   = DIM_PRESETS[preset]?.dims || []
        cutoffs[gname] = {}
        for (const row of rows) {
          const key = buildDimKey(dims, row)
          cutoffs[gname][key] = row.value
        }
      }

      const r = await saveCutoffs({ version, versionDescription: versionDesc || 'Cutoff update', createdBy:'lead-analyst', cutoffs })
      if (r.success) {
        toast.success(`Cutoffs saved — batchId: ${r.batchId?.slice(0,8)}…`)
        setDraft({}); setDraftMeta({}); setActiveTab('table'); load()
      } else { toast.error(r.validationErrors?.[0] || 'Save failed') }
    } catch(e) { toast.error(e.response?.data?.error || e.message) }
    finally { setSaving(false) }
  }

  const hasDraft = Object.keys(draft).length > 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Cutoff Tracker</div>
          <div className="page-subtitle">
            Production cutoff values tracked per rule, grade, channel, and state — every save persists to database
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div className="env-selector">
            {['TEST','PROD'].map(e=><button key={e} className={`env-btn ${e.toLowerCase()} ${env===e?'active':''}`} onClick={()=>setEnv(e)}>{e}</button>)}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12}/></button>
          {hasDraft && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="spinner" style={{width:13,height:13}}/> Saving…</> : <><Save size={13}/> Save to Production</>}
            </button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        <div className="stat-card" style={{ borderTop:'3px solid var(--accent)' }}>
          <div className="stat-icon" style={{ background:'var(--accent-light)' }}><Database size={16} color="var(--accent)"/></div>
          <div className="stat-value">{entries.length}</div>
          <div className="stat-label">Total Cutoff Rows</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'var(--purple-light)' }}><Filter size={16} color="var(--purple)"/></div>
          <div className="stat-value">{groups.length}</div>
          <div className="stat-label">Cutoff Groups</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'var(--success-light)' }}><Check size={16} color="var(--success)"/></div>
          <div className="stat-value" style={{ color:'var(--success)' }}>{env}</div>
          <div className="stat-label">Active Environment</div>
        </div>
        <div className="stat-card" style={{ borderTop: hasDraft?'3px solid var(--warning)':undefined }}>
          <div className="stat-icon" style={{ background:'var(--warning-light)' }}><Edit2 size={16} color="var(--warning)"/></div>
          <div className="stat-value" style={{ color: hasDraft?'var(--warning)':'var(--text)' }}>{Object.keys(draft).length}</div>
          <div className="stat-label">Unsaved Groups</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
        <div className="tabs">
          <button className={`tab ${activeTab==='table'?'active':''}`} onClick={()=>setActiveTab('table')}>
            <Database size={12}/> Production Table
          </button>
          <button className={`tab ${activeTab==='editor'?'active':''}`} onClick={()=>setActiveTab('editor')}>
            <Edit2 size={12}/> Editor {hasDraft && <span style={{ background:'var(--warning)', color:'#fff', borderRadius:10, padding:'1px 5px', fontSize:9, fontWeight:700, marginLeft:4 }}>{Object.keys(draft).length}</span>}
          </button>
        </div>
        {activeTab === 'editor' && (
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdd(true)}><Plus size={12}/> Add Cutoff Group</button>
        )}
      </div>

      {/* ── TABLE VIEW ── */}
      {activeTab === 'table' && (
        loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner"/></div>
        ) : Object.keys(byGroup).length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon"><Database size={32}/></div>
              <div style={{ fontWeight:600, marginBottom:6 }}>No cutoffs in {env} yet</div>
              <div style={{ fontSize:13, marginBottom:14 }}>Use the Editor tab to add cutoff groups and save them to the database</div>
              <button className="btn btn-primary btn-sm" onClick={()=>setActiveTab('editor')}><Edit2 size={12}/> Open Editor</button>
            </div>
          </div>
        ) : Object.entries(byGroup).map(([gname, rows]) => (
          <div key={gname} className="card" style={{ marginBottom:14 }}>
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14, color:'var(--accent)' }}>{gname}</span>
                <span className="badge badge-active">{rows.length} rows</span>
                <span className={`badge badge-${env==='PROD'?'prod':'test'}`}>{env}</span>
                {rows.some(r=>r.isChanged) && <span className="badge badge-pending">HAS CHANGES</span>}
              </div>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>batchId: <code>{rows[0]?.batchId?.slice(0,12)}…</code></span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Credit Grade</th>
                    <th>Channel</th>
                    <th>State</th>
                    <th>Dimension Key</th>
                    <th>Cutoff Value</th>
                    <th>Saved By</th>
                    <th>Updated</th>
                    <th>Changed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ background: row.isChanged ? 'var(--warning-light)' : undefined }}>
                      <td>
                        {row.creditGrade ? <span style={{ background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(37,99,235,.2)', borderRadius:4, padding:'2px 8px', fontFamily:'var(--mono)', fontSize:11, fontWeight:700 }}>{row.creditGrade}</span> : <span style={{ color:'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        {row.channelCode ? (
                          <div>
                            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:11, color:'var(--text)' }}>{row.channelCode}</span>
                            <div style={{ fontSize:10, color:'var(--text-muted)' }}>{CHANNEL_NAMES[row.channelCode] || row.channelCode}</div>
                          </div>
                        ) : <span style={{ color:'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:12 }}>{row.stateCode || '—'}</td>
                      <td><code style={{ fontSize:10 }}>{row.dimensionKey}</code></td>
                      <td>
                        <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14, color:'var(--text)' }}>{row.cutoffValue}</span>
                        {row.previousValue != null && row.isChanged && (
                          <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:6, textDecoration:'line-through' }}>{row.previousValue}</span>
                        )}
                      </td>
                      <td style={{ fontSize:11 }}>{row.savedBy || '—'}</td>
                      <td style={{ fontSize:11, color:'var(--text-muted)' }}>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}</td>
                      <td>{row.isChanged ? <span className="badge badge-pending" style={{ fontSize:9 }}>CHANGED</span> : <span style={{ fontSize:10, color:'var(--text-muted)' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ── EDITOR VIEW ── */}
      {activeTab === 'editor' && (
        <>
          {showAddGroup && <AddGroupPanel onAdd={handleAddGroup} onClose={()=>setShowAdd(false)}/>}

          {Object.keys(draft).length === 0 && !showAddGroup && (
            <div className="card">
              <div className="empty">
                <div className="empty-icon"><Edit2 size={32}/></div>
                <div style={{ fontWeight:600, marginBottom:6 }}>No cutoff groups in editor</div>
                <div style={{ fontSize:13, marginBottom:14 }}>Add a cutoff group to start editing values</div>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}><Plus size={12}/> Add First Group</button>
              </div>
            </div>
          )}

          {Object.entries(draft).map(([gname, rows]) => {
            const meta   = draftMeta[gname] || {}
            const preset = meta.preset || 'grade,channel,state'
            const dims   = DIM_PRESETS[preset]?.dims || []

            return (
              <div key={gname} className="card" style={{ marginBottom:16 }}>
                <div className="card-header">
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14, color:'var(--accent)' }}>{gname}</span>
                    <span className="badge badge-pending">DRAFT</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{DIM_PRESETS[preset]?.label}</span>
                    {meta.version && <code style={{ fontSize:10 }}>v{meta.version}</code>}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>addRow(gname)}><Plus size={11}/> Add Row</button>
                    <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                      onClick={()=>setDraft(d=>{const n={...d};delete n[gname];return n})}><Trash2 size={11}/></button>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {dims.map(d=><th key={d} style={{ textTransform:'capitalize' }}>{d.replace('Code','').replace('Grade','Grade')}</th>)}
                        <th>Dimension Key</th>
                        <th>Cutoff Value *</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row._id}>
                          {dims.map(d=>(
                            <td key={d} style={{ padding:'6px 10px' }}>
                              <select className="form-control" style={{ padding:'4px 8px', fontSize:12, width:'auto', minWidth:80 }}
                                value={row.dims[d]||''} onChange={e=>updateRow(gname, row._id, d, e.target.value)}>
                                {(DIM_OPTIONS[d]||[]).map(o=><option key={o} value={o}>{o}</option>)}
                              </select>
                            </td>
                          ))}
                          <td style={{ padding:'6px 10px' }}>
                            <code style={{ fontSize:10, color:'var(--accent)', background:'var(--accent-light)', border:'none' }}>
                              {buildDimKey(dims, row)}
                            </code>
                          </td>
                          <td style={{ padding:'6px 10px' }}>
                            <input type="number" className="form-control" style={{ width:100, fontFamily:'var(--mono)', fontSize:13, fontWeight:700 }}
                              value={row.value} onChange={e=>updateRow(gname, row._id, 'value', Number(e.target.value))}/>
                          </td>
                          <td style={{ padding:'6px 10px' }}>
                            <button className="btn btn-ghost btn-sm btn-icon" style={{ color:'var(--danger)' }} onClick={()=>removeRow(gname, row._id)}><Trash2 size={11}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {hasDraft && (
            <div className="alert alert-info" style={{ marginTop:8 }}>
              <Database size={15}/>
              <span>Changes will be saved to both the <strong>cutoff_group_snapshot</strong> table (batch snapshot) and the <strong>embedded_cutoff_entry</strong> table (individual rows for production tracking).</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
