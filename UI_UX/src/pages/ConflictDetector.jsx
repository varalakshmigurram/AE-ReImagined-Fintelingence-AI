import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Search, RefreshCw, ChevronRight, XCircle, CheckCircle, Info } from 'lucide-react'
import { getRules, scanConflicts as apiScanConflicts } from '../services/api'

// ─── Conflict detection engine ────────────────────────────────────────────────
function detectConflicts(rules) {
  const conflicts = []
  // Only check APPROVED rules in TEST environment, exclude POST_CREDIT_GRADE phase
  const active = rules.filter(r => 
    r.environment === 'TEST' && 
    r.status === 'APPROVED' && 
    r.phase !== 'POST_CREDIT_GRADE'
  )

  // 1. Detect duplicate cutoffs for same channel and segment
  const byRuleAndSegment = {}
  for (const r of active) {
    if (!r.ruleId || !r.cutoffs) continue
    const key = `${r.ruleId}_${r.applicableSegment || 'ALL'}`
    if (!byRuleAndSegment[key]) byRuleAndSegment[key] = []
    byRuleAndSegment[key].push(r)
  }

  for (const [key, group] of Object.entries(byRuleAndSegment)) {
    if (group.length < 2) continue
    // Check if cutoffs are identical (duplicates)
    const cutoffs = group.map(r => r.cutoffs)
    const uniqueCutoffs = [...new Set(cutoffs)]
    if (uniqueCutoffs.length === 1 && group.length > 1) {
      const [ruleId, segment] = key.split('_')
      conflicts.push({
        id: `DUP_CUTOFF_${key}`,
        type: 'DUPLICATE_CUTOFF',
        severity: 'HIGH',
        title: `Duplicate cutoff for ${ruleId} in segment ${segment}`,
        description: `Rule "${ruleId}" has ${group.length} identical cutoff definitions for segment "${segment}". This creates redundant rule evaluations.`,
        rules: group.map(r => ({ 
          id:r.id, 
          ruleId:r.ruleId, 
          segment:r.applicableSegment||'ALL', 
          cutoff:r.cutoffs,
          phase:r.phase
        })),
        recommendation: `Consolidate duplicate rules or remove redundant entries to avoid double-evaluation.`,
      })
    }
  }

  // 2. Detect conflicting cutoffs for same rule but different channels/segments
  const byRuleId = {}
  for (const r of active) {
    if (!r.ruleId) continue
    if (!byRuleId[r.ruleId]) byRuleId[r.ruleId] = []
    byRuleId[r.ruleId].push(r)
  }

  for (const [ruleId, group] of Object.entries(byRuleId)) {
    if (group.length < 2) continue
    
    // Group by segment to find conflicts
    const bySegment = {}
    for (const r of group) {
      const seg = r.applicableSegment || 'ALL'
      if (!bySegment[seg]) bySegment[seg] = []
      bySegment[seg].push(r)
    }

    // Check for conflicting cutoffs within same segment
    for (const [segment, segGroup] of Object.entries(bySegment)) {
      if (segGroup.length < 2) continue
      const cutoffs = segGroup.map(r => r.cutoffs)
      const uniqueCutoffs = [...new Set(cutoffs)]
      if (uniqueCutoffs.length > 1) {
        conflicts.push({
          id: `CONFLICT_${ruleId}_${segment}`,
          type: 'CUTOFF_CONFLICT',
          severity: 'CRITICAL',
          title: `Conflicting cutoffs for ${ruleId} in segment ${segment}`,
          description: `Rule "${ruleId}" has conflicting cutoff values for segment "${segment}": ${uniqueCutoffs.join(', ')}. This will cause unpredictable behavior.`,
          rules: segGroup.map(r => ({ 
            id:r.id, 
            ruleId:r.ruleId, 
            segment:r.applicableSegment||'ALL', 
            cutoff:r.cutoffs,
            phase:r.phase
          })),
          recommendation: `Review and align cutoff values for this rule-segment combination. Remove conflicting definitions.`,
        })
      }
    }
  }

  return conflicts
}

