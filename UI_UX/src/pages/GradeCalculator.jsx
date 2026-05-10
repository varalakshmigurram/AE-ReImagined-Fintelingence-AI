import { useState } from 'react'
import { Award, ChevronRight, CheckCircle, Info, Zap } from 'lucide-react'

// ─── Step 1: V11_ADF_Score → Intermediate IB band ────────────────────────────
// ADF score ranges define your "position row" in the matrix
const ADF_BAND_RANGES = [
  { band:'IB1',  min:891, max:999 },
  { band:'IB2',  min:868, max:890 },
  { band:'IB3',  min:845, max:867 },
  { band:'IB4',  min:820, max:844 },
  { band:'IB5',  min:796, max:819 },
  { band:'IB6',  min:770, max:795 },
  { band:'IB7',  min:742, max:769 },
  { band:'IB8',  min:703, max:741 },
  { band:'IB9',  min:647, max:702 },
  { band:'IB10', min:0,   max:646 },
]

// ─── Step 2: V11_Market_Score → column in 10×10 matrix → final IB ────────────
// Market score ranges define the column
const MARKET_BAND_RANGES = [
  { col:0, min:891, max:999 },
  { col:1, min:868, max:890 },
  { col:2, min:845, max:867 },
  { col:3, min:820, max:844 },
  { col:4, min:796, max:819 },
  { col:5, min:770, max:795 },
  { col:6, min:742, max:769 },
  { col:7, min:703, max:741 },
  { col:8, min:647, max:702 },
  { col:9, min:0,   max:646 },
]

// 10×10 matrix: row = ADF intermediate band index (0=IB1..9=IB10),
// col = market score band index (0=highest..9=lowest)
// Cell = final IB band (as seen in the spec's coloured grid)
const IB_MATRIX = [
  ['IB1','IB1','IB1','IB1','IB1','IB1','IB1','IB1','IB1','IB2'],  // ADF row IB1
  ['IB2','IB2','IB2','IB2','IB2','IB2','IB2','IB2','IB2','IB3'],  // ADF row IB2
  ['IB3','IB3','IB3','IB3','IB3','IB3','IB3','IB3','IB3','IB4'],  // ADF row IB3
  ['IB4','IB4','IB4','IB4','IB4','IB4','IB4','IB4','IB4','IB5'],  // ADF row IB4
  ['IB5','IB5','IB5','IB5','IB5','IB5','IB5','IB5','IB5','IB6'],  // ADF row IB5
  ['IB6','IB6','IB6','IB6','IB6','IB6','IB6','IB6','IB6','IB7'],  // ADF row IB6
  ['IB7','IB7','IB7','IB7','IB7','IB7','IB7','IB7','IB7','IB8'],  // ADF row IB7
  ['IB8','IB8','IB8','IB8','IB8','IB8','IB8','IB8','IB8','IB9'],  // ADF row IB8
  ['IB9','IB9','IB9','IB9','IB9','IB9','IB9','IB9','IB9','IB10'], // ADF row IB9
  ['IB10','IB10','IB10','IB10','IB10','IB10','IB10','IB10','IB10','IB10'], // ADF row IB10
]

// ─── External Band: Vantage Score ─────────────────────────────────────────────
const EB_RANGES = [
  { band:'EB1', min:761, max:999 },
  { band:'EB2', min:681, max:760 },
  { band:'EB3', min:621, max:680 },
  { band:'EB4', min:581, max:620 },
  { band:'EB5', min:500, max:580 },
]

// ─── Credit Grade Matrix: EB × final IB → initial grade ──────────────────────
const GRADE_MATRIX = {
  EB1: ['A1','A2','B1','B2','C1','C2','F','F','F','F'],
  EB2: ['B1','B2','C1','C2','D1','D2','E1','F','F','F'],
  EB3: ['B2','C1','C1','C2','D1','D2','E1','E2','F','F'],
  EB4: ['C1','C2','C2','D1','D1','D2','E1','E2','F','F'],
  EB5: ['D1','D1','D2','D2','E1','E1','E2','E2','F','F'],
}

