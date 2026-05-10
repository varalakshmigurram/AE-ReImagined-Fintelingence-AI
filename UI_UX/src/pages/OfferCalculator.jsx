import { useState } from 'react'
import { Calculator, DollarSign, Percent, Clock, ChevronDown, ChevronUp, Info, CheckCircle, XCircle, Zap } from 'lucide-react'

// ─── Spec data ────────────────────────────────────────────────────────────────
const GRADE_TABLE = {
  A1: { maxLoan:6000, maxTenor:36, minAPR:59.9, maxMonthlyPayment:300, orgFeePct:0.0549 },
  A2: { maxLoan:5000, maxTenor:36, minAPR:69.9, maxMonthlyPayment:275, orgFeePct:0.0549 },
  B1: { maxLoan:4000, maxTenor:24, minAPR:79.9, maxMonthlyPayment:150, orgFeePct:0.0549 },
  B2: { maxLoan:3500, maxTenor:24, minAPR:89.9, maxMonthlyPayment:150, orgFeePct:0.0549 },
  C1: { maxLoan:3000, maxTenor:24, minAPR:99.9, maxMonthlyPayment:150, orgFeePct:0.0549 },
  C2: { maxLoan:2500, maxTenor:24, minAPR:110,  maxMonthlyPayment:150, orgFeePct:0.0549 },
  D1: { maxLoan:2000, maxTenor:18, minAPR:120,  maxMonthlyPayment:100, orgFeePct:0.0549 },
  D2: { maxLoan:1500, maxTenor:18, minAPR:135,  maxMonthlyPayment:100, orgFeePct:0.0549 },
  E1: { maxLoan:1250, maxTenor:18, minAPR:149,  maxMonthlyPayment:100, orgFeePct:0.0549 },
  E2: { maxLoan:1000, maxTenor:12, minAPR:169,  maxMonthlyPayment:100, orgFeePct:0.0549 },
}

const STATE_TABLE = {
  AK:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  AR:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  AZ:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  CO:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36,off:true},
  DE:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  FL:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  HI:{minLoan:1600,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  IN:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  KS:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  KY:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  MN:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  MS:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  MT:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  MI:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  NC:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36,off:true},
  NE:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36,off:true},
  NM:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  NV:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  OH:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  OK:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  PA:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  RI:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  SC:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  SD:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  TN:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  TX:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  UT:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  VA:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  WA:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  WI:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  ID:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  LA:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  GA:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  AL:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
  WY:{minLoan:1000,maxLoan:10000,minAPR:36,maxAPR:179.9,minTerm:12,maxTerm:36},
}

const CHANNEL_MAX = { CMPQ:15000, QS:10000, ML:10000, CKPQ:2000, MO:1000, LT:8000, CMACT:15000 }

const TENOR_TABLE = [
  {min:500,  max:999.99,  tenors:[12,18]},
  {min:1000, max:1499.99, tenors:[12,18]},
  {min:1500, max:1999.99, tenors:[18,24]},
  {min:2000, max:2499.99, tenors:[18,24]},
  {min:2500, max:2999.99, tenors:[18,24]},
  {min:3000, max:3499.99, tenors:[18,24]},
  {min:3500, max:3999.99, tenors:[24,36]},
  {min:4000, max:4499.99, tenors:[24,36]},
  {min:4500, max:4999.99, tenors:[24,36]},
  {min:5000, max:6500,    tenors:[24,36]},
]

function monthlyPayment(principal, annualAPR, months) {
  const r = annualAPR / 100 / 12
  if (r === 0) return principal / months
  return principal * r * Math.pow(1+r, months) / (Math.pow(1+r, months) - 1)
}

function maxLoanForPayment(maxPmt, annualAPR, months) {
  const r = annualAPR / 100 / 12
  if (r === 0) return maxPmt * months
  return maxPmt * (Math.pow(1+r,months) - 1) / (r * Math.pow(1+r,months))
}

function getTenorOptions(loanAmt) {
  for (const row of TENOR_TABLE) {
    if (loanAmt >= row.min && loanAmt <= row.max) return row.tenors
  }
  return [12]
}

