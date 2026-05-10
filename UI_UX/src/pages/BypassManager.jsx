import { useState, useEffect } from 'react'
import { Upload, Search, Plus, Trash2, Shield, CheckCircle, XCircle, FileText, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getBypassEntries, addBypassEntry, bulkImportBypass,
  lookupBypass, deactivateBypass, reactivateBypass, deleteBypass
} from '../services/api'

// ─── Simple SHA-256 hash using Web Crypto API ────────────────────────────────
async function hashSSN(ssn) {
  const cleaned = ssn.replace(/\D/g, '')
  const encoded = new TextEncoder().encode(cleaned)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

// ─── API-backed state ─────────────────────────────────────────────────────

const BYPASS_STEPS = [
  { id:1, label:'CCI Pull', desc:'Check deceased / SSN invalid', color:'var(--cyan)', pass:'→ Next', fail:'REJECT (deceased / invalid SSN)' },
  { id:2, label:'TU Pull',  desc:'TransUnion data retrieval', color:'var(--accent)', pass:'→ Next', fail:'REJECT (TU no-hit)' },
  { id:3, label:'CCR Pull', desc:'Clear Capital Report', color:'var(--purple)', pass:'→ Next', fail:'REJECT (active military, ineligible)' },
  { id:4, label:'TUCL Rules', desc:'Execute TU-based eligibility rules', color:'var(--warning)', pass:'Generate Offer', fail:'REJECT' },
]

function FlowDiagram({ bypassFlag }) {
  return (
    <div style={{ padding:'16px 0' }}>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:16 }}>
        <div style={{ padding:'8px 16px', borderRadius:8, background: bypassFlag ? 'var(--warning-dim)' : 'var(--bg-card2)',
          border:`2px solid ${bypassFlag?'var(--warning)':'var(--border)'}`, fontWeight:700, fontSize:13,
          color: bypassFlag ? 'var(--warning)' : 'var(--text-muted)' }}>
          SSN in Bypass File?{' '}
          <span style={{ fontFamily:'var(--mono)' }}>{bypassFlag ? 'YES → AE_Skip=1' : 'NO → Normal Flow'}</span>
        </div>
      </div>
      {bypassFlag && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:0 }}>
          {BYPASS_STEPS.map((step, i) => (
            <div key={step.id} style={{ display:'flex', alignItems:'flex-start', gap:0, flex:1 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                <div style={{ padding:'10px 12px', borderRadius:10, background:`${step.color.replace('var(--','').replace(')','') === step.color ? step.color+'15' : 'var(--bg-card2)'}`,
                  border:`2px solid ${step.color}`, textAlign:'center', width:'100%' }}
                  // simpler approach
                >
                  <div style={{ width:28, height:28, borderRadius:'50%', background:step.color, color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13,
                    margin:'0 auto 6px' }}>{step.id}</div>
                  <div style={{ fontWeight:700, fontSize:12, color:step.color }}>{step.label}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{step.desc}</div>
                </div>
                <div style={{ fontSize:10, color:'var(--danger)', marginTop:6, textAlign:'center', lineHeight:1.3 }}>{step.fail}</div>
              </div>
              {i < BYPASS_STEPS.length - 1 && (
                <div style={{ paddingTop:22, color:'var(--success)', fontWeight:700, fontSize:16, padding:'20px 6px 0' }}>→</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BypassManager() {
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [newSSN, setNewSSN] = useState('')
  const [newReason, setNewReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [simulateSSN, setSimulateSSN] = useState('')
  const [simResult, setSimResult] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [activeTab, setActiveTab] = useState('list')
  const [loadingEntries, setLoadingEntries] = useState(true)

  const refresh = () => {
    setLoadingEntries(true)
    getBypassEntries().then(setEntries).catch(()=>setEntries([])).finally(()=>setLoadingEntries(false))
  }
  useEffect(() => { refresh() }, [])

  const addEntry = async () => {
    if (!newSSN.trim()) return
    const cleaned = newSSN.replace(/\D/g,'')
    if (cleaned.length !== 9) { toast.error('SSN must be 9 digits'); return }
    const hash = await hashSSN(cleaned)
    try {
      await addBypassEntry({ ssnHash:hash, ssnMasked:`XXX-XX-${cleaned.slice(-4)}`, addedBy:'lead-analyst', reason:newReason||'Manual entry' })
      setNewSSN(''); setNewReason(''); setAdding(false)
      toast.success('SSN added to bypass list (hashed)')
      refresh()
    } catch(e) { toast.error(e?.response?.data || 'Failed to add entry') }
  }

  const deactivate = async (id) => {
    await deactivateBypass(id).catch(()=>{})
    toast.success('Entry deactivated')
    refresh()
  }
  const reactivate = async (id) => {
    await reactivateBypass(id).catch(()=>{})
    refresh()
  }
  const remove = async (id) => {
    await deleteBypass(id).catch(()=>{})
    toast.success('Entry removed')
    refresh()
  }

  const simulate = async () => {
    const cleaned = simulateSSN.replace(/\D/g,'')
    if (cleaned.length !== 9) { toast.error('Enter a valid 9-digit SSN'); return }
    const hash = await hashSSN(cleaned)
    try {
      const result = await lookupBypass(hash)
      setSimResult({ inBypass: result.inBypass, entry: result.entry || null, hash, masked:`XXX-XX-${cleaned.slice(-4)}` })
    } catch {
      // Fallback: check in-memory entries
      const match = entries.find(e => e.ssnHash===hash && e.isActive)
      setSimResult({ inBypass:!!match, entry:match||null, hash, masked:`XXX-XX-${cleaned.slice(-4)}` })
    }
  }

  const handleCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const lines = ev.target.result.split('\n').map(l=>l.trim()).filter(Boolean)
      const toImport = []
      for (const line of lines) {
        const ssn = line.split(',')[0].replace(/\D/g,'')
        if (ssn.length !== 9) continue
        const hash = await hashSSN(ssn)
        toImport.push({ ssnHash:hash, ssnMasked:`XXX-XX-${ssn.slice(-4)}`, reason:'CSV import' })
      }
      if (toImport.length === 0) { toast.error('No valid SSNs found in CSV'); return }
      try {
        const res = await bulkImportBypass(toImport)
        toast.success(`${res.added} SSNs imported from CSV`)
        refresh()
      } catch { toast.error('Bulk import failed') }
    }
    reader.readAsText(file)
  }

  const filtered = entries.filter(e =>
    e.ssnMasked.includes(search) || e.reason.toLowerCase().includes(search.toLowerCase()) || e.addedBy.includes(search)
  )
  const active = entries.filter(e=>e.isActive).length

  const tabs = ['list','add','simulate','flow']

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Bypass File Manager</div>
          <div className="page-subtitle">Manage bypass SSN list — CCI-first conditional pull path (Spec Rule 7)</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ padding:'6px 12px', borderRadius:8, background:'var(--warning-dim)',
            border:'1px solid rgba(217,119,6,.25)', fontSize:12, fontWeight:700, color:'var(--warning)' }}>
            {active} Active Bypass{active!==1?'es':''}
          </div>
          <label style={{ padding:'8px 14px', borderRadius:8, background:'var(--accent)', color:'#fff',
            cursor:'pointer', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
            <Upload size={13}/> Import CSV
            <input type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleCSV}/>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Entries', val:entries.length, color:'var(--accent)', icon:Hash },
          { label:'Active Bypasses', val:active, color:'var(--warning)', icon:Shield },
          { label:'Deactivated', val:entries.filter(e=>!e.isActive).length, color:'var(--text-muted)', icon:XCircle },
          { label:'Recently Added', val:entries.filter(e=>new Date()-new Date(e.addedAt)<86400000*7).length, color:'var(--success)', icon:CheckCircle },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ padding:'14px 16px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Icon size={14} color={s.color}/>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[{k:'list',l:'Bypass List'},{k:'add',l:'Add Entry'},{k:'simulate',l:'Simulate Lookup'},{k:'flow',l:'Decision Flow'}].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)} style={{
            padding:'8px 16px', borderRadius:'8px 8px 0 0', border:'1px solid',
            borderColor: activeTab===t.k ? 'var(--border)' : 'transparent',
            borderBottom: activeTab===t.k ? '1px solid var(--bg-card)' : '1px solid transparent',
            background: activeTab===t.k ? 'var(--bg-card)' : 'transparent',
            color: activeTab===t.k ? 'var(--text)' : 'var(--text-muted)',
            cursor:'pointer', fontWeight:600, fontSize:12, marginBottom:-1,
          }}>{t.l}</button>
        ))}
      </div>

      {/* Bypass List */}
      {activeTab === 'list' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight:700, fontSize:13 }}>Bypass Entries</span>
            <div style={{ position:'relative' }}>
              <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{
                padding:'6px 10px 6px 28px', borderRadius:7, border:'1px solid var(--border)',
                background:'var(--bg-card2)', fontSize:12, outline:'none', width:200,
              }}/>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
              <Shield size={32} style={{ margin:'0 auto 12px', opacity:.3 }}/>
              <div style={{ fontWeight:600 }}>No bypass entries yet</div>
              <div style={{ fontSize:12, marginTop:6 }}>Add individual SSNs or import a CSV file</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--bg-card2)' }}>
                  {['SSN (masked)','Hash (SHA-256)','Added By','Date Added','Reason','Status','Actions'].map(h=>(
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontWeight:700, fontSize:10,
                      color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} style={{ borderBottom:'1px solid var(--border)', opacity:e.isActive?1:.5 }}>
                    <td style={{ padding:'9px 14px', fontFamily:'var(--mono)', fontWeight:700 }}>{e.ssnMasked}</td>
                    <td style={{ padding:'9px 14px', fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)' }}>{e.ssnHash.slice(0,16)}…</td>
                    <td style={{ padding:'9px 14px' }}>{e.addedBy}</td>
                    <td style={{ padding:'9px 14px', color:'var(--text-muted)' }}>{new Date(e.addedAt).toLocaleDateString()}</td>
                    <td style={{ padding:'9px 14px', color:'var(--text-muted)' }}>{e.reason}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                        background:e.isActive?'var(--success-dim)':'var(--danger-dim)',
                        color:e.isActive?'var(--success)':'var(--danger)' }}>
                        {e.isActive?'ACTIVE':'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {e.isActive ? (
                          <button onClick={()=>deactivate(e.id)} style={{ padding:'4px 8px', borderRadius:5, border:'1px solid var(--border)',
                            background:'var(--bg-card2)', cursor:'pointer', fontSize:10, color:'var(--warning)', fontWeight:600 }}>Deactivate</button>
                        ) : (
                          <button onClick={()=>reactivate(e.id)} style={{ padding:'4px 8px', borderRadius:5, border:'1px solid var(--border)',
                            background:'var(--bg-card2)', cursor:'pointer', fontSize:10, color:'var(--success)', fontWeight:600 }}>Reactivate</button>
                        )}
                        <button onClick={()=>remove(e.id)} style={{ padding:'4px 8px', borderRadius:5, border:'none',
                          background:'var(--danger-dim)', cursor:'pointer', fontSize:10, color:'var(--danger)' }}>
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Entry */}
      {activeTab === 'add' && (
        <div className="card" style={{ maxWidth:480 }}>
          <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Add Bypass Entry</span></div>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--warning-dim)', border:'1px solid rgba(217,119,6,.25)', fontSize:12, color:'var(--warning)' }}>
              <strong>Security Notice:</strong> SSNs are immediately hashed with SHA-256. The raw SSN is never stored. Only the last 4 digits are retained for display.
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>SSN (9 digits, no dashes)</label>
              <input value={newSSN} onChange={e=>setNewSSN(e.target.value)} placeholder="123456789" maxLength={11}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, outline:'none', fontFamily:'var(--mono)' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Reason</label>
              <input value={newReason} onChange={e=>setNewReason(e.target.value)} placeholder="e.g. Compliance exception, manual review"
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, outline:'none' }}/>
            </div>
            <button onClick={addEntry} style={{ padding:'11px', borderRadius:8, background:'var(--accent)', color:'#fff',
              border:'none', cursor:'pointer', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Plus size={14}/> Add to Bypass List
            </button>
          </div>
        </div>
      )}

      {/* Simulate */}
      {activeTab === 'simulate' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Simulate Bypass Lookup</span></div>
            <div style={{ padding:20 }}>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
                Enter an SSN to check if it's in the active bypass list. The SSN is hashed and compared — it is never logged.
              </div>
              <input value={simulateSSN} onChange={e=>setSimulateSSN(e.target.value)} placeholder="Enter SSN (9 digits)"
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, outline:'none', fontFamily:'var(--mono)', marginBottom:12 }}/>
              <button onClick={simulate} style={{ width:'100%', padding:'10px', borderRadius:8, background:'var(--accent)', color:'#fff',
                border:'none', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                Check Bypass
              </button>
            </div>
          </div>
          {simResult && (
            <div className="card">
              <div className="card-header">
                <span style={{ fontWeight:700, fontSize:13 }}>Lookup Result</span>
                {simResult.inBypass ? <CheckCircle size={16} color="var(--warning)"/> : <XCircle size={16} color="var(--success)"/>}
              </div>
              <div style={{ padding:20 }}>
                <div style={{ padding:'16px', borderRadius:10,
                  background:simResult.inBypass?'var(--warning-dim)':'var(--success-dim)',
                  border:`2px solid ${simResult.inBypass?'rgba(217,119,6,.3)':'rgba(5,150,105,.3)'}`,
                  textAlign:'center', marginBottom:14 }}>
                  <div style={{ fontSize:28, fontWeight:800, color:simResult.inBypass?'var(--warning)':'var(--success)' }}>
                    {simResult.inBypass ? '⚠ IN BYPASS' : '✓ NOT IN BYPASS'}
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>
                    {simResult.masked} · Hash: {simResult.hash.slice(0,16)}…
                  </div>
                </div>
                {simResult.inBypass && simResult.entry && (
                  <div style={{ fontSize:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        { l:'Added By', v:simResult.entry.addedBy },
                        { l:'Added On', v:new Date(simResult.entry.addedAt).toLocaleDateString() },
                        { l:'Reason', v:simResult.entry.reason },
                        { l:'Status', v:'ACTIVE' },
                      ].map(r=>(
                        <div key={r.l} style={{ padding:'8px 10px', borderRadius:7, background:'var(--bg-card2)', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>{r.l}</div>
                          <div style={{ fontWeight:600 }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:12, padding:'10px 12px', borderRadius:8, background:'rgba(217,119,6,.08)', border:'1px solid rgba(217,119,6,.2)', fontSize:12, color:'var(--warning)' }}>
                      <strong>Action:</strong> This customer will follow the Bypass path: CCI → TU → CCR → TUCL rules → Offer/Reject
                    </div>
                  </div>
                )}
                {!simResult.inBypass && (
                  <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--success-dim)', border:'1px solid rgba(5,150,105,.2)', fontSize:12, color:'var(--success)' }}>
                    <strong>Action:</strong> Customer follows normal AE processing path — bypass flow not triggered.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decision Flow */}
      {activeTab === 'flow' && (
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight:700, fontSize:13 }}>Bypass Decision Path (Spec Rule 7)</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setSimResult(s=>({...s,inBypass:true}))} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--warning)', background:'var(--warning-dim)', color:'var(--warning)', cursor:'pointer', fontSize:11, fontWeight:700 }}>Toggle: In Bypass</button>
            </div>
          </div>
          <div style={{ padding:'16px 20px' }}>
            <FlowDiagram bypassFlag={true}/>
            <div style={{ marginTop:20, padding:'12px 16px', borderRadius:8, background:'var(--accent-dim)', border:'1px solid rgba(37,99,235,.2)', fontSize:12 }}>
              <strong style={{ color:'var(--accent)' }}>Spec Reference — Rule 7:</strong>&nbsp;
              If SSN is in Bypass File: set AE_Skip=1, pull CCI → if deceased/invalid SSN reject → pull TU → if no-hit reject → pull CCR → if active military + ineligible for sub-36 loan reject → execute TUCL rules → if eligible generate offer → else reject.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
