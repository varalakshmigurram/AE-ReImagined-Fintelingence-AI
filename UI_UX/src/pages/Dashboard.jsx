import { useEffect, useState } from 'react'
import { getDashboardStats } from '../services/api'
import { Shield, MapPin, Radio, AlertTriangle, Zap, Cpu, Database, FileSpreadsheet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getDashboardStats()
      .then(s => setStats(s))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spinner"/>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>

        </div>
        {stats?.activeBatchId && (
          <div style={{ background:'var(--success-dim)', border:'1px solid rgba(34,197,94,.2)', borderRadius:8, padding:'8px 14px', fontSize:11 }}>
            <div style={{ fontWeight:700, color:'var(--success)' }}>EMBEDDED ENGINE ACTIVE</div>
            <div style={{ fontFamily:'var(--mono)', color:'var(--text-subtle)', marginTop:1 }}>{stats.activeBatchId?.slice(0,16)}…</div>
          </div>
        )}
      </div>

      {/* ── Config Management Stats ── */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Config Management</div>
      <div className="grid grid-4" style={{ marginBottom:20 }}>
        <StatCard icon={Shield} iconBg="rgba(37,99,235,0.15)" iconColor="rgb(37,99,235)"
          value={stats?.totalRules ?? 0} label="Total Rules" sub={`${stats?.activeRules ?? 0} approved in TEST`}
          onClick={() => navigate('/rules')} />
        <StatCard icon={AlertTriangle} iconBg="rgba(245,158,11,0.15)" iconColor="rgb(245,158,11)"
          value={stats?.pendingReviews ?? 0} label="Pending Reviews" sub="Awaiting approval" urgent={stats?.pendingReviews > 0}
          onClick={() => navigate('/reviews')} />
        <StatCard icon={MapPin} iconBg="rgba(147,51,234,0.15)" iconColor="rgb(147,51,234)"
          value={stats?.totalStates ?? 0} label="State Configs" sub={`${stats?.offStates ?? 0} states OFF`}
          onClick={() => navigate('/states')} />
        <StatCard icon={Zap} iconBg="rgba(6,182,212,0.15)" iconColor="rgb(6,182,212)"
          value={stats?.prodRules ?? 0} label="In Production" sub="Live rules promoted"
          onClick={() => navigate('/promote')} />
      </div>

      {/* ── Embedded Engine Stats ── */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Embedded Rule Engine</div>
      <div className="grid grid-4" style={{ marginBottom:24 }}>
        <StatCard icon={Cpu} iconBg="rgba(34,197,94,0.15)" iconColor="rgb(34,197,94)"
          value={stats?.embeddedRulesActive ?? 0} label="Active Engine Rules"
          sub={stats?.activeBatchId ? 'Loaded in JVM cache' : 'No rules loaded yet'}
          onClick={() => navigate('/embedded')} />
        <StatCard icon={Database} iconBg="rgba(245,158,11,0.15)" iconColor="rgb(245,158,11)"
          value={stats?.activeCutoffGroups ?? 0} label="Cutoff Groups" sub="Multi-dim cutoffs active"
          onClick={() => navigate('/cutoff-tracker')} />
        <StatCard icon={FileSpreadsheet} iconBg="rgba(147,51,234,0.15)" iconColor="rgb(147,51,234)"
          value={stats?.offerConfigLoaded ? '✓' : '—'} label="Offer Config"
          sub={stats?.offerConfigLoaded ? 'Excel config loaded' : 'No config loaded yet'}
          onClick={() => navigate('/offer-config')} />
        <StatCard icon={Radio} iconBg="rgba(37,99,235,0.15)" iconColor="rgb(37,99,235)"
          value={stats?.totalChannels ?? 0} label="Channel Config" sub="Channels configured"
          onClick={() => navigate('/channels')} />
      </div>

      {/* ── Quick Actions (moved up for easy navigation) ── */}
      <div style={{ marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Quick Actions — New Features</span></div>
          <div style={{ padding:'8px 12px', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {[
              {label:'Offer Calculator', to:'/offer-calculator'},
              {label:'Grade Engine', to:'/grade-calculator'},
              {label:'Conflict Detector', to:'/conflict-detector'},
              {label:'Segment Heatmap', to:'/segment-heatmap'},
              {label:'Bypass Manager', to:'/bypass-manager'},
              {label:'APR Delta Editor', to:'/apr-config'},
              {label:'Dedup Visualiser', to:'/dedup-visualiser'},
              {label:'Lineage Tracer', to:'/lineage-tracer'},
            ].map(q => (
              <div key={q.to} onClick={() => navigate(q.to)} style={{
                padding:'12px 10px', borderRadius:8, cursor:'pointer',
                fontSize:12, color:'#000', fontWeight:700, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                transition:'all .15s', background:'var(--bg-card2)', border:'1px solid var(--border)',
                textAlign:'center'
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(37,99,235,0.1)'; e.currentTarget.style.color='rgb(37,99,235)'; e.currentTarget.style.borderColor='rgb(37,99,235)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(37,99,235,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--bg-card2)'; e.currentTarget.style.color='#000'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}>
                <span>{q.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Workflow guides ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Left column - Workflows */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Workflow */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Config Change Workflow</span></div>
            <div style={{ padding:'14px 16px' }}>
              {[
                {n:1,l:'Edit Config',d:'Lead Analyst updates rule / cutoff',c:'var(--accent)'},
                {n:2,l:'Submit Review',d:'Enters reviewer queue with diff',c:'var(--purple)'},
                {n:3,l:'Approve',d:'Manager reviews field-level diff',c:'var(--warning)'},
                {n:4,l:'Promote to Prod',d:'Config deployed live',c:'var(--success)'},
              ].map(s => (
                <div key={s.n} style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background:`color-mix(in srgb, ${s.c} 15%, transparent)`,
                    border:`1.5px solid ${s.c}`, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, color:s.c }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#000' }}>{s.l}</div>
                    <div style={{ fontSize:11, color:'#000', fontWeight:600 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded Engine Workflow */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Embedded Engine Pipeline</span></div>
            <div style={{ padding:'14px 16px' }}>
              {[
                {n:1,l:'Build Rules',d:'Visual builder or JSON editor',c:'var(--cyan)'},
                {n:2,l:'SpEL Translate',d:'Description → auto-translated expression',c:'var(--warning)'},
                {n:3,l:'Save & Compile',d:'Validation → batchId → JVM cache',c:'var(--accent)'},
                {n:4,l:'Execute',d:'Provider-filtered fact evaluation',c:'var(--success)'},
              ].map(s => (
                <div key={s.n} style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background:`color-mix(in srgb, ${s.c} 15%, transparent)`,
                    border:`1.5px solid ${s.c}`, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, color:s.c }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#000' }}>{s.l}</div>
                    <div style={{ fontSize:11, color:'#000', fontWeight:600 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Changes */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Recent Changes</span></div>
            <div style={{ padding:'12px 16px' }}>
              {[
                {action:'Rule Updated', by:'lead-analyst', time:'2 hours ago', type:'RULES'},
                {action:'Cutoff Saved', by:'analyst-2', time:'4 hours ago', type:'CUTOFFS'},
                {action:'Config Approved', by:'manager-1', time:'1 day ago', type:'APPROVAL'},
                {action:'Promoted to PROD', by:'admin', time:'2 days ago', type:'PROMOTION'},
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:10, borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize:11 }}>
                  <div>
                    <div style={{ fontWeight:700, color:'#000' }}>{item.action}</div>
                    <div style={{ fontSize:10, color:'#000', marginTop:2, fontWeight:600 }}>by {item.by}</div>
                  </div>
                  <div style={{ color:'#000', fontSize:10, fontWeight:600 }}>{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Key Metrics & Tips */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* System Health */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>System Health</span></div>
            <div style={{ padding:'14px 16px' }}>
              {[
                {label:'Engine Status', value: stats?.activeBatchId ? '✓ Active' : '⊘ Idle', color: stats?.activeBatchId ? 'var(--success)' : 'var(--text-muted)'},
                {label:'Config Sync', value: stats?.totalRules > 0 ? '✓ Synced' : '⊘ Pending', color: stats?.totalRules > 0 ? 'var(--success)' : 'var(--warning)'},
                {label:'Pending Reviews', value: stats?.pendingReviews > 0 ? `⚠ ${stats.pendingReviews}` : '✓ None', color: stats?.pendingReviews > 0 ? 'var(--warning)' : 'var(--success)'},
                {label:'Cutoff Updates', value: stats?.activeCutoffGroups > 0 ? `✓ ${stats.activeCutoffGroups}` : '⊘ None', color: 'var(--accent)'},
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:10, borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:12, color:'#000', fontWeight:700 }}>{item.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Getting Started</span></div>
            <div style={{ padding:'12px 16px', fontSize:12, lineHeight:1.6, color:'#000' }}>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontWeight:700, color:'#000', marginBottom:4 }}>1. Build Rules</div>
                <div style={{ color:'#000', fontWeight:600 }}>Use Rule Builder to create rules with visual editor or JSON</div>
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontWeight:700, color:'#000', marginBottom:4 }}>2. Validate & Test</div>
                <div style={{ color:'#000', fontWeight:600 }}>Test rules in Simulator before promoting to production</div>
              </div>
              <div>
                <div style={{ fontWeight:700, color:'#000', marginBottom:4 }}>3. Deploy</div>
                <div style={{ color:'#000', fontWeight:600 }}>Submit for review, get approval, then promote to PROD</div>
              </div>
            </div>
          </div>

          {/* Key Stats Summary */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Key Metrics</span></div>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ textAlign:'center', padding:'10px', background:'var(--bg-card2)', borderRadius:6 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--accent)' }}>{stats?.totalRules ?? 0}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Total Rules</div>
                </div>
                <div style={{ textAlign:'center', padding:'10px', background:'var(--bg-card2)', borderRadius:6 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--success)' }}>{stats?.prodRules ?? 0}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>In Production</div>
                </div>
                <div style={{ textAlign:'center', padding:'10px', background:'var(--bg-card2)', borderRadius:6 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--warning)' }}>{stats?.pendingReviews ?? 0}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Pending</div>
                </div>
                <div style={{ textAlign:'center', padding:'10px', background:'var(--bg-card2)', borderRadius:6 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--cyan)' }}>{stats?.activeCutoffGroups ?? 0}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Cutoffs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon:Icon, iconBg, iconColor, value, label, sub, urgent, onClick }) {
  const [displayValue, setDisplayValue] = useState(value)
  
  useEffect(() => {
    if (typeof value !== 'number' || value === 0) {
      setDisplayValue(value)
      return
    }
    
    let animationFrame
    let startTime
    const duration = 800
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const currentValue = Math.floor(value * progress)
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value])
  
  return (
    <div className="stat-card" onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: urgent ? 'var(--warning)' : undefined,
        boxShadow: urgent ? '0 0 0 1px rgba(245,158,11,.2)' : undefined,
        transition:'transform .1s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform='translateY(-1px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform='none')}>
      <div className="stat-icon" style={{ background:iconBg }}><Icon size={16} color={iconColor}/></div>
      <div className="stat-value" style={{ color: urgent ? 'var(--warning)' : 'var(--text)' }}>{displayValue}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}
