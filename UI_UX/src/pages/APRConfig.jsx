import { useState } from 'react'
import { Save, RotateCcw, Send, CheckCircle, Info, Percent } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Spec data ────────────────────────────────────────────────────────────────
const EB_BANDS = ['EB1','EB2','EB3','EB4','EB5']
const IB_BANDS = ['IB1','IB2','IB3','IB4','IB5','IB6','IB7','IB8','IB9','IB10']
const EB_LABELS = { EB1:'761–999',EB2:'681–760',EB3:'621–680',EB4:'581–620',EB5:'500–580' }
const IB_LABELS = { IB1:'891–999',IB2:'868–890',IB3:'845–867',IB4:'820–844',IB5:'796–819',IB6:'770–795',IB7:'742–769',IB8:'703–741',IB9:'647–702',IB10:'0–646' }

// Seed APR delta table from spec (higher EB = worse, higher IB = worse → more delta)
const SEED = {
  EB1: [  0,  5, 10, 15, 20, 25, 35, 45, 55, 65 ],
  EB2: [  5, 10, 15, 20, 25, 30, 40, 50, 60, 70 ],
  EB3: [ 10, 15, 20, 25, 30, 35, 45, 55, 65, 75 ],
  EB4: [ 15, 20, 25, 30, 35, 40, 50, 60, 70, 80 ],
  EB5: [ 20, 25, 30, 35, 40, 45, 55, 65, 75, 85 ],
}

function initTable() {
  const t = {}
  for (const eb of EB_BANDS) {
    t[eb] = {}
    IB_BANDS.forEach((ib, i) => { t[eb][ib] = SEED[eb][i] })
  }
  return t
}

function getDeltaColor(val, min, max) {
  const ratio = max === min ? 0 : (val - min) / (max - min)
  if (ratio < 0.33) return { bg:'rgba(5,150,105,.12)', border:'rgba(5,150,105,.3)', text:'#065F46' }
  if (ratio < 0.66) return { bg:'rgba(217,119,6,.10)', border:'rgba(217,119,6,.25)', text:'#92400E' }
  return { bg:'rgba(220,38,38,.10)', border:'rgba(220,38,38,.25)', text:'#991B1B' }
}

