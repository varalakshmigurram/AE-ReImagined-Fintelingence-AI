import { useState, useCallback } from 'react'
import { FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw, Filter, Database, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1/uw-ingestion', timeout: 30000 })
const parseExcel   = (file)           => { const fd = new FormData(); fd.append('file', file); return api.post('/parse', fd, { headers:{'Content-Type':'multipart/form-data'} }).then(r=>r.data) }
const acceptChange = (sid,idx,ver)    => api.post(`/${sid}/accept/${idx}`,{},{ params:{ targetVersion:ver, appliedBy:'lead-analyst' }}).then(r=>r.data)
const rejectChange = (sid,idx)        => api.post(`/${sid}/reject/${idx}`,{}).then(r=>r.data)
const acceptAll    = (sid,sev,ver)    => api.post(`/${sid}/accept-all`,{},{ params:{ severity:sev||null, targetVersion:ver, appliedBy:'lead-analyst' }}).then(r=>r.data)

const TYPE_META = {
  CUTOFF_CHANGE:     { icon:'⚙', color:'#D97706', bg:'#FFFBEB', label:'Cutoff Change' },
  OPERATOR_CHANGE:   { icon:'≈', color:'#DC2626', bg:'#FEF2F2', label:'Operator Change' },
  FIELD_RENAME:      { icon:'✏', color:'#2563EB', bg:'#EFF6FF', label:'Field Rename' },
  ADD_RULE:          { icon:'+', color:'#059669', bg:'#ECFDF5', label:'Add Rule' },
  REMOVE_RULE:       { icon:'−', color:'#DC2626', bg:'#FEF2F2', label:'Remove Rule' },
  TAG_MODIFY:        { icon:'#', color:'#7C3AED', bg:'#F5F3FF', label:'Tag Modify' },
  CHANNEL_EXTENSION: { icon:'⊞', color:'#0891B2', bg:'#ECFEFF', label:'Channel Override' },
  CONDITION_REWRITE: { icon:'≠', color:'#D97706', bg:'#FFFBEB', label:'Condition Rewrite' },
  SEGMENT_CHANGE:    { icon:'⊕', color:'#64748B', bg:'#F8FAFC', label:'Segment Change' },
}
const SEV_META = {
  HIGH:   { cls:'badge-rejected', color:'#DC2626' },
  MEDIUM: { cls:'badge-pending',  color:'#D97706' },
  LOW:    { cls:'badge-draft',    color:'#64748B' },
}

/* ── Config Cross-Check Panel ──────────────────────────────────────── */
function CrossCheckPanel({ engineState, yellowRows }) {
  if (!engineState) return null

  const configIds    = engineState.configTableRuleIds  || []
  const statusMap    = engineState.configTableStatuses || {}
  const configCount  = engineState.configTableRuleCount || 0
  const uniqueYellow = [...new Set((yellowRows||[]).map(r=>r.ruleId).filter(Boolean))]
  const checks       = uniqueYellow.map(id => ({ id, found: configIds.includes(id), status: statusMap[id]||null }))
  const missing      = checks.filter(c=>!c.found)
  const found        = checks.filter(c=>c.found)

  return (
    <div className="card" style={{ marginBottom:16, borderLeft:`3px solid ${missing.length>0?'#DC2626':'#059669'}` }}>
      <div className="card-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Database size={15} color={missing.length>0?'#DC2626':'#059669'}/>
          <span style={{ fontWeight:700, fontSize:14 }}>Rules Config Tab Cross-Check</span>
          {missing.length>0
            ? <span className="badge badge-rejected" style={{fontSize:10}}>{missing.length} NOT IN CONFIG TAB</span>
            : <span className="badge badge-approved" style={{fontSize:10}}>ALL RULES FOUND IN CONFIG</span>}
        </div>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>ae_rules table: {configCount} rules total</span>
      </div>

      <div style={{ padding:'14px 18px' }}>
        {missing.length>0 && (
          <div className="alert alert-warning" style={{ marginBottom:14 }}>
            <AlertTriangle size={14}/>
            <div>
              <div style={{ fontWeight:600, marginBottom:3 }}>
                {missing.length} highlighted rule{missing.length>1?'s':''} not found in the Rules Config tab (ae_rules table)
              </div>
              <div style={{ fontSize:12, lineHeight:1.5 }}>
                These rules are yellow in the UW spec but have no entry in the Rules Config tab.
                Create them first via <strong>Rules → New Rule</strong> or save via <strong>Rule Builder</strong> (auto-mirrors).
                Then re-run ingestion so change suggestions can be applied correctly.
              </div>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:8, marginBottom:missing.length>0?12:0 }}>
          {checks.map(c=>(
            <div key={c.id} style={{
              display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
              borderRadius:'var(--radius)',
              background: c.found?'#ECFDF5':'#FEF2F2',
              border:`1px solid ${c.found?'rgba(5,150,105,.2)':'rgba(220,38,38,.2)'}`,
            }}>
              {c.found ? <CheckCircle size={14} color="#059669" style={{flexShrink:0}}/> : <XCircle size={14} color="#DC2626" style={{flexShrink:0}}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: c.found?'#065F46':'#991B1B' }}>
                  {c.id}
                </div>
                <div style={{ fontSize:10, marginTop:1, color: c.found?'#059669':'#DC2626' }}>
                  {c.found ? `In config — ${c.status?.replace(/_/g,' ')||'UNKNOWN'}` : 'Not in Rules Config tab'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {engineState.totalActiveRules > 0 && (
          <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 }}>
            <Info size={11}/>
            Engine has {engineState.totalActiveRules} rules active in {engineState.groupCount} group{engineState.groupCount!==1?'s':''}
            {engineState.activeBatchId && <> · batchId <code style={{fontSize:9}}>{engineState.activeBatchId?.slice(0,12)}…</code></>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Suggestion Card ────────────────────────────────────────────────── */
function SuggestionCard({ s, onAccept, onReject }) {
  const [exp, setExp] = useState(false)
  const tm = TYPE_META[s.type] || { icon:'?', color:'#64748B', bg:'#F8FAFC', label:s.type }
  const sm = SEV_META[s.severity] || SEV_META.LOW

  if (s.accepted) return (
    <div style={{ padding:'8px 14px', background:'#ECFDF5', border:'1px solid rgba(5,150,105,.2)', borderRadius:'var(--radius)', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
      <CheckCircle size={13} color="#059669"/>
      <code style={{ fontSize:11, fontWeight:700, color:'#059669' }}>{s.ruleId}</code>
      <span style={{ fontSize:11, color:'var(--text-muted)' }}>— {s.title}</span>
      <span style={{ marginLeft:'auto', fontSize:10, color:'#059669', fontWeight:700 }}>APPLIED ✓</span>
    </div>
  )
  if (s.rejected) return (
    <div style={{ padding:'8px 14px', background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', marginBottom:6, opacity:.5 }}>
      <span style={{ fontSize:11, color:'var(--text-muted)' }}>✗ {s.ruleId} — {s.title} (dismissed)</span>
    </div>
  )

  return (
    <div className="card" style={{ marginBottom:10, borderLeft:`3px solid ${sm.color}` }}>
      <div style={{ padding:'12px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ width:36, height:36, borderRadius:8, background:tm.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, fontWeight:700 }}>{tm.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
            {/* Rule ID highlighted */}
            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'#2563EB', background:'#EFF6FF', padding:'2px 8px', borderRadius:4, border:'1px solid rgba(37,99,235,.15)' }}>{s.ruleId}</span>
            {s.subRule && <span style={{ fontSize:10, color:'var(--text-muted)' }}>[{s.subRule}]</span>}
            <span style={{ fontSize:10, padding:'1px 7px', borderRadius:4, background:tm.bg, color:tm.color, fontWeight:600 }}>{tm.label}</span>
            <span className={`badge ${sm.cls}`} style={{ fontSize:10 }}>{s.severity}</span>
            <span style={{ fontSize:10, color:'var(--text-muted)' }}>Row {s.excelRow} · {s.section}</span>
          </div>
          <div style={{ fontWeight:600, fontSize:13, marginBottom:3 }}>{s.title}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{s.description}</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0, alignItems:'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setExp(e=>!e)}>
            {exp ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} {exp?'Less':'Details'}
          </button>
          <button className="btn btn-success btn-sm" onClick={onAccept}>✓ Apply</button>
          <button className="btn btn-ghost btn-sm btn-icon" style={{color:'var(--text-muted)'}} onClick={onReject}><XCircle size={12}/></button>
        </div>
      </div>

      {exp && (
        <div style={{ padding:'0 16px 14px', paddingLeft:64 }}>
          {(s.currentEngineValue||s.excelValue) && (
            <div style={{ border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', marginBottom:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr', background:'var(--bg-card2)', borderBottom:'1px solid var(--border)' }}>
                {['Field','Current Engine','UW Spec (Excel)'].map((h,i)=>(
                  <div key={h} style={{ padding:'6px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:i===1?'#991B1B':i===2?'#166534':'var(--text-muted)', background:i===1?'rgba(220,38,38,.04)':i===2?'rgba(5,150,105,.04)':undefined }}>{h}</div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr' }}>
                <div style={{ padding:'8px 10px', fontSize:12, fontWeight:500, background:'var(--bg-card2)' }}>{tm.label}</div>
                <div style={{ padding:'8px 10px', background:'rgba(220,38,38,.04)', color:'#991B1B', fontFamily:'var(--mono)', fontSize:12, textDecoration:s.currentEngineValue?'line-through':'none', opacity:.8 }}>
                  {s.currentEngineValue || <em style={{color:'var(--text-muted)'}}>not in engine</em>}
                </div>
                <div style={{ padding:'8px 10px', background:'rgba(5,150,105,.04)', color:'#166534', fontFamily:'var(--mono)', fontSize:12, fontWeight:600 }}>{s.excelValue||'—'}</div>
              </div>
              {s.excelCutoff && (
                <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr', borderTop:'1px solid var(--border)' }}>
                  <div style={{ padding:'6px 10px', fontSize:11, color:'var(--text-muted)', background:'var(--bg-card2)', fontWeight:500 }}>Excel Cutoff</div>
                  <div style={{ padding:'6px 10px', color:'var(--text-muted)', fontSize:11 }}>—</div>
                  <div style={{ padding:'6px 10px', color:'#D97706', fontFamily:'var(--mono)', fontSize:11, fontWeight:600 }}>{s.excelCutoff}</div>
                </div>
              )}
            </div>
          )}
          {s.payload && (
            <details>
              <summary style={{ cursor:'pointer', fontSize:11, color:'var(--text-muted)', userSelect:'none' }}>View generated payload →</summary>
              <pre style={{ fontSize:10, fontFamily:'var(--mono)', background:'#F8FAFC', border:'1px solid var(--border)', color:'#1E40AF', padding:10, borderRadius:6, overflow:'auto', maxHeight:150, marginTop:6 }}>
                {JSON.stringify(s.payload,null,2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function UWIngestion() {
  const [dragging,setDragging]     = useState(false)
  const [loading,setLoading]       = useState(false)
  const [result,setResult]         = useState(null)
  const [sessionId,setSessionId]   = useState(null)
  const [suggestions,setSuggestions]= useState([])
  const [filterSev,setFilterSev]   = useState('ALL')
  const [filterType,setFilterType] = useState('ALL')
  const [view,setView]             = useState('crosscheck')
  const [version,setVersion]       = useState('1.1.0')

  const handleFile = async (file) => {
    if (!file?.name.match(/\.xlsx?$/i)) { toast.error('Please upload an Excel (.xlsx) file'); return }
    setLoading(true); setResult(null); setSuggestions([])
    try {
      const r = await parseExcel(file)
      setResult(r); setSessionId(r.summary.sessionId); setSuggestions(r.suggestions||[])
      const hasMissing = (r.summary.engineState?.configTableRuleIds?.length||0) < (r.summary.yellowRows||0)
      setView(hasMissing ? 'crosscheck' : 'suggestions')
      toast.success(`Parsed — ${r.summary.totalSuggestions} suggestions · ${r.summary.yellowRows} yellow rows`)
    } catch(e) { toast.error('Parse failed: '+(e.response?.data?.message||e.message)) }
    finally { setLoading(false) }
  }

  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }, [])

  const accept = async (idx) => {
    try { await acceptChange(sessionId,idx,version); setSuggestions(s=>s.map((sg,i)=>i===idx?{...sg,accepted:true}:sg)); toast.success('Applied ✓') }
    catch(e) { toast.error(e.response?.data?.error||e.message) }
  }
  const reject = async (idx) => {
    try { await rejectChange(sessionId,idx); setSuggestions(s=>s.map((sg,i)=>i===idx?{...sg,rejected:true}:sg)) }
    catch(e) { toast.error(e.message) }
  }
  const applyAll = async (sev) => {
    try {
      const r = await acceptAll(sessionId, sev==='ALL'?null:sev, version)
      setSuggestions(s=>s.map(sg=>(sev==='ALL'||sg.severity===sev)?{...sg,accepted:true}:sg))
      toast.success(`${r.totalAccepted} changes applied`)
    } catch(e) { toast.error(e.message) }
  }

  const filtered     = suggestions.filter(s=>(filterSev==='ALL'||s.severity===filterSev)&&(filterType==='ALL'||s.type===filterType))
  const highCount    = suggestions.filter(s=>s.severity==='HIGH').length
  const pending      = suggestions.filter(s=>!s.accepted&&!s.rejected).length
  const applied      = suggestions.filter(s=>s.accepted).length
  const engineState  = result?.summary?.engineState
  const configIds    = engineState?.configTableRuleIds||[]
  const yellowRuleIds= [...new Set((result?.yellowRows||[]).map(r=>r.ruleId).filter(Boolean))]
  const missingCount = yellowRuleIds.filter(id=>!configIds.includes(id)).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">UW Excel → Config Ingestion</div>
          <div className="page-subtitle">
            Upload the UW Analytics spec — yellow cells are cross-checked against the Rules Config tab (ae_rules) and engine config, then AI generates typed change suggestions
          </div>
        </div>
      </div>

      {/* Pipeline steps */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:20 }}>
        {[
          {n:'1',icon:'📊',label:'Upload Excel',    desc:'UW Analytics spec sheet',     c:'#2563EB'},
          {n:'2',icon:'🟡',label:'Detect Yellow',   desc:'Changed rules highlighted',   c:'#D97706'},
          {n:'3',icon:'🔍',label:'Config Cross-Check',desc:'vs ae_rules + engine',      c:'#7C3AED'},
          {n:'4',icon:'🤖',label:'AI Suggestions',  desc:'Cutoff, operator, rename…',   c:'#059669'},
          {n:'5',icon:'✅',label:'Apply / Dismiss',  desc:'One-click per suggestion',   c:'#0891B2'},
        ].map(s=>(
          <div key={s.n} className="card" style={{padding:'12px 14px',borderTop:`3px solid ${s.c}`}}>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:5}}>
              <div style={{width:20,height:20,borderRadius:'50%',background:`${s.c}15`,border:`1.5px solid ${s.c}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:s.c}}>{s.n}</div>
              <span style={{fontSize:18}}>{s.icon}</span>
            </div>
            <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{s.label}</div>
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.4}}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={()=>document.getElementById('uw-input').click()}
          style={{
            border:`2px dashed ${dragging?'var(--accent)':'var(--border-strong)'}`,
            borderRadius:'var(--radius-xl)', padding:'52px 24px', textAlign:'center',
            background:dragging?'var(--accent-light)':'var(--bg-card)', cursor:'pointer', transition:'all .15s',
          }}>
          <input id="uw-input" type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          {loading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,color:'var(--text-muted)'}}>
              <div className="spinner"/> Parsing — detecting yellow cells and cross-checking Rules Config tab…
            </div>
          ) : (
            <>
              <FileSpreadsheet size={42} color="var(--text-muted)" style={{marginBottom:14,opacity:.45}}/>
              <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Drop AE_Sample_Spec.xlsx here</div>
              <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:18}}>
                Yellow rows cross-checked against the <strong>ae_rules</strong> config table and embedded rule engine
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                {['🟡 Yellow = UW Changes','🔴 Red = Warnings','⬛ Dark-red = Disabled','✅ Cross-checks vs Rules tab'].map(l=>(
                  <span key={l} style={{fontSize:11,background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:20,padding:'3px 12px'}}>{l}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8,marginBottom:16}}>
            {[
              {v:result.summary.totalRulesParsed, l:'Rules Parsed',     c:'#2563EB'},
              {v:result.summary.yellowRows,        l:'Yellow Rows',      c:'#D97706'},
              {v:engineState?.configTableRuleCount||0, l:'In Rules Tab', c:'#7C3AED'},
              {v:missingCount,                     l:'Missing from Tab', c:missingCount>0?'#DC2626':'#059669'},
              {v:highCount,                        l:'High Priority',    c:'#DC2626'},
              {v:applied,                          l:'Applied',          c:'#059669'},
              {v:pending,                          l:'Pending',          c:'#D97706'},
            ].map(s=>(
              <div key={s.l} className="stat-card" style={{borderTop:`3px solid ${s.c}`,padding:12}}>
                <div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:4,textTransform:'uppercase',letterSpacing:'.05em',fontWeight:600,lineHeight:1.3}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
            <div className="tabs">
              <button className={`tab ${view==='crosscheck'?'active':''}`} onClick={()=>setView('crosscheck')}>
                🔍 Config Cross-Check
                {missingCount>0 && <span style={{marginLeft:5,background:'#DC2626',color:'#fff',borderRadius:10,padding:'1px 5px',fontSize:9,fontWeight:700}}>{missingCount}</span>}
              </button>
              <button className={`tab ${view==='suggestions'?'active':''}`} onClick={()=>setView('suggestions')}>
                🤖 Suggestions ({suggestions.length})
              </button>
              <button className={`tab ${view==='yellow'?'active':''}`} onClick={()=>setView('yellow')}>
                🟡 Yellow Rows ({result.yellowRows?.length||0})
              </button>
            </div>
            <div style={{flex:1}}/>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
              <span style={{color:'var(--text-muted)'}}>Apply as version</span>
              <input className="form-control" value={version} onChange={e=>setVersion(e.target.value)}
                style={{width:90,fontFamily:'var(--mono)',fontSize:12,padding:'4px 8px'}}/>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>applyAll('HIGH')} disabled={highCount===0}>⚡ Apply HIGH ({highCount})</button>
            <button className="btn btn-primary btn-sm" onClick={()=>applyAll('ALL')} disabled={pending===0}>✓ Apply All ({pending})</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setResult(null);setSuggestions([])}}><RefreshCw size={12}/> New Upload</button>
          </div>

          {/* Cross-Check View */}
          {view==='crosscheck' && <CrossCheckPanel engineState={engineState} yellowRows={result.yellowRows}/>}

          {/* Suggestions View */}
          {view==='suggestions' && (
            <>
              <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
                <Filter size={13} color="var(--text-muted)"/>
                <div className="tabs">
                  {['ALL','HIGH','MEDIUM','LOW'].map(s=>(
                    <button key={s} className={`tab ${filterSev===s?'active':''}`} onClick={()=>setFilterSev(s)} style={{fontSize:11}}>
                      {s}{s!=='ALL'&&` (${suggestions.filter(sg=>sg.severity===s).length})`}
                    </button>
                  ))}
                </div>
                <div className="tabs">
                  {['ALL',...Object.keys(TYPE_META)].map(t=>(
                    <button key={t} className={`tab ${filterType===t?'active':''}`} onClick={()=>setFilterType(t)} style={{fontSize:10}}>
                      {t==='ALL'?'All Types':TYPE_META[t]?.label}
                    </button>
                  ))}
                </div>
              </div>
              {filtered.length===0
                ? <div className="card"><div className="empty"><CheckCircle size={26} color="var(--success)" style={{marginBottom:8}}/><div>No suggestions match the current filter</div></div></div>
                : filtered.map(s=><SuggestionCard key={s.index} s={s} onAccept={()=>accept(s.index)} onReject={()=>reject(s.index)}/>)
              }
            </>
          )}

          {/* Yellow Rows View */}
          {view==='yellow' && (
            <div className="card">
              <div className="card-header">
                <span style={{fontWeight:600,fontSize:13}}>Yellow Highlighted Rows ({result.yellowRows?.length}) — UW Team Annotations</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Row</th><th>Rule ID</th><th>Sub</th><th>In Rules Tab?</th><th>Section</th><th>Description</th><th>Segment</th><th>Cutoff</th><th>Cols</th></tr>
                  </thead>
                  <tbody>
                    {(result.yellowRows||[]).map((row,i)=>{
                      const inCfg = configIds.includes(row.ruleId)
                      return (
                        <tr key={i}>
                          <td style={{fontFamily:'var(--mono)',fontSize:11}}>{row.excelRow}</td>
                          <td>
                            <span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:11,color:'#2563EB',background:'#EFF6FF',padding:'2px 7px',borderRadius:4}}>{row.ruleId}</span>
                          </td>
                          <td><span className="tag">{row.subRule}</span></td>
                          <td>
                            {inCfg
                              ? <span className="badge badge-approved" style={{fontSize:9}}>✓ Found</span>
                              : <span className="badge badge-rejected" style={{fontSize:9}}>✗ Missing</span>}
                          </td>
                          <td style={{fontSize:11,color:'var(--text-muted)'}}>{row.section}</td>
                          <td style={{fontSize:11,maxWidth:200}}>{row.description?.slice(0,65)}{row.description?.length>65?'…':''}</td>
                          <td style={{fontSize:11}}>{row.segment}</td>
                          <td><code style={{fontSize:10,color:'#D97706'}}>{row.cutoff}</code></td>
                          <td>
                            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                              {(row.highlightedColumns||[]).map(c=>(
                                <span key={c} style={{fontSize:9,background:'#FFFBEB',border:'1px solid rgba(217,119,6,.3)',color:'#D97706',borderRadius:3,padding:'1px 5px',fontFamily:'var(--mono)'}}>{c}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
