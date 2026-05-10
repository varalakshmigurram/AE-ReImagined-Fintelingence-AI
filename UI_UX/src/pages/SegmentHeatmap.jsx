import { useState, useEffect } from 'react'
import { Grid, RefreshCw, Info } from 'lucide-react'
import { getRules } from '../services/api'

const CHANNELS = ['CMPQ','CKPQ','QS','LT','ML','MO','CMACT']
const GRADES   = ['A1','A2','B1','B2','C1','C2','D1','D2','E1','E2','F']
const STATES   = ['AK','AZ','CA','CO','DE','FL','GA','HI','ID','IN','KS','KY','LA','MI','MN','MS','MT','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI']

// Canonical rule list from the AE spec
const SPEC_RULES = [
  { ruleId:'AE_INVALID_STATE',      segments:['ALL'] },
  { ruleId:'AE_INVALID_ADDRESS',    segments:['ALL'] },
  { ruleId:'AE_INVALID_REQUSET_AMOUNT', segments:['CMPQ','QS','ML','CKPQ','MO','LT'] },
  { ruleId:'AE_PTSMI',              segments:['ALL'] },
  { ruleId:'AE_LTI',                segments:['ALL'] },
  { ruleId:'AE_DEDUPE_DAYS',        segments:['ALL'] },
  { ruleId:'AE_NEGATIVE_FILE',      segments:['ALL'] },
  { ruleId:'AE_QS_Low_AnnualIncome_CreditRating', segments:['QS'] },
  { ruleId:'AE_ASSIGNED_CREDIT_SCORE', segments:['LT'] },
  { ruleId:'AE_TUSOFT_CV_SCORE',    segments:['ALL'] },
  { ruleId:'AE_RISK_RULE',          segments:['ML','QS','LT'] },
  { ruleId:'AE_THIN_FILE_RULE',     segments:['ALL'] },
  { ruleId:'AE_CLARITY_FRAUD',      segments:['ALL'] },
  { ruleId:'AE_GRADE_F',            segments:['ALL'] },
  { ruleId:'AE_GRADE_ASSIGNMENT',   segments:['ALL'] },
  { ruleId:'AE_PTSMI_E1_E2',        segments:['ML','MO','CKPQ','LT','QS'] },
  { ruleId:'AE_GRADE_F_POST',       segments:['ALL'] },
]

// Determine cell status for channel × rule
function cellStatus(ruleSegments, col) {
  if (ruleSegments.includes('ALL')) return 'applies'
  if (ruleSegments.some(s => s === col)) return 'override'
  return 'none'
}

// Determine cell status for grade × rule
function gradeStatus(ruleId, grade) {
  // Rules that apply to all grades
  const allGrade = ['AE_INVALID_STATE','AE_INVALID_ADDRESS','AE_INVALID_REQUSET_AMOUNT','AE_PTSMI','AE_LTI','AE_DEDUPE_DAYS','AE_NEGATIVE_FILE']
  if (allGrade.includes(ruleId)) return 'applies'
  if (ruleId === 'AE_GRADE_F' && grade === 'F') return 'override'
  if (ruleId === 'AE_GRADE_ASSIGNMENT') return 'applies'
  if (ruleId === 'AE_TUSOFT_CV_SCORE') return grade === 'E1' || grade === 'E2' ? 'override' : 'applies'
  if (ruleId === 'AE_PTSMI_E1_E2' && (grade === 'E1' || grade === 'E2')) return 'override'
  if (ruleId === 'AE_RISK_RULE') return ['D1','D2','E1','E2','F'].includes(grade) ? 'applies' : 'none'
  if (ruleId === 'AE_THIN_FILE_RULE') return ['D1','D2','E1','E2'].includes(grade) ? 'override' : 'applies'
  return 'none'
}

// Determine cell status for state × rule
function stateStatus(ruleId, state) {
  const febStates = ['AK','AR','AZ','CO','DE','FL','HI','IN','KS','KY','MN','MS','MT','MI','NC','NE','NM','NV','OH','OK','PA','RI','SC','SD','TN','TX','UT','VA','WA','WI','LA','GA','AL','ID']
  if (ruleId === 'AE_INVALID_STATE') return febStates.includes(state) ? 'applies' : 'none'
  const offStates = ['CO','NC','NE']
  if (offStates.includes(state)) return 'none'
  return 'applies'
}

const STATUS_STYLE = {
  applies:  { bg:'#DCFCE7', border:'#86EFAC', text:'#15803D', symbol:'✓' },
  override: { bg:'#FEF9C3', border:'#FDE047', text:'#854D0E', symbol:'△' },
  none:     { bg:'#F8FAFC', border:'#E2E8F0', text:'#CBD5E0', symbol:'—' },
}

function HeatmapCell({ status, tooltip }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.none
  return (
    <td title={tooltip} style={{
      padding:'5px 3px', textAlign:'center', minWidth:34,
      background:s.bg, borderBottom:'1px solid #E2E8F0', borderRight:'1px solid #E2E8F0',
    }}>
      <span style={{ fontSize:11, fontWeight:700, color:s.text }}>{s.symbol}</span>
    </td>
  )
}