export default function APRConfig() {
  const [table, setTable] = useState(initTable())
  const [saved, setSaved] = useState(initTable())
  const [submitted, setSubmitted] = useState(false)
  const [focused, setFocused] = useState(null) // {eb, ib}

  const allVals = EB_BANDS.flatMap(eb => IB_BANDS.map(ib => table[eb][ib]))
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)

  const isDirty = (eb, ib) => table[eb][ib] !== saved[eb][ib]
  const anyDirty = EB_BANDS.some(eb => IB_BANDS.some(ib => isDirty(eb, ib)))

  const updateCell = (eb, ib, raw) => {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setTable(t => ({ ...t, [eb]: { ...t[eb], [ib]: v } }))
  }

  const reset = () => {
    setTable(initTable())
    setSaved(initTable())
    setSubmitted(false)
    toast.success('Table reset to spec defaults')
  }

  const save = () => {
    setSaved(JSON.parse(JSON.stringify(table)))
    toast.success('APR delta table saved as draft')
  }

  const submit = () => {
    setSubmitted(true)
    setSaved(JSON.parse(JSON.stringify(table)))
    toast.success('APR delta config submitted for review (DRAFT → PENDING)')
  }

  const dirtyCount = EB_BANDS.reduce((n, eb) => n + IB_BANDS.filter(ib => isDirty(eb, ib)).length, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">APR Delta Table Editor</div>
          <div className="page-subtitle">EB1–EB5 × IB1–IB10 APR delta grid — inline editing with risk gradient overlay</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {anyDirty && (
            <div style={{ padding:'5px 12px', borderRadius:8, background:'var(--warning-dim)',
              border:'1px solid rgba(217,119,6,.3)', fontSize:12, fontWeight:700, color:'var(--warning)' }}>
              {dirtyCount} unsaved change{dirtyCount!==1?'s':''}
            </div>
          )}
          {submitted && !anyDirty && (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8,
              background:'var(--success-dim)', border:'1px solid rgba(5,150,105,.25)', fontSize:12, fontWeight:700, color:'var(--success)' }}>
              <CheckCircle size={12}/> Submitted for review
            </div>
          )}
          <button onClick={reset} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)',
            background:'var(--bg-card)', color:'var(--text-muted)', cursor:'pointer', fontWeight:600, fontSize:12,
            display:'flex', alignItems:'center', gap:6 }}>
            <RotateCcw size={12}/> Reset
          </button>
          <button onClick={save} disabled={!anyDirty} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid',
            borderColor: anyDirty ? 'var(--accent)' : 'var(--border)',
            background: anyDirty ? 'var(--accent-dim)' : 'var(--bg-card)',
            color: anyDirty ? 'var(--accent)' : 'var(--text-muted)',
            cursor: anyDirty ? 'pointer' : 'default', fontWeight:600, fontSize:12,
            display:'flex', alignItems:'center', gap:6 }}>
            <Save size={12}/> Save Draft
          </button>
          <button onClick={submit} disabled={anyDirty || submitted} style={{ padding:'7px 14px', borderRadius:8,
            background: !anyDirty && !submitted ? 'var(--success)' : 'var(--bg-card2)',
            color: !anyDirty && !submitted ? '#fff' : 'var(--text-muted)',
            border:'none', cursor: !anyDirty && !submitted ? 'pointer' : 'default',
            fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
            <Send size={12}/> Submit for Review
          </button>
        </div>
      </div>

      {/* Legend + info */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
          <div style={{ width:14, height:14, borderRadius:3, background:'rgba(5,150,105,.12)', border:'1px solid rgba(5,150,105,.3)' }}/>
          <span style={{ color:'var(--text-muted)' }}>Low risk (low delta)</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
          <div style={{ width:14, height:14, borderRadius:3, background:'rgba(217,119,6,.10)', border:'1px solid rgba(217,119,6,.25)' }}/>
          <span style={{ color:'var(--text-muted)' }}>Medium risk</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
          <div style={{ width:14, height:14, borderRadius:3, background:'rgba(220,38,38,.10)', border:'1px solid rgba(220,38,38,.25)' }}/>
          <span style={{ color:'var(--text-muted)' }}>High risk (high delta)</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
          <div style={{ width:14, height:14, borderRadius:3, background:'var(--warning-dim)', border:'1px solid rgba(217,119,6,.5)' }}/>
          <span style={{ color:'var(--warning)', fontWeight:700 }}>Unsaved change</span>
        </div>
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
          <Info size={12}/> APR = Min APR for credit grade + delta from this table
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Min Delta', val:`${minVal}%`, color:'var(--success)' },
          { label:'Max Delta', val:`${maxVal}%`, color:'var(--danger)' },
          { label:'Avg Delta', val:`${(allVals.reduce((a,b)=>a+b,0)/allVals.length).toFixed(1)}%`, color:'var(--accent)' },
          { label:'Unsaved Cells', val:dirtyCount, color:dirtyCount>0?'var(--warning)':'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} style={{ padding:'12px 16px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color, fontFamily:'var(--mono)' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="card" style={{ overflowX:'auto' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:13 }}>APR Delta Matrix (APR delta in %)</span>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>→ Higher IB = weaker internal score = higher risk</span>
        </div>
        <table style={{ borderCollapse:'collapse', width:'100%' }}>
          <thead>
            <tr style={{ background:'var(--bg-card2)' }}>
              <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:11,
                color:'var(--text-muted)', minWidth:120, borderRight:'2px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
                EB \ IB<br/>
                <span style={{ fontSize:9, fontWeight:400 }}>Vantage \ V11</span>
              </th>
              {IB_BANDS.map((ib,i) => (
                <th key={ib} style={{ padding:'8px 6px', textAlign:'center', fontWeight:700, fontSize:10,
                  color:'var(--text-muted)', minWidth:72, borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--mono)', color:'var(--text)' }}>{ib}</div>
                  <div style={{ fontSize:9, fontWeight:400 }}>{IB_LABELS[ib]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EB_BANDS.map(eb => (
              <tr key={eb}>
                <td style={{ padding:'8px 14px', fontWeight:700, fontSize:11, borderRight:'2px solid var(--border)', borderBottom:'1px solid var(--border)', background:'var(--bg-card2)' }}>
                  <div style={{ fontFamily:'var(--mono)', color:'var(--text)' }}>{eb}</div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:400 }}>{EB_LABELS[eb]}</div>
                </td>
                {IB_BANDS.map(ib => {
                  const val = table[eb][ib]
                  const dirty = isDirty(eb, ib)
                  const isFocused = focused?.eb===eb && focused?.ib===ib
                  const colorStyle = dirty
                    ? { bg:'var(--warning-dim)', border:'rgba(217,119,6,.4)', text:'var(--warning)' }
                    : getDeltaColor(val, minVal, maxVal)
                  return (
                    <td key={ib} style={{ padding:'4px', borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)',
                      background: isFocused ? 'var(--accent-light)' : colorStyle.bg }}>
                      <div style={{ position:'relative' }}>
                        <input
                          value={val}
                          onFocus={() => setFocused({eb, ib})}
                          onBlur={() => setFocused(null)}
                          onChange={e => updateCell(eb, ib, e.target.value)}
                          style={{
                            width:64, padding:'5px 16px 5px 6px', borderRadius:6, textAlign:'center',
                            border:`1.5px solid ${isFocused ? 'var(--accent)' : dirty ? 'rgba(217,119,6,.5)' : colorStyle.border}`,
                            background:'transparent', fontSize:12, fontWeight:700, fontFamily:'var(--mono)',
                            color: colorStyle.text, outline:'none', cursor:'text',
                          }}
                        />
                        <span style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
                          fontSize:10, color:colorStyle.text, pointerEvents:'none' }}>%</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Workflow status */}
      <div className="card" style={{ marginTop:14 }}>
        <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Change Workflow</span></div>
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:0 }}>
          {[
            { label:'Edit Cells', active:anyDirty||dirtyCount===0, done:!anyDirty&&dirtyCount>0||submitted },
            { label:'Save Draft', active:!anyDirty&&!submitted&&dirtyCount>0, done:!anyDirty&&!submitted },
            { label:'Submit for Review', active:!anyDirty&&!submitted, done:submitted },
            { label:'Approve', active:false, done:false },
            { label:'Promote to Prod', active:false, done:false },
          ].map((step, i, arr) => (
            <div key={step.label} style={{ display:'flex', alignItems:'center', flex:1 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:4 }}>
                <div style={{ width:28, height:28, borderRadius:'50%',
                  background: step.done ? 'var(--success)' : step.active ? 'var(--accent)' : 'var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: step.done||step.active ? '#fff' : 'var(--text-muted)', fontWeight:800, fontSize:11 }}>
                  {step.done ? '✓' : i+1}
                </div>
                <div style={{ fontSize:10, fontWeight:600, color: step.done ? 'var(--success)' : step.active ? 'var(--accent)' : 'var(--text-muted)', textAlign:'center' }}>{step.label}</div>
              </div>
              {i < arr.length-1 && <div style={{ height:2, flex:1, background:'var(--border)', maxWidth:40 }}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