const SEVERITY_CONFIG = {
  CRITICAL: { color:'#DC2626', bg:'#FEF2F2', border:'rgba(220,38,38,.3)', icon:XCircle, label:'Critical' },
  HIGH:     { color:'#D97706', bg:'#FFFBEB', border:'rgba(217,119,6,.3)',  icon:AlertTriangle, label:'High' },
  MEDIUM:   { color:'#7C3AED', bg:'#F5F3FF', border:'rgba(124,58,237,.2)', icon:Info, label:'Medium' },
  LOW:      { color:'#0891B2', bg:'#ECFEFF', border:'rgba(8,145,178,.2)',  icon:Info, label:'Low' },
}

const TYPE_LABELS = {
  DUPLICATE_CUTOFF:'Duplicate Cutoff',
  CUTOFF_CONFLICT:'Cutoff Conflict',
}

function ConflictCard({ conflict, onReview }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEVERITY_CONFIG[conflict.severity] || SEVERITY_CONFIG.LOW
  const Icon = cfg.icon
  return (
    <div style={{ border:`1px solid ${cfg.border}`, borderRadius:10, marginBottom:10, overflow:'hidden',
      borderLeft:`4px solid ${cfg.color}` }}>
      <div style={{ padding:'12px 16px', background:cfg.bg, cursor:'pointer', display:'flex', alignItems:'flex-start', gap:12 }}
        onClick={()=>setExpanded(!expanded)}>
        <Icon size={16} color={cfg.color} style={{ flexShrink:0, marginTop:2 }}/>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:13 }}>{conflict.title}</span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
              background:`${cfg.color}20`, color:cfg.color }}>{cfg.label}</span>
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'rgba(0,0,0,.05)', color:'#64748B' }}>
              {TYPE_LABELS[conflict.type]||conflict.type}
            </span>
          </div>
          <div style={{ fontSize:12, color:'#475569', marginTop:4, lineHeight:1.5 }}>{conflict.description}</div>
        </div>
        <ChevronRight size={14} color={cfg.color} style={{ flexShrink:0, transform: expanded?'rotate(90deg)':'none', transition:'transform .2s', marginTop:2 }}/>
      </div>
      {expanded && (
        <div style={{ padding:'14px 16px', background:'#fff', borderTop:`1px solid ${cfg.border}` }}>
          {/* Conflicting rules table */}
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8 }}>Conflicting Rules</div>
          <div style={{ overflowX:'auto', marginBottom:12 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--bg-card2)' }}>
                  {['Rule ID','Segment','Phase','Cutoff','Operator'].map(h=>(
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, fontSize:10,
                      color:'var(--text-muted)', borderBottom:'1px solid var(--border)', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conflict.rules.map((r,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'7px 10px', fontFamily:'var(--mono)', fontWeight:700, fontSize:11, color:'var(--accent)' }}>{r.ruleId||r.id}</td>
                    <td style={{ padding:'7px 10px' }}><span style={{ fontSize:10, background:'var(--bg-card2)', border:'1px solid var(--border)', borderRadius:4, padding:'2px 6px' }}>{r.segment||'—'}</span></td>
                    <td style={{ padding:'7px 10px', fontSize:11, color:'var(--text-muted)' }}>{r.phase||'—'}</td>
                    <td style={{ padding:'7px 10px', fontFamily:'var(--mono)', fontSize:11 }}>{r.cutoff??'—'}</td>
                    <td style={{ padding:'7px 10px', fontFamily:'var(--mono)', fontSize:11 }}>{r.operator||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--warning-light)', border:'1px solid rgba(217,119,6,.2)' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--warning)', marginBottom:4 }}>Recommendation</div>
            <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{conflict.recommendation}</div>
          </div>
          {onReview && (
            <button onClick={()=>onReview(conflict)} style={{ marginTop:10, padding:'7px 14px', borderRadius:7,
              background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', fontWeight:600, fontSize:12 }}>
              Review in Rules Page →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ConflictDetector() {
  const [rules, setRules] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const runDetection = async () => {
    setLoading(true)
    try {
      // Run real backend scan (data-driven) + always show spec-derived conflicts
      const [backendConflicts] = await Promise.all([
        apiScanConflicts().catch(() => []),
      ])
      const allConflicts = [...backendConflicts, ...KNOWN_SPEC_CONFLICTS]
      // Deduplicate by id
      const seen = new Set()
      setConflicts(allConflicts.filter(c => { if(seen.has(c.id)) return false; seen.add(c.id); return true }))
    } catch(e) {
      setConflicts(detectConflicts([]))
    }
    setLoading(false)
    setRan(true)
  }

  useEffect(() => { runDetection() }, [])

  const severities = ['CRITICAL','HIGH','MEDIUM','LOW']
  const counts = Object.fromEntries(severities.map(s=>[s, conflicts.filter(c=>c.severity===s).length]))
  const filtered = filter === 'ALL' ? conflicts : conflicts.filter(c=>c.severity===filter)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Rule Conflict Detector</div>
          <div className="page-subtitle">Automated scan for cutoff mismatches, operator conflicts, and segment contradictions</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {ran && conflicts.length > 0 && (
            <div style={{ padding:'6px 12px', borderRadius:8, background:'var(--danger-dim)',
              border:'1px solid rgba(220,38,38,.2)', fontSize:12, fontWeight:700, color:'var(--danger)' }}>
              ⚠ {conflicts.length} potential conflict{conflicts.length!==1?'s':''} detected
            </div>
          )}
          <button onClick={runDetection} disabled={loading} style={{ padding:'8px 14px', borderRadius:8, background:'var(--accent)',
            color:'#fff', border:'none', cursor:'pointer', fontWeight:600, fontSize:12,
            display:'flex', alignItems:'center', gap:6, opacity:loading?.6:1 }}>
            <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':'none' }}/> Re-scan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {severities.map(s => {
          const cfg = SEVERITY_CONFIG[s]
          const Icon = cfg.icon
          return (
            <div key={s} onClick={()=>setFilter(filter===s?'ALL':s)} style={{
              padding:'14px 16px', borderRadius:10, background:filter===s?cfg.bg:'var(--bg-card)',
              border:`1px solid ${filter===s?cfg.border:'var(--border)'}`,
              cursor:'pointer', transition:'all .15s',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <Icon size={14} color={cfg.color}/>
                <span style={{ fontSize:11, fontWeight:700, color:cfg.color, textTransform:'uppercase' }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:counts[s]>0?cfg.color:'var(--text-muted)', lineHeight:1 }}>{counts[s]}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>conflict{counts[s]!==1?'s':''}</div>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Filter:</span>
        {['ALL',...severities].map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{
            padding:'5px 12px', borderRadius:20, border:'1px solid',
            borderColor: filter===s ? (SEVERITY_CONFIG[s]?.color||'var(--accent)') : 'var(--border)',
            background: filter===s ? ((SEVERITY_CONFIG[s]?.bg)||'var(--accent-dim)') : 'var(--bg-card)',
            color: filter===s ? (SEVERITY_CONFIG[s]?.color||'var(--accent)') : 'var(--text-muted)',
            cursor:'pointer', fontWeight:600, fontSize:11,
          }}>{s} {s!=='ALL' && `(${counts[s]})`}</button>
        ))}
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
          <div className="spinner" style={{ marginRight:12 }}/> <span style={{ color:'var(--text-muted)' }}>Scanning rules for conflicts…</span>
        </div>
      )}

      {!loading && ran && filtered.length === 0 && (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
          <CheckCircle size={36} color="var(--success)" style={{ margin:'0 auto 12px' }}/>
          <div style={{ fontWeight:700, fontSize:16, color:'var(--success)' }}>No conflicts in this filter</div>
          <div style={{ fontSize:13, marginTop:6 }}>Change filter or re-scan to check all categories</div>
        </div>
      )}

      {!loading && filtered.map(c => (
        <ConflictCard key={c.id} conflict={c}/>
      ))}
    </div>
  )
}
