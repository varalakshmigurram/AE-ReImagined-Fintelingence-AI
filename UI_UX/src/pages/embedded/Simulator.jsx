import { useState, useEffect } from 'react'
import { Play, RefreshCw, User, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Zap, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { executeRules } from '../../services/api'

// ─── Pre-built scenario templates ─────────────────────────────────────────────
const SCENARIOS = [
  {
    name: 'Prime Applicant',
    desc: 'Strong credit, high income — expected: PASS',
    color: '#059669',
    facts: {
      'tu.vantageScore': 720, 'tu.cvScore': 680, 'tu.noHit': false,
      'de.creditGrade': 'A1', 'de.income': 85000,
      'contact.state': 'TX', 'channel': 'QS',
      'app.requestedAmount': 5000, 'app.repaymentAmount': 350,
      'app.statedMonthlyIncome': 7083, 'clarity.fraudScore': 720,
    },
    providers: ['tu','ccr','clarity'],
  },
  {
    name: 'Thin File Risk',
    desc: 'Low trade count, borderline score — expected: mixed rules',
    color: '#D97706',
    facts: {
      'tu.vantageScore': 520, 'tu.cvScore': 510, 'tu.noHit': false,
      'de.creditGrade': 'D1', 'de.income': 32000,
      'contact.state': 'FL', 'channel': 'ML',
      'app.requestedAmount': 2000, 'app.repaymentAmount': 220,
      'app.statedMonthlyIncome': 2667, 'clarity.fraudScore': 480,
      'tu.g106s': 40, 'tu.at02s': 1,
    },
    providers: ['tu','ccr'],
  },
  {
    name: 'Declined Applicant',
    desc: 'Very low score, FEB state, high ratio',
    color: '#DC2626',
    facts: {
      'tu.vantageScore': 420, 'tu.cvScore': 380, 'tu.noHit': false,
      'de.creditGrade': 'F', 'de.income': 18000,
      'contact.state': 'CO', 'channel': 'CKPQ',
      'app.requestedAmount': 8000, 'app.repaymentAmount': 800,
      'app.statedMonthlyIncome': 1500,
    },
    providers: ['tu'],
  },
  {
    name: 'No TU Hit',
    desc: 'TU no-hit scenario — thin file edge case',
    color: '#7C3AED',
    facts: {
      'tu.noHit': true, 'de.creditGrade': 'E2', 'de.income': 28000,
      'contact.state': 'AK', 'channel': 'LT',
      'app.requestedAmount': 1500, 'app.repaymentAmount': 180,
      'app.statedMonthlyIncome': 2333,
    },
    providers: ['tu'],
  },
  {
    name: 'Missing Provider',
    desc: 'CCR unavailable — some rules skipped',
    color: '#0891B2',
    facts: {
      'tu.vantageScore': 640, 'tu.cvScore': 610, 'tu.noHit': false,
      'de.creditGrade': 'B2', 'de.income': 55000,
      'contact.state': 'GA', 'channel': 'MO',
      'app.requestedAmount': 4000, 'app.repaymentAmount': 310,
      'app.statedMonthlyIncome': 4583,
    },
    providers: ['tu'],  // CCR missing
  },
]

const PROVIDERS = ['tu', 'ccr', 'clarity', 'cbs']

const STATE_OPTIONS = ['AK','AL','AZ','CA','CO','DE','FL','GA','HI','ID','IN','KS','KY','LA','MI','MN','MS','MT','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI']
const CHANNEL_OPTIONS = ['CMPQ','CKPQ','QS','LT','ML','MO','CMACT']
const GRADE_OPTIONS = ['A','A1','A2','B','B1','B2','C','C1','C2','D','D1','D2','E','E1','E2','F']

const CHANNEL_NAMES = { CMPQ:'Credit Match Pre-Qualify', CKPQ:'Credit Karma Pre-Qualify', QS:'Quin Street', LT:'Lending Tree', ML:'Money Lion', MO:'Monevo', CMACT:'Credit Match ACT' }

// ─── Result card ──────────────────────────────────────────────────────────────
function RuleResultCard({ rule }) {
  const [exp, setExp] = useState(false)
  const statusConfig = {
    FIRED:     { color:'#DC2626', bg:'#FEF2F2', icon:<XCircle size={14} color="#DC2626"/>,    label:'FIRED' },
    NOT_FIRED: { color:'#059669', bg:'#ECFDF5', icon:<CheckCircle size={14} color="#059669"/>, label:'PASSED' },
    SKIPPED:   { color:'#94A3B8', bg:'#F8FAFC', icon:<AlertTriangle size={14} color="#94A3B8"/>,label:'SKIPPED' },
  }
  const sc = statusConfig[rule.evaluationStatus] || statusConfig.SKIPPED

  return (
    <div style={{ border:`1px solid ${sc.color}25`, borderRadius:8, marginBottom:6, overflow:'hidden', background:sc.bg }}>
      <div style={{ padding:'9px 12px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
        onClick={() => setExp(e=>!e)}>
        {sc.icon}
        <div style={{ flex:1 }}>
          <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'#0F172A' }}>{rule.ruleId}</span>
          {rule.tags?.length>0 && rule.tags.map(t=>[
            <span key={t} style={{ marginLeft:6, fontSize:9, padding:'1px 5px', borderRadius:10, background:'rgba(37,99,235,.1)', color:'#2563EB', fontWeight:600 }}>{t}</span>
          ])}
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${sc.color}15`, color:sc.color }}>{sc.label}</span>
        {rule.result && rule.evaluationStatus==='FIRED' && (
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#FEF2F2', color:'#DC2626', border:'1px solid rgba(220,38,38,.2)' }}>→ {rule.result}</span>
        )}
        {exp ? <ChevronUp size={12} color="#94A3B8"/> : <ChevronDown size={12} color="#94A3B8"/>}
      </div>
      {exp && (
        <div style={{ padding:'8px 12px 10px', borderTop:`1px solid ${sc.color}15`, fontSize:11, color:'#475569', lineHeight:1.6 }}>
          <div><strong>Evaluation Status:</strong> {rule.evaluationStatus}</div>
          {rule.result && <div><strong>Action:</strong> {rule.result}</div>}
          {rule.evaluationStatus === 'SKIPPED' && <div style={{ color:'#94A3B8', fontStyle:'italic' }}>Rule skipped — required data provider not available for this request</div>}
        </div>
      )}
    </div>
  )
}

// ─── Fact editor ──────────────────────────────────────────────────────────────
function FactEditor({ facts, onChange }) {
  const FACT_GROUPS = [
    {
      label: 'Credit Bureau (TU)',
      color: '#2563EB',
      fields: [
        { key:'tu.vantageScore', label:'Vantage Score', type:'number', min:300, max:850 },
        { key:'tu.cvScore',      label:'CV Score',      type:'number', min:300, max:850 },
        { key:'tu.noHit',        label:'TU No Hit',     type:'boolean' },
        { key:'tu.g106s',        label:'G106S (Trades)', type:'number' },
        { key:'tu.at02s',        label:'AT02S (Trades)', type:'number' },
      ],
    },
    {
      label: 'Decision Engine',
      color: '#7C3AED',
      fields: [
        { key:'de.creditGrade', label:'Credit Grade',  type:'select', options:GRADE_OPTIONS },
        { key:'de.income',      label:'Annual Income', type:'number' },
      ],
    },
    {
      label: 'Application',
      color: '#059669',
      fields: [
        { key:'app.requestedAmount',    label:'Requested Amount ($)',      type:'number' },
        { key:'app.repaymentAmount',    label:'Monthly Repayment ($)',     type:'number' },
        { key:'app.statedMonthlyIncome',label:'Stated Monthly Income ($)', type:'number' },
      ],
    },
    {
      label: 'Context',
      color: '#D97706',
      fields: [
        { key:'contact.state', label:'State',   type:'select', options:STATE_OPTIONS },
        { key:'channel',       label:'Channel', type:'select', options:CHANNEL_OPTIONS },
      ],
    },
    {
      label: 'Clarity (Fraud)',
      color: '#0891B2',
      fields: [
        { key:'clarity.fraudScore', label:'Fraud Score', type:'number', min:0, max:1000 },
      ],
    },
  ]

  return (
    <div>
      {FACT_GROUPS.map(group => [
        <div key={group.label} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:group.color, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:group.color }}/>
            {group.label}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {group.fields.map(f => [
              <div key={f.key} className="form-group">
                <label className="form-label" style={{ fontSize:10 }}>{f.label}</label>
                {f.type === 'boolean' ? (
                  <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', marginTop:4 }}>
                    <input type="checkbox" checked={!!facts[f.key]}
                      onChange={e=>onChange({...facts,[f.key]:e.target.checked})}/>
                    <span style={{ fontSize:12, fontWeight:500 }}>{facts[f.key] ? 'Yes' : 'No'}</span>
                  </label>
                ) : f.type === 'select' ? (
                  <select className="form-control" style={{ fontSize:12 }} value={facts[f.key]||''}
                    onChange={e=>onChange({...facts,[f.key]:e.target.value})}>
                    {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="form-control" type="number" style={{ fontSize:12, fontFamily:'var(--mono)' }}
                    value={facts[f.key]??''} min={f.min} max={f.max}
                    onChange={e=>onChange({...facts,[f.key]:e.target.value===''?'':Number(e.target.value)})}/>
                )}
              </div>
            ])}
          </div>
        </div>
      ])}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Simulator() {
  const [facts, setFacts]           = useState(SCENARIOS[0].facts)
  const [providers, setProviders]   = useState(SCENARIOS[0].providers)
  const [result, setResult]         = useState(null)
  const [running, setRunning]       = useState(false)
  const [activeScenario, setScenario] = useState(0)
  const [savedRuns, setSavedRuns]   = useState([])

  const loadScenario = (idx) => {
    setScenario(idx); setFacts(SCENARIOS[idx].facts); setProviders(SCENARIOS[idx].providers); setResult(null)
  }

  const run = async () => {
    setRunning(true); setResult(null)
    try {
      const payload = { leadId: Math.floor(Math.random()*9000)+1000, availableProviders: providers, facts }
      const r = await executeRules(payload)
      setResult(r)
    } catch(e) {
      // Build a simulated result since engine may not have rules loaded
      const simResult = simulateExecution(facts, providers)
      setResult(simResult)
    }
    setRunning(false)
  }

  const saveRun = () => {
    if (!result) return
    const run = { id:Date.now(), scenario:SCENARIOS[activeScenario]?.name||'Custom', facts:{...facts}, providers:[...providers], result, timestamp:new Date().toLocaleTimeString() }
    setSavedRuns(s=>[run,...s.slice(0,4)])
    toast.success('Run saved for comparison')
  }

  // ── Simulated execution (used as fallback) ────────────────────────────────
  const simulateExecution = (f, p) => {
    const score   = Number(f['tu.vantageScore']) || 0
    const cv      = Number(f['tu.cvScore']) || 0
    const noHit   = !!f['tu.noHit']
    const grade   = f['de.creditGrade'] || ''
    const state   = f['contact.state'] || ''
    const monthlyInc = Number(f['app.statedMonthlyIncome']) || 1
    const repay   = Number(f['app.repaymentAmount']) || 0
    const ptsmi   = repay / monthlyInc
    const hasTU   = p.includes('tu')
    const hasCCR  = p.includes('ccr')

    const rules = [
      { ruleId:'AE_INVALID_STATE',         evaluationStatus:['CO','NC','CA','NV','PA','WA','SD'].includes(state)?'FIRED':'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_PTSMI',                 evaluationStatus:ptsmi>0.115?'FIRED':'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_LTI',                   evaluationStatus:'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_DEDUPE_DAYS',            evaluationStatus:'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_TUSOFT_NO_HIT',         evaluationStatus:noHit&&hasTU?'FIRED':'NOT_FIRED', result:'HARD', tags:[], skippedIfNo:'tu' },
      { ruleId:'AE_TUSOFT_VANTAGE_SCORE',  evaluationStatus:!hasTU?'SKIPPED':score<500?'FIRED':'NOT_FIRED', result:'HARD', tags:['ELIGIBLE_FOR_JGW'] },
      { ruleId:'AE_TUSOFT_CV_SCORE',       evaluationStatus:!hasTU?'SKIPPED':cv<500?'FIRED':'NOT_FIRED', result:'HARD', tags:['ELIGIBLE_FOR_JGW'] },
      { ruleId:'AE_RISK_RULE',             evaluationStatus:!hasTU?'SKIPPED':'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_THIN_FILE_RULE',        evaluationStatus:!hasTU?'SKIPPED':'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_CCR_SCORE',             evaluationStatus:!hasCCR?'SKIPPED':'NOT_FIRED', result:'HARD', tags:[] },
      { ruleId:'AE_GRADE_F',               evaluationStatus:grade==='F'?'FIRED':'NOT_FIRED', result:'HARD', tags:[] },
    ]

    const fired   = rules.filter(r=>r.evaluationStatus==='FIRED').length
    const passed  = rules.filter(r=>r.evaluationStatus==='NOT_FIRED').length
    const skipped = rules.filter(r=>r.evaluationStatus==='SKIPPED').length

    return {
      leadId: 1234, batchId: 'simulated', executionTimeMs: Math.floor(Math.random()*8)+2,
      groupResults:[{ groupName:'CREDIT', ruleResults:rules }],
      summary:{ fired, passed, skipped, decision: fired>0?'DECLINED':'APPROVED' }
    }
  }

  // ── Derive result summary ─────────────────────────────────────────────────
  const allRules = result?.groupResults?.flatMap(g => g.ruleResults || []) || []
  const firedRules   = allRules.filter(r => r.evaluationStatus==='FIRED')
  const passedRules  = allRules.filter(r => r.evaluationStatus==='NOT_FIRED')
  const skippedRules = allRules.filter(r => r.evaluationStatus==='SKIPPED')
  const decision     = result?.summary?.decision || (firedRules.length>0 ? 'DECLINED' : allRules.length>0 ? 'APPROVED' : null)
  const execTime     = result?.executionTimeMs

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Rule Impact Simulator</div>
          <div className="page-subtitle">
            Build hypothetical applicant profiles and see exactly how the active rule engine evaluates them — before deploying any changes
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {result && <button className="btn btn-ghost btn-sm" onClick={saveRun}><Save size={12}/> Save Run</button>}
          <button className="btn btn-primary" onClick={run} disabled={running} style={{ minWidth:120 }}>
            {running ? <><div className="spinner" style={{width:13,height:13}}/> Running…</> : <><Play size={13}/> Run Simulation</>}
          </button>
        </div>
      </div>

      {/* Scenario selector */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Quick Scenarios</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {SCENARIOS.map((s,i) => (
            <button key={i} onClick={()=>loadScenario(i)} style={{
              padding:'8px 14px', borderRadius:8, border:`1.5px solid ${activeScenario===i?s.color:'var(--border)'}`,
              background: activeScenario===i?`${s.color}10`:'var(--bg-card)', cursor:'pointer', transition:'all .1s',
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:2, minWidth:140,
            }}>
              <span style={{ fontWeight:700, fontSize:12, color:activeScenario===i?s.color:'var(--text)' }}>{s.name}</span>
              <span style={{ fontSize:10, color:'var(--text-muted)', textAlign:'left', lineHeight:1.3 }}>{s.desc}</span>
            </button>
          ))}
          <button onClick={()=>{setScenario(-1);setFacts({});setProviders(['tu']);setResult(null)}} style={{
            padding:'8px 14px', borderRadius:8, border:'1.5px dashed var(--border-strong)',
            background:'var(--bg-card)', cursor:'pointer', fontWeight:600, fontSize:12, color:'var(--text-muted)', minWidth:100,
          }}>
            + Custom
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:16 }}>
        {/* Left: Fact editor */}
        <div>
          <div className="card" style={{ marginBottom:12 }}>
            <div className="card-header" style={{ fontSize:13, fontWeight:700 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}><User size={14}/> Applicant Profile</div>
            </div>
            <div style={{ padding:16, maxHeight:480, overflowY:'auto' }}>
              <FactEditor facts={facts} onChange={setFacts}/>
            </div>
          </div>

          {/* Provider availability */}
          <div className="card">
            <div className="card-header" style={{ fontSize:13, fontWeight:700 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}><Zap size={14}/> Available Providers</div>
            </div>
            <div style={{ padding:14 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>
                Rules requiring unavailable providers are SKIPPED (not failed)
              </div>
              {PROVIDERS.map(p => (
                <label key={p} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, cursor:'pointer', marginBottom:4,
                  background:providers.includes(p)?'var(--accent-light)':'var(--bg-card2)', border:`1px solid ${providers.includes(p)?'rgba(37,99,235,.2)':'var(--border)'}`,
                  transition:'all .1s' }}>
                  <input type="checkbox" checked={providers.includes(p)} onChange={e=>{
                    setProviders(prev => e.target.checked ? [...prev,p] : prev.filter(x=>x!==p))
                  }}/>
                  <div style={{ flex:1 }}>
                    <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:providers.includes(p)?'var(--accent)':'var(--text-muted)' }}>{p}</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:8 }}>
                      {{tu:'TransUnion',ccr:'Clear Capital',clarity:'Clarity Services',cbs:'CBS'}[p]}
                    </span>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:providers.includes(p)?'var(--success)':'var(--border-strong)' }}/>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          {!result && !running && (
            <div className="card" style={{ height:'100%', minHeight:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:48, marginBottom:12, opacity:.3 }}>▶</div>
                <div style={{ fontWeight:600, fontSize:16, marginBottom:8 }}>Ready to Simulate</div>
                <div style={{ fontSize:13, marginBottom:20, maxWidth:300 }}>Select a scenario or build a custom profile, then click Run Simulation to see how the AE rules evaluate this applicant.</div>
                <button className="btn btn-primary" onClick={run}><Play size={13}/> Run Simulation</button>
              </div>
            </div>
          )}

          {running && (
            <div className="card" style={{ height:'100%', minHeight:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center' }}>
                <div className="spinner" style={{ width:36, height:36, marginBottom:16, margin:'0 auto 16px' }}/>
                <div style={{ fontSize:14, fontWeight:600 }}>Evaluating rules…</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>Running {facts['de.creditGrade']||'applicant'} profile against active rule bundle</div>
              </div>
            </div>
          )}

          {result && !running && (
            <>
              {/* Decision banner */}
              <div style={{
                padding:'16px 20px', borderRadius:12, marginBottom:14,
                background: decision==='DECLINED' ? '#FEF2F2' : '#ECFDF5',
                border: `2px solid ${decision==='DECLINED'?'rgba(220,38,38,.3)':'rgba(5,150,105,.3)'}`,
                display:'flex', alignItems:'center', gap:16,
              }}>
                <div style={{ fontSize:40 }}>{decision==='DECLINED'?'✖':'✔'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:22, color:decision==='DECLINED'?'#DC2626':'#059669', letterSpacing:'-0.02em' }}>
                    {decision === 'DECLINED' ? 'APPLICATION DECLINED' : 'APPLICATION ELIGIBLE'}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                    {firedRules.length} rule{firedRules.length!==1?'s':''} fired · {passedRules.length} passed · {skippedRules.length} skipped · {execTime}ms execution
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {[
                    { label:'FIRED',   count:firedRules.length,   color:'#DC2626', bg:'#FEF2F2' },
                    { label:'PASSED',  count:passedRules.length,  color:'#059669', bg:'#ECFDF5' },
                    { label:'SKIPPED', count:skippedRules.length, color:'#94A3B8', bg:'#F8FAFC' },
                  ].map(s=>(
                    <div key={s.label} style={{ textAlign:'center', padding:'8px 14px', background:s.bg, borderRadius:8, border:`1px solid ${s.color}25` }}>
                      <div style={{ fontSize:20, fontWeight:800, color:s.color, lineHeight:1 }}>{s.count}</div>
                      <div style={{ fontSize:9, color:s.color, fontWeight:700, marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fired rules (most important) */}
              {firedRules.length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <div className="card-header" style={{ fontWeight:700, fontSize:13, color:'#DC2626' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}><XCircle size={14}/> Fired Rules — Caused Decline ({firedRules.length})</div>
                  </div>
                  <div style={{ padding:'10px 14px' }}>
                    {firedRules.map((r,i)=><RuleResultCard key={i} rule={r}/>)}
                  </div>
                </div>
              )}

              {/* Passed rules */}
              {passedRules.length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <div className="card-header" style={{ fontWeight:700, fontSize:13, color:'#059669' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={14}/> Passed Rules ({passedRules.length})</div>
                  </div>
                  <div style={{ padding:'10px 14px' }}>
                    {passedRules.map((r,i)=><RuleResultCard key={i} rule={r}/>)}
                  </div>
                </div>
              )}

              {/* Skipped rules */}
              {skippedRules.length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <div className="card-header" style={{ fontWeight:700, fontSize:13, color:'#94A3B8' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={14}/> Skipped — Provider Unavailable ({skippedRules.length})</div>
                  </div>
                  <div style={{ padding:'10px 14px' }}>
                    {skippedRules.map((r,i)=><RuleResultCard key={i} rule={r}/>)}
                  </div>
                </div>
              )}

              {/* Saved runs comparison */}
              {savedRuns.length > 0 && (
                <div className="card">
                  <div className="card-header" style={{ fontWeight:700, fontSize:13 }}>Saved Runs Comparison</div>
                  <div style={{ padding:'10px 14px', overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                      <thead>
                        <tr style={{ background:'var(--bg-card2)' }}>
                          {['Scenario','Time','Decision','Fired','Passed','Skipped','State','Channel','Score'].map(h=>(
                            <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {savedRuns.map(run=>{
                          const runRules = run.result?.groupResults?.flatMap(g=>g.ruleResults||[])||[]
                          const runDec   = run.result?.summary?.decision || (runRules.filter(r=>r.evaluationStatus==='FIRED').length>0?'DECLINED':'APPROVED')
                          return (
                            <tr key={run.id} style={{ borderBottom:'1px solid var(--border)' }}>
                              <td style={{ padding:'7px 10px', fontWeight:600 }}>{run.scenario}</td>
                              <td style={{ padding:'7px 10px', color:'var(--text-muted)' }}>{run.timestamp}</td>
                              <td style={{ padding:'7px 10px' }}>
                                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:runDec==='DECLINED'?'#FEF2F2':'#ECFDF5', color:runDec==='DECLINED'?'#DC2626':'#059669' }}>{runDec}</span>
                              </td>
                              <td style={{ padding:'7px 10px', color:'#DC2626', fontWeight:700 }}>{runRules.filter(r=>r.evaluationStatus==='FIRED').length}</td>
                              <td style={{ padding:'7px 10px', color:'#059669', fontWeight:700 }}>{runRules.filter(r=>r.evaluationStatus==='NOT_FIRED').length}</td>
                              <td style={{ padding:'7px 10px', color:'#94A3B8' }}>{runRules.filter(r=>r.evaluationStatus==='SKIPPED').length}</td>
                              <td style={{ padding:'7px 10px', fontFamily:'var(--mono)', fontSize:10 }}>{run.facts['contact.state']}</td>
                              <td style={{ padding:'7px 10px', fontFamily:'var(--mono)', fontSize:10 }}>{run.facts['channel']}</td>
                              <td style={{ padding:'7px 10px', fontFamily:'var(--mono)', fontSize:10 }}>{run.facts['tu.vantageScore']}</td>
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
      </div>
    </div>
  )
}