export default function SegmentHeatmap() {
  const [view, setView] = useState('channel') // 'channel' | 'grade' | 'state'
  const [dbRules, setDbRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [hoverRule, setHoverRule] = useState(null)

  useEffect(() => {
    setLoading(true)
    getRules().then(r => setDbRules(r)).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  // Merge spec rules with db rules
  const displayRules = SPEC_RULES.map(sr => {
    const db = dbRules.find(r => r.ruleId === sr.ruleId)
    return { ...sr, dbStatus:db?.status, dbEnv:db?.environment, inDb:!!db }
  })

  const cols = view === 'channel' ? CHANNELS : view === 'grade' ? GRADES : STATES

  const getCellStatus = (rule, col) => {
    if (view === 'channel') return cellStatus(rule.segments, col)
    if (view === 'grade')   return gradeStatus(rule.ruleId, col)
    return stateStatus(rule.ruleId, col)
  }

  const legend = [
    { status:'applies',  label:'Applies' },
    { status:'override', label:'Segment Override / Special Logic' },
    { status:'none',     label:'Does not apply' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Segment Coverage Heatmap</div>
          <div className="page-subtitle">Visual matrix: which rules apply to which channels, grades, and states</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['channel','grade','state'].map(v => (
            <button key={v} onClick={()=>setView(v)} style={{
              padding:'7px 14px', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer',
              background: view===v ? 'var(--accent)' : 'var(--bg-card)',
              color: view===v ? '#fff' : 'var(--text-muted)',
              border:`1px solid ${view===v ? 'var(--accent)' : 'var(--border)'}`,
            }}>Rules × {v.charAt(0).toUpperCase()+v.slice(1)}{view===v && 's'}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {legend.map(l => (
          <div key={l.status} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            <div style={{ width:16, height:16, borderRadius:4,
              background:STATUS_STYLE[l.status].bg, border:`1px solid ${STATUS_STYLE[l.status].border}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color:STATUS_STYLE[l.status].text }}>
              {STATUS_STYLE[l.status].symbol}
            </div>
            <span style={{ color:'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
          <Info size={12}/> Click any rule to highlight row
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        {[
          { label:'Total Rules', val:displayRules.length, color:'var(--accent)' },
          { label:'In Database', val:displayRules.filter(r=>r.inDb).length, color:'var(--success)' },
          { label:'Spec Only', val:displayRules.filter(r=>!r.inDb).length, color:'var(--warning)' },
          { label:`${view.charAt(0).toUpperCase()+view.slice(1)} Dimensions`, val:cols.length, color:'var(--purple)' },
        ].map(s => (
          <div key={s.label} style={{ padding:'10px 16px', borderRadius:8, background:'var(--bg-card)',
            border:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:20, color:'var(--text-muted)' }}>
          <div className="spinner"/> Loading rules from database…
        </div>
      )}

      {/* Heatmap table */}
      <div className="card" style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11 }}>
          <thead>
            <tr style={{ background:'var(--bg-sidebar)' }}>
              <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:11, color:'rgba(148,163,184,.9)',
                minWidth:220, position:'sticky', left:0, background:'var(--bg-sidebar)', zIndex:2,
                borderRight:'2px solid rgba(255,255,255,.1)' }}>Rule ID</th>
              {cols.map(c => (
                <th key={c} style={{ padding:'8px 4px', fontWeight:700, fontSize:10, color:'rgba(148,163,184,.9)',
                  textAlign:'center', minWidth:34, borderRight:'1px solid rgba(255,255,255,.06)',
                  whiteSpace:'nowrap' }}>
                  {c.length > 4 ? c.slice(0,4) : c}
                </th>
              ))}
              <th style={{ padding:'8px 12px', fontWeight:700, fontSize:10, color:'rgba(148,163,184,.7)', minWidth:80 }}>DB Status</th>
            </tr>
          </thead>
          <tbody>
            {displayRules.map(rule => {
              const isHovered = hoverRule === rule.ruleId
              const applies = cols.filter(c => getCellStatus(rule,c) !== 'none').length
              const overrides = cols.filter(c => getCellStatus(rule,c) === 'override').length
              return (
                <tr key={rule.ruleId} onMouseEnter={()=>setHoverRule(rule.ruleId)} onMouseLeave={()=>setHoverRule(null)}
                  style={{ background: isHovered ? 'rgba(37,99,235,.04)' : 'transparent', cursor:'pointer' }}>
                  <td style={{ padding:'7px 14px', fontFamily:'var(--mono)', fontWeight:700, fontSize:11,
                    color: isHovered ? 'var(--accent)' : 'var(--text)',
                    position:'sticky', left:0, background: isHovered ? 'rgba(37,99,235,.06)' : 'var(--bg-card)',
                    borderRight:'2px solid var(--border)', zIndex:1 }}>
                    <div>{rule.ruleId}</div>
                    {overrides > 0 && (
                      <div style={{ fontSize:9, color:'var(--warning)', fontWeight:600 }}>
                        {overrides} segment override{overrides>1?'s':''}
                      </div>
                    )}
                  </td>
                  {cols.map(c => (
                    <HeatmapCell key={c} status={getCellStatus(rule,c)}
                      tooltip={`${rule.ruleId} × ${c}: ${getCellStatus(rule,c)}`}/>
                  ))}
                  <td style={{ padding:'7px 12px', whiteSpace:'nowrap' }}>
                    {rule.inDb ? (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                        background: rule.dbStatus==='APPROVED'?'var(--success-dim)':'var(--warning-dim)',
                        color: rule.dbStatus==='APPROVED'?'var(--success)':'var(--warning)' }}>
                        {rule.dbStatus||'IN DB'}
                      </span>
                    ) : (
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                        background:'var(--warning-dim)', color:'var(--warning)' }}>SPEC ONLY</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:14, fontSize:12, color:'var(--text-muted)', lineHeight:1.7 }}>
        <strong>Coverage summary for "{view}" view:</strong>&nbsp;
        {displayRules.length} rules × {cols.length} {view}s = {displayRules.length * cols.length} cells evaluated.&nbsp;
        <span style={{ color:'var(--success)' }}>✓ applies</span> = rule evaluates for this {view}.&nbsp;
        <span style={{ color:'#854D0E' }}>△ override</span> = rule applies with segment-specific logic.
      </div>
    </div>
  )
}