function calculate(inputs) {
  const { creditGrade, state, channel, requestedAmount, statedMonthlyIncome, fixedObligations } = inputs
  const g = GRADE_TABLE[creditGrade]
  const s = STATE_TABLE[state] || { minLoan:1000, maxLoan:10000, minAPR:36, maxAPR:179.9, minTerm:12, maxTerm:36 }
  const channelMax = CHANNEL_MAX[channel] || 10000

  if (s.off) return { error: `State ${state} is currently OFF.` }

  const APR = g.minAPR
  const monthlyIncome = Math.min(statedMonthlyIncome, 8333)
  const stateMinLoan = Math.max(1000, s.minLoan, 1000)
  const orgFee = g.orgFeePct
  const stateMinLoanWithFee = stateMinLoan + stateMinLoan * orgFee

  const L1 = g.maxLoan
  const L2 = s.maxLoan
  const L3 = channelMax
  const L4 = maxLoanForPayment(g.maxMonthlyPayment, APR, g.maxTenor)
  const L5 = maxLoanForPayment(monthlyIncome * 0.1, APR, g.maxTenor)
  const L6 = maxLoanForPayment(monthlyIncome * 0.7 - (fixedObligations || 0), APR, g.maxTenor)
  const L7 = Math.max(stateMinLoanWithFee, requestedAmount + requestedAmount * orgFee)

  const maxOffer = Math.min(L1, L2, L3, L4, L5, L6, L7)

  if (stateMinLoanWithFee > maxOffer) {
    return { error: 'No Offer Found — state minimum exceeds calculated maximum loan offer.', L1,L2,L3,L4,L5,L6,L7, maxOffer }
  }

  const offerAmount = maxOffer
  const computedOrgFee = Math.min(9999, orgFee * offerAmount)
  const loanAmtWithoutFee = Math.floor((offerAmount - computedOrgFee) / 100) * 100
  const finalFinanceAmount = loanAmtWithoutFee + computedOrgFee

  const tenorOptions = getTenorOptions(loanAmtWithoutFee)
  const M1 = g.maxMonthlyPayment
  const M2 = monthlyIncome * 0.7 - (fixedObligations || 0)
  const maxAllowedPmt = Math.min(M1, M2)

  const filteredTenors = tenorOptions.filter(t => {
    const pmt = monthlyPayment(finalFinanceAmount, APR, t)
    return t === g.maxTenor || pmt <= maxAllowedPmt
  })

  return {
    creditGrade, APR, L1, L2, L3, L4, L5, L6, L7,
    maxOffer: Math.round(maxOffer),
    loanAmtWithoutFee,
    origFee: Math.round(computedOrgFee),
    finalFinanceAmount: Math.round(finalFinanceAmount),
    tenorOptions: filteredTenors.length > 0 ? filteredTenors : [g.maxTenor],
    M1, M2, maxAllowedPmt,
    monthlyIncome,
    orgFeePct: orgFee,
  }
}

const S = {
  label: { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, display:'block' },
  input: { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, color:'var(--text)', outline:'none' },
  select: { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--bg-card)', fontSize:13, color:'var(--text)', outline:'none', cursor:'pointer' },
}

function LConstraint({ label, value, isBinding, formula }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8,
      background: isBinding ? 'rgba(37,99,235,.06)' : 'var(--bg-card2)',
      border: `1px solid ${isBinding ? 'rgba(37,99,235,.3)' : 'var(--border)'}`,
      marginBottom:6 }}>
      <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:13,
        color: isBinding ? 'var(--accent)' : 'var(--text-muted)', minWidth:28 }}>{label}</div>
      <div style={{ flex:1, fontSize:11, color:'var(--text-muted)' }}>{formula}</div>
      <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14,
        color: isBinding ? 'var(--accent)' : 'var(--text)' }}>
        ${Math.round(value).toLocaleString()}
        {isBinding && <span style={{ fontSize:9, marginLeft:6, background:'var(--accent)', color:'#fff', borderRadius:4, padding:'1px 5px' }}>BINDING</span>}
      </div>
    </div>
  )
}