const GRADE_RANKS = {A1:1,A2:2,B1:3,B2:4,C1:5,C2:6,D1:7,D2:8,E1:9,E2:10}
const RANK_GRADES = Object.fromEntries(Object.entries(GRADE_RANKS).map(([g,r])=>[r,g]))

const ADJUSTMENTS = [
  { id:'Adj_QS',      label:'Channel = QS',                       weightage:1,   condition:f=>f.channel==='QS',                    appliesToE:'no' },
  { id:'Adj_ML',      label:'Channel = ML',                       weightage:1.5, condition:f=>f.channel==='ML',                    appliesToE:'no' },
  { id:'Adj_MO',      label:'Channel = MO',                       weightage:2,   condition:f=>f.channel==='MO',                    appliesToE:'no' },
  { id:'Adj_DC',      label:'Purpose = Debt Consolidation',        weightage:1.5, condition:f=>f.purpose==='Debt Consolidation',    appliesToE:'no' },
  { id:'Adj_VA',      label:'State = VA',                         weightage:0.5, condition:f=>f.state==='VA',                     appliesToE:'yes'},
  { id:'Adj_Redirect',label:'(Requested − Grade Loan) > $3,000',  weightage:1,   condition:f=>(f.requestedAmount-f.gradeLoanAmount)>3000, appliesToE:'no' },
]
const OVERWRITES = [
  { id:'OW_Pplus',   label:'Channel ML/MO/CKPQ/QS & Req=$1,000', newGrade:'E2', condition:f=>['ML','MO','CKPQ','QS'].includes(f.channel)&&Number(f.requestedAmount)===1000 },
  { id:'OW_CCR',     label:'CCR employer changes (6mo) ≥ 4',      newGrade:'E2', condition:f=>Number(f.employerChanges)>=4 },
  { id:'OW_ThinFile',label:'TU AT01S ≤ 3',                        newGrade:'E2', condition:f=>Number(f.at01s)<=3 },
]

function getADFBand(score)    { return ADF_BAND_RANGES.find(e=>score>=e.min&&score<=e.max) }
function getMarketCol(score)  { return MARKET_BAND_RANGES.find(e=>score>=e.min&&score<=e.max) }
function getEB(score)         { return EB_RANGES.find(e=>score>=e.min&&score<=e.max) }

function assignGrade(inputs) {
  const { vantageScore, adfScore, marketScore, channel, state, purpose,
          requestedAmount, gradeLoanAmount, employerChanges, at01s } = inputs

  const eb    = getEB(Number(vantageScore))
  const adfB  = getADFBand(Number(adfScore))
  const mktC  = getMarketCol(Number(marketScore))

  if (!eb)   return { error: 'Vantage Score out of range (500–999)' }
  if (!adfB) return { error: 'V11_ADF_Score out of range (0–999)' }
  if (!mktC) return { error: 'V11_Market_Score out of range (0–999)' }

  const adfIdx = parseInt(adfB.band.replace('IB','')) - 1
  const mktIdx = mktC.col
  const finalIB = IB_MATRIX[adfIdx][mktIdx]
  const ibIdx   = parseInt(finalIB.replace('IB','')) - 1
  const initialGrade = GRADE_MATRIX[eb.band][ibIdx]

  const step1 = { eb: eb.band, adfBand: adfB.band, mktCol: mktC.col, finalIB, initialGrade }

  const isEGrade = ['E1','E2','F'].includes(initialGrade)
  const f = { channel, state, purpose, requestedAmount:Number(requestedAmount),
               gradeLoanAmount:Number(gradeLoanAmount)||0,
               employerChanges:Number(employerChanges)||0, at01s:Number(at01s)||99 }

  let totalWeight = 0
  const appliedAdjustments = ADJUSTMENTS.map(adj => {
    const applies = adj.condition(f) && (adj.appliesToE==='yes' || !isEGrade)
    if (applies) totalWeight += adj.weightage
    return { ...adj, applied: applies, reason: !adj.condition(f) ? 'Condition not met' : isEGrade && adj.appliesToE!=='yes' ? 'Grade is E/F (excluded)' : '' }
  })
  const aggregateWeightage = Math.min(Math.round(totalWeight), 2)
  let adjustedGrade = initialGrade
  if (aggregateWeightage > 0 && initialGrade !== 'F') {
    const newRank = GRADE_RANKS[initialGrade] + aggregateWeightage
    adjustedGrade = newRank > 10 ? 'F' : RANK_GRADES[newRank] || 'F'
  }
  const step2a = { appliedAdjustments, totalWeight, aggregateWeightage, adjustedGrade }

  let finalGrade = adjustedGrade
  const appliedOverwrites = OVERWRITES.map(ow => {
    const applies = finalGrade !== 'F' && ow.condition(f)
    if (applies) finalGrade = ow.newGrade
    return { ...ow, applied: applies }
  })
  const segmentFlag = ['ML','MO','CKPQ','LT','QS'].includes(channel) && Number(requestedAmount)===1000 ? 'E1_E2' : 'Others'
  return { step1, step2a, step2b:{ appliedOverwrites, finalGrade }, segmentFlag, finalGrade, error:null }
}

