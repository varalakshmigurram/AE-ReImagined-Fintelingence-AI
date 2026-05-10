import { useState } from 'react'
import { GitBranch, Info, ChevronRight, ChevronDown } from 'lucide-react'

// ─── Tree node definitions ────────────────────────────────────────────────────
const TREE = {
  id: 'root',
  label: 'Customer seen in last 30 days?',
  type: 'decision',
  ruleRef: 'AE_DEDUPE_DAYS',
  children: [
    {
      id: 'no',
      label: 'NO',
      type: 'branch-no',
      outcome: { label: 'Allow', color: '#059669', icon: '✓' },
      ruleRef: null,
    },
    {
      id: 'yes',
      label: 'YES',
      type: 'branch-yes',
      children: [
        {
          id: 'channel',
          label: 'Which channel?',
          type: 'decision',
          ruleRef: 'AE_DEDUPE_DAYS / AE_DEDUPE_QS',
          children: [
            {
              id: 'non-qs',
              label: 'All Channels except QS',
              type: 'branch',
              outcome: { label: 'Reject', color: '#DC2626', icon: '✖', detail: 'Not offered in any affiliate channel in last 30 days' },
              ruleRef: 'AE_DEDUPE_DAYS',
            },
            {
              id: 'qs',
              label: 'QS Channel',
              type: 'branch-special',
              children: [
                {
                  id: 'qs-prior-accept',
                  label: 'Prior QS accept in last 30 days + income unchanged?',
                  type: 'decision',
                  ruleRef: 'AE_DEDUPE_QS — Exception 1',
                  children: [
                    {
                      id: 'qs-pa-yes-3d',
                      label: 'Within 3 days of prior accept?',
                      type: 'decision',
                      children: [
                        { id:'qs-reuse', label:'YES', type:'branch', outcome:{ label:'Reuse Data', color:'#0891B2', icon:'↺', detail:'Reuse prior TU/CCR pull — no new data pull' }, ruleRef:'QS Exception 1a' },
                        { id:'qs-repull', label:'NO (3–30 days)', type:'branch', outcome:{ label:'Re-pull', color:'#7C3AED', icon:'↻', detail:'Income unchanged but >3 days — fresh data pull required' }, ruleRef:'QS Exception 1b' },
                      ],
                    },
                    { id:'qs-pa-no', label:'NO (income changed)', type:'branch', outcome:{ label:'Reject', color:'#DC2626', icon:'✖', detail:'Income changed — cannot reuse or allow' }, ruleRef:'QS Exception 1 — fail' },
                  ],
                },
                {
                  id: 'qs-prior-reject-internal',
                  label: 'Prior QS reject (internal/non-data rules) + income unchanged?',
                  type: 'decision',
                  ruleRef: 'AE_DEDUPE_QS — Exception 2',
                  children: [
                    { id:'qs-ri-yes', label:'YES', type:'branch', outcome:{ label:'Allow', color:'#059669', icon:'✓', detail:'Re-process: prior reject was due to internal checks only, income stable' }, ruleRef:'QS Exception 2 — allow' },
                    { id:'qs-ri-no', label:'NO', type:'branch', outcome:{ label:'Reject', color:'#DC2626', icon:'✖', detail:'Income changed or prior reject was data-driven' }, ruleRef:'QS Exception 2 — fail' },
                  ],
                },
                {
                  id: 'qs-prior-reject-data',
                  label: 'Prior QS reject (data-based rules) + income unchanged?',
                  type: 'decision',
                  ruleRef: 'AE_DEDUPE_QS — Exception 3',
                  children: [
                    { id:'qs-rd-yes', label:'YES', type:'branch', outcome:{ label:'Allow (re-pull)', color:'#059669', icon:'✓', detail:'Latest rejected lead was data-based — allow with fresh pull' }, ruleRef:'QS Exception 3 — allow' },
                    { id:'qs-rd-no', label:'NO', type:'branch', outcome:{ label:'Reject', color:'#DC2626', icon:'✖', detail:'Conditions not met' }, ruleRef:'QS Exception 3 — fail' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

// ─── Rendering helpers ────────────────────────────────────────────────────────
const NODE_COLORS = {
  decision: { bg:'#EFF6FF', border:'#2563EB', text:'#1D4ED8', header:'#2563EB' },
  'branch-special': { bg:'#F5F3FF', border:'#7C3AED', text:'#6D28D9', header:'#7C3AED' },
  branch: { bg:'#F8FAFC', border:'#CBD5E0', text:'#475569', header:'#64748B' },
  'branch-no': { bg:'#ECFDF5', border:'#059669', text:'#065F46', header:'#059669' },
  'branch-yes': { bg:'#FEF2F2', border:'#DC2626', text:'#991B1B', header:'#DC2626' },
}

function OutcomePill({ outcome }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20,
      background:`${outcome.color}15`, border:`1.5px solid ${outcome.color}`, marginTop:4 }}>
      <span style={{ fontSize:14, color:outcome.color }}>{outcome.icon}</span>
      <span style={{ fontWeight:800, fontSize:12, color:outcome.color }}>{outcome.label}</span>
      {outcome.detail && <span style={{ fontSize:10, color:outcome.color, opacity:.8 }}>— {outcome.detail}</span>}
    </div>
  )
}

function TreeNode({ node, depth = 0, activeNode, setActiveNode }) {
  const [expanded, setExpanded] = useState(true)
  const isActive = activeNode === node.id
  const cfg = NODE_COLORS[node.type] || NODE_COLORS.branch
  const hasChildren = node.children && node.children.length > 0

  if (node.outcome && !hasChildren) {
    // Leaf outcome node
    return (
      <div style={{ marginLeft: depth > 0 ? 24 : 0, marginTop: 8 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
          <div style={{ width:2, background:'var(--border)', alignSelf:'stretch', marginTop:8, marginLeft:6, flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:4 }}>{node.label}</div>
            <OutcomePill outcome={node.outcome}/>
            {node.ruleRef && (
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, fontFamily:'var(--mono)' }}>
                Ref: {node.ruleRef}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0, marginTop: 10 }}>
      {/* Node box */}
      <div
        onClick={() => { setActiveNode(isActive ? null : node.id); if(hasChildren) setExpanded(!expanded || !isActive) }}
        style={{
          borderRadius: 10, border: `2px solid ${isActive ? cfg.header : cfg.border}`,
          background: isActive ? `${cfg.header}08` : cfg.bg,
          cursor: 'pointer', overflow: 'hidden',
          boxShadow: isActive ? `0 0 0 3px ${cfg.header}25` : 'none',
          transition: 'all .15s',
        }}>
        <div style={{ padding:'8px 14px', background: cfg.header, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontWeight:700, fontSize:11, color:'#fff', letterSpacing:'.02em' }}>{node.type === 'branch-special' ? '⚡ QS CHANNEL EXCEPTIONS' : node.type.toUpperCase().replace(/-/g,' ')}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {node.ruleRef && <span style={{ fontSize:9, color:'rgba(255,255,255,.7)', fontFamily:'var(--mono)', background:'rgba(0,0,0,.2)', padding:'2px 6px', borderRadius:4 }}>{node.ruleRef}</span>}
            {hasChildren && (expanded ? <ChevronDown size={13} color="#fff"/> : <ChevronRight size={13} color="#fff"/>)}
          </div>
        </div>
        <div style={{ padding:'10px 14px' }}>
          <div style={{ fontWeight:600, fontSize:13, color:cfg.text }}>{node.label}</div>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div style={{ marginLeft:16, paddingLeft:14, borderLeft:`2px dashed ${cfg.border}`, marginTop:4 }}>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth+1} activeNode={activeNode} setActiveNode={setActiveNode}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Side-by-side flat rule list ──────────────────────────────────────────────
const RULES_FLAT = [
  { id:'AE_DEDUPE_DAYS', segment:'All Channels except QS', rule:'Customer seen in last 30 days and not offered → Reject', color:'#DC2626' },
  { id:'QS Exception 1a', segment:'QS', rule:'Prior accept <3 days, income unchanged → Reuse data, no re-pull', color:'#0891B2' },
  { id:'QS Exception 1b', segment:'QS', rule:'Prior accept 3–30 days, income unchanged → Allow but re-pull data', color:'#7C3AED' },
  { id:'QS Exception 2', segment:'QS', rule:'Prior reject (internal/non-data rules), income unchanged → Allow', color:'#059669' },
  { id:'QS Exception 3', segment:'QS', rule:'Prior reject (data-based rules), income unchanged → Allow (fresh pull)', color:'#059669' },
]

export default function DedupVisualiser() {
  const [activeNode, setActiveNode] = useState(null)
  const [view, setView] = useState('tree') // 'tree' | 'table'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dedup Rule Visualiser</div>
          <div className="page-subtitle">Interactive decision tree — AE_DEDUPE_DAYS with QS channel exception logic (Spec Rule 5 / 5a)</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['tree','table'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{
              padding:'7px 14px', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer',
              background:view===v?'var(--accent)':'var(--bg-card)',
              color:view===v?'#fff':'var(--text-muted)',
              border:`1px solid ${view===v?'var(--accent)':'var(--border)'}`,
            }}>{v==='tree'?'Decision Tree':'Flat Rule List'}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { color:'#2563EB', label:'Decision node' },
          { color:'#7C3AED', label:'QS exception block' },
          { color:'#059669', label:'Allow / pass outcome' },
          { color:'#DC2626', label:'Reject outcome' },
          { color:'#0891B2', label:'Reuse data outcome' },
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:l.color }}/>
            <span style={{ color:'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
          <Info size={12}/> Click any node to highlight it
        </div>
      </div>

      {view === 'tree' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
          {/* Tree */}
          <div className="card" style={{ overflowY:'auto', maxHeight:'calc(100vh - 240px)' }}>
            <div className="card-header">
              <span style={{ fontWeight:700, fontSize:13 }}>Dedup Decision Tree</span>
              <GitBranch size={15} color="var(--text-muted)"/>
            </div>
            <div style={{ padding:'14px 18px' }}>
              <TreeNode node={TREE} depth={0} activeNode={activeNode} setActiveNode={setActiveNode}/>
            </div>
          </div>

          {/* Info panel */}
          <div>
            <div className="card" style={{ marginBottom:14 }}>
              <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Spec Reference</span></div>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ fontSize:12, lineHeight:1.7, color:'var(--text-muted)' }}>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontWeight:700, color:'var(--text)', fontSize:13, marginBottom:4 }}>Rule 5 — All Channels</div>
                    <div>Customer already seen in last 30 days and not offered in any affiliate channel → <span style={{ color:'#DC2626', fontWeight:700 }}>REJECT</span></div>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text)', fontSize:13, marginBottom:6 }}>Rule 5a — QS Exceptions</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[
                        { n:1, text:'Prior QS accept in past 30 days, income unchanged → Reuse if ≤3 days, re-pull if >3 days', color:'#0891B2' },
                        { n:2, text:'Prior QS reject (internal non-data rules), income unchanged → Allow (re-process)', color:'#059669' },
                        { n:3, text:'Prior QS reject (data-based rules), income unchanged → Allow (fresh pull, latest rejected considered)', color:'#059669' },
                      ].map(e=>(
                        <div key={e.n} style={{ padding:'8px 10px', borderRadius:7, background:`${e.color}10`, border:`1px solid ${e.color}25` }}>
                          <div style={{ fontWeight:700, fontSize:11, color:e.color, marginBottom:2 }}>Exception {e.n}</div>
                          <div style={{ fontSize:11, lineHeight:1.5 }}>{e.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Key Business Logic</span></div>
              <div style={{ padding:'14px 16px' }}>
                {[
                  { q:'What defines "income unchanged"?', a:'Stated monthly income in current lead matches the most recent lead for the same customer.' },
                  { q:'What counts as "internal / non-data rules"?', a:'Rules that fire before any data pull — e.g. AE_PTSMI, AE_LTI, AE_INVALID_STATE.' },
                  { q:'Can data reuse save cost?', a:'Yes. Exception 1a (within 3 days) avoids a fresh TU/CCR pull, reducing bureau costs.' },
                ].map(i=>(
                  <div key={i.q} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:3 }}>Q: {i.q}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>A: {i.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'table' && (
        <div className="card">
          <div className="card-header"><span style={{ fontWeight:700, fontSize:13 }}>Flat Rule Reference Table</span></div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--bg-card2)' }}>
                {['Rule / Exception ID','Applicable Segment','Behaviour'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:10,
                    color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RULES_FLAT.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'var(--bg-card2)' }}>
                  <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontWeight:700, fontSize:11 }}>
                    <span style={{ color:r.color }}>{r.id}</span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                      background:`${r.color}12`, color:r.color, border:`1px solid ${r.color}30` }}>{r.segment}</span>
                  </td>
                  <td style={{ padding:'10px 14px', lineHeight:1.5, color:'var(--text-muted)' }}>{r.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