export default function OfferCalculator() {
  const [form, setForm] = useState({
    creditGrade:'B1', state:'TX', channel:'QS',
    requestedAmount:3000, statedMonthlyIncome:4500, fixedObligations:0,
  })
  const [result, setResult] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const run = () => {
    const r = calculate({ ...form,
      requestedAmount: Number(form.requestedAmount),
      statedMonthlyIncome: Number(form.statedMonthlyIncome),
      fixedObligations: Number(form.fixedObligations || 0),
    })
    setResult(r)
  }

  const bindingL = result && !result.error
    ? ['L1','L2','L3','L4','L5','L6','L7'].find(k => result[k] === Math.min(result.L1,result.L2,result.L3,result.L4,result.L5,result.L6,result.L7))
    : null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Live Offer Calculator</div>
          <div className="page-subtitle">Real-time L1–L7 constraint engine from the AE Spec — Steps 3–6</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'var(--success-dim)', color:'var(--success)', fontWeight:700 }}>SPEC-EXACT</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:20 }}>
        {/* Left: Inputs */}
        <div>
          <div className="card" style={{ marginBottom:14 }}>
            <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}><Calculator size={14} style={{ marginRight:6, verticalAlign:'middle' }}/>Applicant Inputs</span></div>
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={S.label}>Credit Grade</label>
                <select style={S.select} value={form.creditGrade} onChange={e => set('creditGrade', e.target.value)}>
                  {Object.keys(GRADE_TABLE).map(g => <option key={g}>{g}</option>)}
                </select>
                {form.creditGrade && GRADE_TABLE[form.creditGrade] && (
                  <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)', display:'flex', gap:10 }}>
                    <span>Max: ${GRADE_TABLE[form.creditGrade].maxLoan.toLocaleString()}</span>
                    <span>Min APR: {GRADE_TABLE[form.creditGrade].minAPR}%</span>
                    <span>MaxTenor: {GRADE_TABLE[form.creditGrade].maxTenor}mo</span>
                  </div>
                )}
              </div>
              <div>
                <label style={S.label}>State</label>
                <select style={S.select} value={form.state} onChange={e => set('state', e.target.value)}>
                  {Object.keys(STATE_TABLE).sort().map(s => (
                    <option key={s} value={s}>{s}{STATE_TABLE[s].off ? ' (OFF)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Channel</label>
                <select style={S.select} value={form.channel} onChange={e => set('channel', e.target.value)}>
                  {Object.keys(CHANNEL_MAX).map(c => <option key={c}>{c}</option>)}
                </select>
                <div style={{ marginTop:4, fontSize:11, color:'var(--text-muted)' }}>Channel max: ${(CHANNEL_MAX[form.channel]||0).toLocaleString()}</div>
              </div>
              <div>
                <label style={S.label}>Requested Amount ($)</label>
                <input style={S.input} type="number" value={form.requestedAmount} onChange={e => set('requestedAmount', e.target.value)} />
              </div>
              <div>
                <label style={S.label}>Stated Monthly Income ($)</label>
                <input style={S.input} type="number" value={form.statedMonthlyIncome} onChange={e => set('statedMonthlyIncome', e.target.value)} />
                <div style={{ marginTop:4, fontSize:11, color:'var(--text-muted)' }}>
                  Effective: ${Math.min(Number(form.statedMonthlyIncome), 8333).toLocaleString()} (capped at $8,333)
                </div>
              </div>
              <div>
                <label style={S.label}>Fixed Obligations ($/mo)</label>
                <input style={S.input} type="number" value={form.fixedObligations} onChange={e => set('fixedObligations', e.target.value)} />
              </div>
              <button onClick={run} style={{
                padding:'11px', borderRadius:8, background:'var(--accent)', color:'#fff',
                border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                <Zap size={14} /> Calculate Offer
              </button>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          {!result && (
            <div className="card" style={{ minHeight:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:52, marginBottom:12, opacity:.2 }}>💰</div>
                <div style={{ fontWeight:600, fontSize:16 }}>Ready to Calculate</div>
                <div style={{ fontSize:13, marginTop:6 }}>Fill in applicant details and click Calculate Offer</div>
              </div>
            </div>
          )}

          {result?.error && (
            <div style={{ padding:'20px', borderRadius:12, background:'var(--danger-dim)', border:'2px solid rgba(220,38,38,.3)', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <XCircle size={22} color="var(--danger)"/>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:'var(--danger)' }}>No Offer Generated</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{result.error}</div>
                </div>
              </div>
            </div>
          )}

          {result && !result.error && (
            <>
              {/* Offer Card */}
              <div style={{ padding:'24px', borderRadius:12, background:'linear-gradient(135deg,var(--accent),#1D4ED8)', marginBottom:14, color:'#fff', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}/>
                <div style={{ position:'absolute', right:40, bottom:-30, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative' }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, opacity:.7, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>Maximum Loan Offer</div>
                    <div style={{ fontSize:48, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1 }}>
                      ${result.loanAmtWithoutFee.toLocaleString()}
                    </div>
                    <div style={{ fontSize:13, opacity:.8, marginTop:6 }}>Finance amount: ${result.finalFinanceAmount.toLocaleString()} · Orig fee: ${result.origFee.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, opacity:.7, marginBottom:4 }}>APR</div>
                    <div style={{ fontSize:28, fontWeight:800 }}>{result.APR}%</div>
                    <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>Grade: {result.creditGrade}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, marginTop:18, flexWrap:'wrap' }}>
                  <div style={{ background:'rgba(255,255,255,.12)', borderRadius:8, padding:'8px 14px' }}>
                    <div style={{ fontSize:10, opacity:.7 }}>TENOR OPTIONS</div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{result.tenorOptions.map(t=>`${t}mo`).join(' / ')}</div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,.12)', borderRadius:8, padding:'8px 14px' }}>
                    <div style={{ fontSize:10, opacity:.7 }}>MAX MONTHLY PMT</div>
                    <div style={{ fontWeight:700, fontSize:14 }}>${Math.round(result.maxAllowedPmt).toLocaleString()}</div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,.12)', borderRadius:8, padding:'8px 14px' }}>
                    <div style={{ fontSize:10, opacity:.7 }}>ORG FEE %</div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{(result.orgFeePct * 100).toFixed(2)}%</div>
                  </div>
                </div>
              </div>

              {/* L1-L7 Breakdown */}
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header" style={{ cursor:'pointer' }} onClick={() => setShowDetail(!showDetail)}>
                  <span style={{ fontWeight:700, fontSize:13 }}>L1–L7 Constraint Waterfall</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>Binding: {bindingL}</span>
                    {showDetail ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </div>
                </div>
                {showDetail && (
                  <div style={{ padding:'14px 16px' }}>
                    {[
                      { key:'L1', val:result.L1, formula:'Max Loan Amount for Credit Grade' },
                      { key:'L2', val:result.L2, formula:'State Max Loan Amount' },
                      { key:'L3', val:result.L3, formula:'Channel Max Loan Amount' },
                      { key:'L4', val:result.L4, formula:'Max loan for monthly pmt ≤ Grade max monthly payment' },
                      { key:'L5', val:result.L5, formula:'Max loan for monthly pmt ≤ 10% of monthly income' },
                      { key:'L6', val:result.L6, formula:'Max loan for monthly pmt ≤ 70% of income − fixed obligations' },
                      { key:'L7', val:result.L7, formula:'MAX(state min loan w/fee, requested + orig fee)' },
                    ].map(({ key, val, formula }) => (
                      <LConstraint key={key} label={key} value={val} formula={formula} isBinding={key === bindingL} />
                    ))}
                    <div style={{ marginTop:12, padding:'12px 14px', borderRadius:8, background:'var(--accent-dim)', border:'1.5px solid var(--accent)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:700, fontSize:13, color:'var(--accent)' }}>MIN(L1…L7) = Maximum Loan Offer</span>
                      <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:16, color:'var(--accent)' }}>${result.maxOffer.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Caps */}
              <div className="card">
                <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Payment Cap Logic (M1 / M2)</span></div>
                <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[
                    { label:'M1 — Grade Max Payment', value:`$${result.M1}` },
                    { label:'M2 — 70% Income − Obligations', value:`$${Math.round(result.M2).toLocaleString()}` },
                    { label:'Max Allowed Monthly Payment', value:`$${Math.round(result.maxAllowedPmt).toLocaleString()}`, accent:true },
                  ].map(c => (
                    <div key={c.label} style={{ padding:'12px 14px', borderRadius:8, background: c.accent ? 'var(--success-dim)' : 'var(--bg-card2)',
                      border:`1px solid ${c.accent ? 'rgba(5,150,105,.25)' : 'var(--border)'}` }}>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{c.label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:18, color: c.accent ? 'var(--success)' : 'var(--text)' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