const S = {
  label: { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, display:'block' },
  input: { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, color:'var(--text)', outline:'none' },
  select: { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, color:'var(--text)', outline:'none', cursor:'pointer' },
}
const GRADE_COLORS = { A1:'#059669',A2:'#059669',B1:'#16A34A',B2:'#16A34A',C1:'#D97706',C2:'#D97706',D1:'#EA580C',D2:'#EA580C',E1:'#DC2626',E2:'#DC2626',F:'#7C3AED' }

function GradePill({ grade, size=14 }) {
  const c = GRADE_COLORS[grade] || '#64748B'
  return <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:size*2.4, height:size*2.4, borderRadius:'50%', background:`${c}15`, border:`2px solid ${c}`, color:c, fontWeight:800, fontSize:size, fontFamily:'var(--mono)' }}>{grade}</span>
}

function StepCard({ step, title, children, color='var(--accent)' }) {
  return (
    <div className="card" style={{ marginBottom:14 }}>
      <div className="card-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:`${color}15`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color }}>{step}</div>
          <span style={{ fontWeight:700, fontSize:13 }}>{title}</span>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  )
}

// ─── IB Matrix mini-visualiser ─────────────────────────────────────────────
function IBMatrix({ adfBand, mktCol, finalIB }) {
  const adfIdx = adfBand ? parseInt(adfBand.replace('IB',''))-1 : -1
  return (
    <div style={{ overflowX:'auto', marginTop:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase' }}>V11_Market_Score →</div>
      <table style={{ borderCollapse:'collapse', fontSize:10 }}>
        <thead>
          <tr>
            <th style={{ padding:'3px 8px', background:'var(--bg-sidebar)', color:'rgba(148,163,184,.8)', fontWeight:700, fontSize:9, borderRight:'2px solid var(--border-strong)', minWidth:50 }}>ADF ↓ / Mkt →</th>
            {MARKET_BAND_RANGES.map((m,i) => (
              <th key={i} style={{ padding:'3px 6px', background: i===mktCol ? 'rgba(37,99,235,.15)' : 'var(--bg-sidebar)', color: i===mktCol ? 'var(--accent)' : 'rgba(148,163,184,.7)', fontWeight:700, fontSize:9, minWidth:38, textAlign:'center', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                {m.min}–{m.max===999?'999':m.max}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IB_MATRIX.map((row, ri) => {
            const isActiveRow = ri === adfIdx
            return (
              <tr key={ri} style={{ background: isActiveRow ? 'rgba(37,99,235,.06)' : 'transparent' }}>
                <td style={{ padding:'3px 8px', fontWeight:700, fontSize:10, color: isActiveRow ? 'var(--accent)' : 'var(--text-muted)', borderRight:'2px solid var(--border-strong)', fontFamily:'var(--mono)', background: isActiveRow ? 'rgba(37,99,235,.06)' : 'var(--bg-card2)', whiteSpace:'nowrap' }}>
                  {ADF_BAND_RANGES[ri].band} ({ADF_BAND_RANGES[ri].min}–{ADF_BAND_RANGES[ri].max})
                </td>
                {row.map((cell, ci) => {
                  const isActive = ri===adfIdx && ci===mktCol
                  const ibNum = parseInt(cell.replace('IB',''))
                  const heat = Math.floor(((ibNum-1)/9)*255)
                  const bg = isActive ? 'var(--accent)' : `rgb(${heat},${255-heat},${Math.floor(128-heat/2)})`
                  return (
                    <td key={ci} style={{ padding:'3px 6px', textAlign:'center', fontWeight: isActive ? 800 : 600, fontSize:10, fontFamily:'var(--mono)', color: isActive ? '#fff' : '#fff', background: isActive ? 'var(--accent)' : bg+'aa', border: isActive ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,.08)', transition:'all .1s' }}>
                      {cell}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {finalIB && <div style={{ marginTop:8, fontSize:12, color:'var(--accent)', fontWeight:700 }}>→ Final Internal Band: <span style={{ fontFamily:'var(--mono)' }}>{finalIB}</span></div>}
    </div>
  )
}

export default function GradeCalculator() {
  const [form, setForm] = useState({
    vantageScore:720, adfScore:830, marketScore:810,
    channel:'QS', state:'TX', purpose:'Personal',
    requestedAmount:3000, gradeLoanAmount:4000, employerChanges:0, at01s:8,
  })
  const [result, setResult] = useState(null)
  const [showMatrix, setShowMatrix] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const run = () => setResult(assignGrade(form))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Credit Grade Assignment Engine</div>
          <div className="page-subtitle">Three-step: V11_ADF_Score × V11_Market_Score → IB → EB × IB grade matrix → adjustments → overwrites</div>
        </div>
        <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'var(--purple-dim)', color:'var(--purple)', fontWeight:700 }}>SPEC STEPS 1–2</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'310px 1fr', gap:20 }}>
        {/* Inputs */}
        <div>
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Applicant Inputs</span></div>
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--accent-dim)', border:'1px solid rgba(37,99,235,.2)', fontSize:11, color:'var(--accent)' }}>
                <strong>Two IB score inputs required:</strong><br/>
                V11_ADF_Score selects the matrix row. V11_Market_Score selects the column. The cell intersection is your final Internal Band.
              </div>
              <div>
                <label style={S.label}>Vantage Score (External Band)</label>
                <input style={S.input} type="number" value={form.vantageScore} onChange={e=>set('vantageScore',e.target.value)}/>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                  {getEB(Number(form.vantageScore)) ? `→ ${getEB(Number(form.vantageScore)).band}` : 'Out of range'}
                </div>
              </div>
              <div>
                <label style={S.label}>V11_ADF_Score (row selector)</label>
                <input style={S.input} type="number" value={form.adfScore} onChange={e=>set('adfScore',e.target.value)}/>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                  {getADFBand(Number(form.adfScore)) ? `→ ${getADFBand(Number(form.adfScore)).band} (intermediate)` : 'Out of range'}
                </div>
              </div>
              <div>
                <label style={S.label}>V11_Market_Score (column selector)</label>
                <input style={S.input} type="number" value={form.marketScore} onChange={e=>set('marketScore',e.target.value)}/>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                  {getMarketCol(Number(form.marketScore)) ? `→ Column ${getMarketCol(Number(form.marketScore)).col+1}` : 'Out of range'}
                </div>
              </div>
              <div>
                <label style={S.label}>Channel</label>
                <select style={S.select} value={form.channel} onChange={e=>set('channel',e.target.value)}>
                  {['CMPQ','CKPQ','QS','LT','ML','MO','CMACT'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>State</label>
                <select style={S.select} value={form.state} onChange={e=>set('state',e.target.value)}>
                  {['AK','AZ','CA','CO','DE','FL','GA','HI','ID','IN','KS','KY','LA','MI','MN','MS','MT','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Loan Purpose</label>
                <select style={S.select} value={form.purpose} onChange={e=>set('purpose',e.target.value)}>
                  {['Personal','Debt Consolidation','Home Improvement','Medical','Auto'].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              {[{k:'requestedAmount',l:'Requested Amount ($)'},{k:'gradeLoanAmount',l:'Grade Loan Amount ($)'},{k:'employerChanges',l:'CCR Employer Changes (6mo)'},{k:'at01s',l:'TU AT01S count'}].map(({k,l})=>(
                <div key={k}>
                  <label style={S.label}>{l}</label>
                  <input style={S.input} type="number" value={form[k]} onChange={e=>set(k,e.target.value)}/>
                </div>
              ))}
              <button onClick={run} style={{ padding:'11px', borderRadius:8, background:'var(--purple)', color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Award size={14}/> Assign Grade
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          {!result && (
            <div className="card" style={{ minHeight:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:52, marginBottom:12, opacity:.2 }}>🎯</div>
                <div style={{ fontWeight:600, fontSize:16 }}>Ready to Assign</div>
                <div style={{ fontSize:13, marginTop:6 }}>Enter scores and click Assign Grade</div>
              </div>
            </div>
          )}

          {result?.error && (
            <div style={{ padding:20, borderRadius:12, background:'var(--danger-dim)', border:'2px solid rgba(220,38,38,.3)' }}>
              <div style={{ color:'var(--danger)', fontWeight:700 }}>{result.error}</div>
            </div>
          )}

          {result && !result.error && (
            <>
              {/* Final Grade Banner */}
              <div style={{ padding:'20px 24px', borderRadius:12, background:'var(--bg-card)', border:'2px solid var(--border)', marginBottom:14, display:'flex', alignItems:'center', gap:20 }}>
                <GradePill grade={result.finalGrade} size={24}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:22, color:GRADE_COLORS[result.finalGrade]||'#64748B', letterSpacing:'-0.02em' }}>Final Grade: {result.finalGrade}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                    {result.step1.adfBand} (ADF) × Col {result.step1.mktCol+1} (Market) → {result.step1.finalIB} → {result.step1.eb} × {result.step1.finalIB} → Initial: <strong>{result.step1.initialGrade}</strong>
                    {result.step2a.adjustedGrade!==result.step1.initialGrade && ` → Adjusted: ${result.step2a.adjustedGrade}`}
                    {result.step2b.finalGrade!==result.step2a.adjustedGrade && ` → Overwritten: ${result.step2b.finalGrade}`}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>SEGMENT FLAG</div>
                  <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14, color:result.segmentFlag==='E1_E2'?'var(--danger)':'var(--success)' }}>{result.segmentFlag}</div>
                </div>
              </div>

              {/* Step 1: Two-score IB lookup */}
              <StepCard step="1" title="Internal Band Lookup — V11_ADF_Score × V11_Market_Score Matrix" color="var(--cyan)">
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
                  {[
                    { label:'V11_ADF_Score', val:form.adfScore, sub:`→ ${result.step1.adfBand} (row)`, color:'var(--cyan)' },
                    { label:'V11_Market_Score', val:form.marketScore, sub:`→ Col ${result.step1.mktCol+1} (col)`, color:'var(--purple)' },
                    { label:'Final Internal Band', val:result.step1.finalIB, sub:'Matrix intersection', color:'var(--accent)', big:true },
                    { label:'External Band', val:result.step1.eb, sub:`Vantage: ${form.vantageScore}`, color:'var(--warning)' },
                  ].map(c=>(
                    <div key={c.label} style={{ padding:'10px 14px', borderRadius:8, background:`${c.color.replace('var(--','').replace(')','') === c.color ? c.color+'15' : 'var(--bg-card2)'}`, border:`1px solid ${c.color}25`, textAlign:'center', minWidth:100 }}>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{c.label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:c.big?20:16, color:c.color }}>{c.val}</div>
                      <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:2 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setShowMatrix(!showMatrix)} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'1px solid var(--accent)', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>
                  {showMatrix ? 'Hide' : 'Show'} 10×10 Matrix
                </button>
                {showMatrix && <IBMatrix adfBand={result.step1.adfBand} mktCol={result.step1.mktCol} finalIB={result.step1.finalIB}/>}
              </StepCard>

              {/* Step 2a: Adjustments */}
              <StepCard step="2a" title="Weighted Grade Adjustments" color="var(--warning)">
                <div style={{ marginBottom:12 }}>
                  {result.step2a.appliedAdjustments.map(adj=>(
                    <div key={adj.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:7, background:adj.applied?'var(--warning-dim)':'var(--bg-card2)', border:`1px solid ${adj.applied?'rgba(217,119,6,.25)':'var(--border)'}`, marginBottom:5 }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:adj.applied?'var(--warning)':'var(--border-strong)', flexShrink:0 }}>
                        {adj.applied ? <CheckCircle size={11} color="#fff"/> : <span style={{ color:'#fff', fontSize:10 }}>×</span>}
                      </div>
                      <span style={{ flex:1, fontSize:12, color:adj.applied?'var(--text)':'var(--text-muted)' }}>{adj.label}</span>
                      {!adj.applied && adj.reason && <span style={{ fontSize:10, color:'var(--text-muted)', fontStyle:'italic' }}>{adj.reason}</span>}
                      <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:adj.applied?'var(--warning)':'var(--text-subtle)' }}>{adj.applied?`+${adj.weightage}`:'0'}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {[
                    { label:'Sum of Weightages', val:result.step2a.totalWeight.toFixed(1), color:'var(--accent)' },
                    { label:'Aggregate MIN(sum,2)', val:result.step2a.aggregateWeightage, color:'var(--warning)' },
                    { label:'Rank Shift', val:`+${result.step2a.aggregateWeightage}`, color:'var(--danger)' },
                    { label:'Adjusted Grade', val:result.step2a.adjustedGrade, color:GRADE_COLORS[result.step2a.adjustedGrade] },
                  ].map(c=>(
                    <div key={c.label} style={{ flex:1, minWidth:90, padding:'10px 12px', borderRadius:8, background:'var(--bg-card2)', border:'1px solid var(--border)', textAlign:'center' }}>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{c.label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:16, color:c.color }}>{c.val}</div>
                    </div>
                  ))}
                </div>
              </StepCard>

              {/* Step 2b: Overwrites */}
              <StepCard step="2b" title="Credit Grade Overwrites" color="var(--danger)">
                {result.step2b.appliedOverwrites.map(ow=>(
                  <div key={ow.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:7, background:ow.applied?'var(--danger-dim)':'var(--bg-card2)', border:`1px solid ${ow.applied?'rgba(220,38,38,.25)':'var(--border)'}`, marginBottom:5 }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:ow.applied?'var(--danger)':'var(--border-strong)', flexShrink:0 }}>
                      {ow.applied ? <CheckCircle size={11} color="#fff"/> : <span style={{ color:'#fff', fontSize:10 }}>×</span>}
                    </div>
                    <span style={{ flex:1, fontSize:12 }}>{ow.label}</span>
                    {ow.applied && <div style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:11, color:'var(--text-muted)' }}>→</span><GradePill grade={ow.newGrade} size={12}/></div>}
                  </div>
                ))}
                {result.step2b.appliedOverwrites.every(o=>!o.applied) && (
                  <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 12px', textAlign:'center', fontStyle:'italic' }}>No overwrites applied — grade remains {result.step2a.adjustedGrade}</div>
                )}
              </StepCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}