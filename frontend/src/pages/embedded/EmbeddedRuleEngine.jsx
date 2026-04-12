import { useState, useEffect } from 'react'
import { saveEmbeddedRules, validateRules, executeRules, getVariables, translateDescription } from '../../services/api'
import { Play, Upload, CheckCircle, AlertTriangle, Zap, Search, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const SAMPLE_PAYLOAD = {
  rulesByGroup: {
    CREDIT: [
      { ruleId: 'TU_Vantage_Score_Poor', condition: 'tu.vantageScore < 500', result: 'HARD', exceptionHandling: 'MARK_ERROR', tags: ['ELIGIBLE_FOR_JGW'], enabled: true, thirdPartySources: ['tu'], channelOverrides: [] },
      { ruleId: 'TU_Vantage_Score_Good', condition: 'tu.vantageScore >= 650', result: 'PASS', exceptionHandling: 'MARK_ERROR', tags: ['APPROVAL'], enabled: true, thirdPartySources: ['tu'], channelOverrides: [] },
      { ruleId: 'Clarity_Fraud_Score_High', condition: 'clarity.fraudScore > 700', result: 'HARD', exceptionHandling: 'MARK_ERROR', tags: ['FRAUD_CONFIRMED'], enabled: true, thirdPartySources: ['clarity'], channelOverrides: [] },
    ]
  },
  cutoffs: {
    cvScoreCutoff: { 'A,ORG,AK': 800, 'B,ORG,AK': 750, 'A,ONLINE,AK': 850 },
    fraudScoreCutoff: { 'A,ORG,AK': 500, 'B,ORG,AK': 450, 'A,ONLINE,AK': 550 }
  }
}

const SAMPLE_EXECUTE = {
  leadId: 12345,
  availableProviders: ['tu', 'ccr'],
  facts: { 'tu.vantageScore': 680, 'tu.cvScore': 720, 'de.creditGrade': 'A', 'channel': 'ORG', 'contact.state': 'AK', 'de.income': 75000 }
}

export default function EmbeddedRuleEngine() {
  const [tab, setTab] = useState('upload')
  const [payload, setPayload] = useState(JSON.stringify(SAMPLE_PAYLOAD, null, 2))
  const [execPayload, setExecPayload] = useState(JSON.stringify(SAMPLE_EXECUTE, null, 2))
  const [result, setResult] = useState(null)
  const [execResult, setExecResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [variables, setVariables] = useState({})
  const [translateInput, setTranslateInput] = useState({ ruleId: 'AE_PTSMI', description: 'PTSMI rule: IF (repayment amount / customer stated monthly income) > Cutoff then reject' })
  const [translateResult, setTranslateResult] = useState(null)
  const [activeBatchId, setActiveBatchId] = useState(null)

  useEffect(() => {
    getVariables().then(setVariables).catch(() => {})
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      const body = JSON.parse(payload)
      const r = await saveEmbeddedRules(body)
      setResult(r)
      if (r.success) { toast.success(`Saved — batchId: ${r.batchId?.slice(0,8)}…`); setActiveBatchId(r.batchId) }
      else toast.error(`Validation failed: ${r.validationErrors?.[0]}`)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const handleValidate = async () => {
    setLoading(true)
    try {
      const body = JSON.parse(payload)
      const r = await validateRules(body)
      setResult(r)
      if (r.success) toast.success('Validation passed ✓')
      else toast.error(`${r.validationErrors?.length} error(s) found`)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const handleExecute = async () => {
    setLoading(true)
    try {
      const body = JSON.parse(execPayload)
      const r = await executeRules(body)
      setExecResult(r)
      toast.success(`Executed in ${r.executionTimeMs}ms`)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const handleTranslate = async () => {
    try {
      const r = await translateDescription(translateInput.ruleId, translateInput.description)
      setTranslateResult(r)
    } catch (e) { toast.error(e.message) }
  }

  const triStateColor = (s) => ({ TRUE: 'var(--success)', FALSE: 'var(--danger)', UNKNOWN: 'var(--text-muted)' })[s] || 'var(--muted)'
  const statusBg = (s) => ({ FIRED: 'var(--success-dim)', NOT_FIRED: 'var(--danger-dim)', SKIPPED: 'var(--border)' })[s]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Embedded Rule Engine</div>
          <div className="page-subtitle">Upload, validate, and execute rules via REST pipeline — batchId-based cache invalidation</div>
        </div>
        {activeBatchId && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--success-dim)', border:'1px solid rgba(34,197,94,.25)', borderRadius:8, padding:'8px 14px' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success)' }} />
            <div style={{ fontSize:11 }}>
              <div style={{ fontWeight:700, color:'var(--success)' }}>ACTIVE BATCH</div>
              <div style={{ fontFamily:'var(--mono)', color:'var(--text-subtle)' }}>{activeBatchId.slice(0,16)}…</div>
            </div>
          </div>
        )}
      </div>

      {/* Architecture Info Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { icon:'🔌', label:'Rule Upload', sub:'POST /embedded/rules/save', color:'var(--accent)' },
          { icon:'✅', label:'Dry-Run Validate', sub:'POST /embedded/rules/validate', color:'var(--purple)' },
          { icon:'⚡', label:'Rule Execute', sub:'POST /embedded/rules/execute', color:'var(--success)' },
          { icon:'🧠', label:'SpEL Translator', sub:'Description → Expression', color:'var(--warning)' },
        ].map(c => (
          <div key={c.label} style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderTop:`3px solid ${c.color}`, borderRadius:'var(--radius-lg)', padding:'12px 14px' }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{c.icon}</div>
            <div style={{ fontWeight:700, fontSize:13 }}>{c.label}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ marginBottom:16 }}>
        <div className="tabs">
          {['upload','execute','translate','variables'].map(t => (
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t==='upload'?'⬆ Upload Rules':t==='execute'?'⚡ Execute':t==='translate'?'🧠 SpEL Translator':'📦 Variables'}
            </button>
          ))}
        </div>
      </div>

      {/* ── UPLOAD TAB ── */}
      {tab === 'upload' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 420px', gap:16 }}>
          <div>
            <div className="card" style={{ marginBottom:12 }}>
              <div className="card-hdr" style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                Rule Payload (JSON)
                <button className="btn btn-ghost btn-sm" onClick={() => setPayload(JSON.stringify(SAMPLE_PAYLOAD,null,2))}>Load Sample</button>
              </div>
              <div style={{ padding:12 }}>
                <textarea
                  value={payload} onChange={e => setPayload(e.target.value)}
                  style={{ width:'100%', height:380, background:'#0d1117', border:'1px solid var(--border)', borderRadius:6, color:'#93c5fd', fontFamily:'var(--mono)', fontSize:12, padding:14, resize:'vertical', outline:'none' }}
                />
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" onClick={handleValidate} disabled={loading} style={{ flex:1 }}>
                <CheckCircle size={14} /> Validate (Dry Run)
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex:1 }}>
                {loading ? <><div className="spinner" style={{width:14,height:14}}/> Saving…</> : <><Upload size={14}/> Save Rules</>}
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div>
            {result && (
              <div className="card" style={{ marginBottom:12, borderColor: result.success ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
                  {result.success ? '✅ Success' : '❌ Validation Failed'}
                </div>
                <div style={{ padding:14 }}>
                  {result.batchId && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>BATCH ID</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', wordBreak:'break-all' }}>{result.batchId}</div>
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                    <div style={{ background:'var(--bg-card2)', borderRadius:6, padding:'8px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:800 }}>{result.totalRulesSaved}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>RULES SAVED</div>
                    </div>
                    <div style={{ background:'var(--bg-card2)', borderRadius:6, padding:'8px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:800 }}>{result.totalCutoffGroupsSaved}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>CUTOFF GROUPS</div>
                    </div>
                  </div>
                  {result.validationErrors?.length > 0 && (
                    <div style={{ background:'var(--danger-dim)', borderRadius:6, padding:10 }}>
                      {result.validationErrors.map((e,i) => (
                        <div key={i} style={{ fontSize:12, color:'var(--danger)', marginBottom:4 }}>• {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pipeline Steps */}
            <div className="card">
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:12 }}>Save Pipeline</div>
              <div style={{ padding:12 }}>
                {['Input Validation','Rule Syntax Check','Variable Validation','SpEL Compilation','Cutoff Validation','Batch Generation','DB Persistence','Cache Update'].map((step,i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--accent-dim)', border:'1px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>{i+1}</div>
                    <div style={{ fontSize:12 }}>{step}</div>
                    {result?.success && <div style={{ marginLeft:'auto', fontSize:11, color:'var(--success)' }}>✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXECUTE TAB ── */}
      {tab === 'execute' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div className="card" style={{ marginBottom:12 }}>
              <div className="card-hdr" style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13, display:'flex', justifyContent:'space-between' }}>
                Execute Request
                <button className="btn btn-ghost btn-sm" onClick={() => setExecPayload(JSON.stringify(SAMPLE_EXECUTE,null,2))}>Load Sample</button>
              </div>
              <div style={{ padding:12 }}>
                <textarea
                  value={execPayload} onChange={e => setExecPayload(e.target.value)}
                  style={{ width:'100%', height:300, background:'#0d1117', border:'1px solid var(--border)', borderRadius:6, color:'#93c5fd', fontFamily:'var(--mono)', fontSize:12, padding:14, resize:'vertical', outline:'none' }}
                />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={handleExecute} disabled={loading}>
              {loading ? <><div className="spinner" style={{width:14,height:14}}/> Executing…</> : <><Play size={14}/> Execute Rules</>}
            </button>
          </div>

          {/* Execution Results */}
          <div>
            {execResult ? (
              <div className="card">
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>Execution Result</div>
                  <div style={{ display:'flex', gap:8, fontSize:11 }}>
                    <span style={{ color:'var(--success)' }}>⚡ {execResult.executionTimeMs}ms</span>
                    <span className="tag">{execResult.batchId?.slice(0,8)}…</span>
                  </div>
                </div>
                <div style={{ padding:14, maxHeight:460, overflowY:'auto' }}>
                  {execResult.groups?.map(group => (
                    <div key={group.groupName} style={{ marginBottom:14 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                        {group.groupName}
                      </div>
                      {group.rules?.map(rule => (
                        <div key={rule.ruleId} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 10px', background:'var(--bg-card2)', borderRadius:6, marginBottom:4, border:'1px solid var(--border)' }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:triStateColor(rule.triState), flexShrink:0 }} />
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:500 }}>{rule.ruleId}</div>
                            <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap' }}>
                              {rule.tags?.map(t => <span key={t} style={{ fontSize:9, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:3, padding:'1px 5px', color:'var(--muted)' }}>{t}</span>)}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                            <span style={{ fontSize:10, background:statusBg(rule.status), borderRadius:4, padding:'2px 7px', color: rule.status==='FIRED'?'var(--success)':rule.status==='SKIPPED'?'var(--muted)':'var(--danger)' }}>{rule.status}</span>
                            {rule.result && <span style={{ fontSize:10, fontWeight:700, color:'var(--warning)' }}>{rule.result}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ textAlign:'center', color:'var(--muted)' }}>
                  <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>⚡</div>
                  <div>Load rules first, then execute with facts</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SPEL TRANSLATOR TAB ── */}
      {tab === 'translate' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:13 }}>Natural Language → SpEL</div>
              <div style={{ padding:16 }}>
                <div className="form-group" style={{ marginBottom:12 }}>
                  <label className="form-label">Rule ID</label>
                  <input className="form-control" value={translateInput.ruleId} onChange={e => setTranslateInput(x => ({...x, ruleId:e.target.value}))} placeholder="AE_PTSMI" />
                </div>
                <div className="form-group" style={{ marginBottom:12 }}>
                  <label className="form-label">Rule Description (natural language)</label>
                  <textarea className="form-control" rows={5} value={translateInput.description}
                    onChange={e => setTranslateInput(x => ({...x, description:e.target.value}))}
                    placeholder="If Vantage score < Cutoff, reject the lead" />
                </div>
                <button className="btn btn-primary" style={{ width:'100%' }} onClick={handleTranslate}>
                  🧠 Translate to SpEL
                </button>
              </div>
            </div>

            {/* Examples */}
            <div className="card">
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:12 }}>Quick Examples</div>
              {[
                ['AE_INVALID_STATE','Check if customer is from FEB states (List available in UW sheet)'],
                ['AE_PTSMI','PTSMI rule: IF (repayment amount / customer stated monthly income) > Cutoff then reject'],
                ['AE_TUSOFT_VANTAGE_SCORE','If Vantage score < Cutoff, reject the lead'],
                ['AE_LOW_INCOME','if customer stated income <= Cutoff then reject the lead'],
                ['AE_GRADE_F',"If Customer's credit grade is 'F', then reject the customer"],
                ['AE_DEDUPE_DAYS','Dedup: A customer already seen in last 30 days and not offered — reject'],
              ].map(([rid, desc]) => (
                <div key={rid} style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .1s' }}
                  onClick={() => setTranslateInput({ ruleId: rid, description: desc })}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--accent)', marginBottom:2 }}>{rid}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{desc.slice(0,70)}…</div>
                </div>
              ))}
            </div>
          </div>

          {/* Translation Result */}
          <div>
            {translateResult ? (
              <div className="card">
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13, color: translateResult.translated ? 'var(--success)' : 'var(--warning)' }}>
                  {translateResult.translated ? '✅ Auto-translated' : '⚠ Partial — Manual review needed'}
                </div>
                <div style={{ padding:16 }}>
                  <FieldRow label="Rule ID" value={translateResult.ruleId} />
                  <FieldRow label="SpEL Expression" value={translateResult.spelExpression} mono highlight />
                  {translateResult.precondition && <FieldRow label="Precondition" value={translateResult.precondition} mono />}
                  <FieldRow label="Result" value={translateResult.result} />
                  {translateResult.translationNote && <FieldRow label="Note" value={translateResult.translationNote} />}
                  {translateResult.error && <FieldRow label="Error" value={translateResult.error} danger />}

                  {translateResult.translated && (
                    <div style={{ marginTop:16 }}>
                      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Ready to use in rule payload:</div>
                      <div style={{ background:'#0d1117', borderRadius:6, padding:12, fontFamily:'var(--mono)', fontSize:11, color:'#93c5fd' }}>
                        {`{\n  "ruleId": "${translateResult.ruleId}",\n  "condition": "${translateResult.spelExpression?.replace(/"/g,"'")}",\n  "result": "${translateResult.result}"\n}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ textAlign:'center', color:'var(--muted)' }}>
                  <div style={{ fontSize:36, marginBottom:8, opacity:.4 }}>🧠</div>
                  <div>Select an example or enter a rule description to translate</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VARIABLES TAB ── */}
      {tab === 'variables' && (
        <div>
          <div style={{ fontSize:13, color:'var(--muted)', marginBottom:12 }}>
            {Object.keys(variables).length} variables registered across {new Set(Object.values(variables).map(v => v?.source)).size} sources
          </div>
          <div className="card">
            <table>
              <thead>
                <tr><th>Variable</th><th>Data Type</th><th>Source</th></tr>
              </thead>
              <tbody>
                {Object.entries(variables).map(([name, info]) => (
                  <tr key={name}>
                    <td><code style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)' }}>{info?.variableName ?? name}</code></td>
                    <td>
                      <span className={`badge ${info?.dataType==='BOOLEAN'?'badge-active':info?.dataType==='INTEGER'?'badge-pending':'badge-draft'}`} style={{ fontSize:10 }}>
                        {info?.dataType}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--cyan)' }}>{info?.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldRow({ label, value, mono, highlight, danger }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:3 }}>{label}</div>
      <div style={{
        fontSize: mono ? 12 : 13,
        fontFamily: mono ? 'var(--mono)' : undefined,
        color: danger ? 'var(--danger)' : highlight ? 'var(--success)' : 'var(--text)',
        background: highlight ? 'var(--success-dim)' : mono ? 'var(--bg-card2)' : undefined,
        padding: mono ? '8px 10px' : undefined,
        borderRadius: mono ? 6 : undefined,
        wordBreak: 'break-all'
      }}>{value ?? '—'}</div>
    </div>
  )
}
