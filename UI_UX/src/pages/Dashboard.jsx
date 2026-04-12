import { useEffect, useState } from 'react'
import { getDashboardStats, getRecentActivity } from '../services/api'
import { Shield, MapPin, Radio, Clock, CheckCircle, AlertTriangle, Zap, Cpu, Database, FileSpreadsheet } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const ACTION_COLOR = {
  CREATED: 'var(--accent)', UPDATED: 'var(--warning)',
  APPROVED: 'var(--success)', REJECTED: 'var(--danger)',
  SUBMITTED_FOR_REVIEW: 'var(--purple)', PROMOTED_TO_PROD: 'var(--cyan)',
}
const ACTION_ICON = {
  CREATED: '✦', UPDATED: '✎', APPROVED: '✔', REJECTED: '✖',
  SUBMITTED_FOR_REVIEW: '⊙', PROMOTED_TO_PROD: '⚡',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentActivity()])
      .then(([s, a]) => { setStats(s); setActivity(a) })
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
          <div className="page-subtitle">AE Rule Engine — Comprehensive Overview</div>
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
        <StatCard icon={Shield} iconBg="var(--accent-dim)" iconColor="var(--accent)"
          value={stats?.totalRules ?? 0} label="Total Rules" sub={`${stats?.activeRules ?? 0} approved in TEST`} />
        <StatCard icon={AlertTriangle} iconBg="var(--warning-dim)" iconColor="var(--warning)"
          value={stats?.pendingReviews ?? 0} label="Pending Reviews" sub="Awaiting approval" urgent={stats?.pendingReviews > 0}
          onClick={() => navigate('/reviews')} />
        <StatCard icon={MapPin} iconBg="var(--purple-dim)" iconColor="var(--purple)"
          value={stats?.totalStates ?? 0} label="State Configs" sub={`${stats?.offStates ?? 0} states OFF`} />
        <StatCard icon={Zap} iconBg="var(--cyan-dim)" iconColor="var(--cyan)"
          value={stats?.prodRules ?? 0} label="In Production" sub="Live rules promoted" />
      </div>

      {/* ── Embedded Engine Stats ── */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Embedded Rule Engine</div>
      <div className="grid grid-4" style={{ marginBottom:24 }}>
        <StatCard icon={Cpu} iconBg="var(--success-dim)" iconColor="var(--success)"
          value={stats?.embeddedRulesActive ?? 0} label="Active Engine Rules"
          sub={stats?.activeBatchId ? 'Loaded in JVM cache' : 'No rules loaded yet'}
          onClick={() => navigate('/embedded')} />
        <StatCard icon={Database} iconBg="var(--warning-dim)" iconColor="var(--warning)"
          value={stats?.activeCutoffGroups ?? 0} label="Cutoff Groups" sub="Multi-dim cutoffs active"
          onClick={() => navigate('/cutoff-tracker')} />
        <StatCard icon={FileSpreadsheet} iconBg="var(--purple-dim)" iconColor="var(--purple)"
          value={stats?.offerConfigLoaded ? '✓' : '—'} label="Offer Config"
          sub={stats?.offerConfigLoaded ? 'Excel config loaded' : 'No config loaded yet'}
          onClick={() => navigate('/offer-config')} />
        <StatCard icon={Shield} iconBg="var(--accent-dim)" iconColor="var(--accent)"
          value={stats?.variableCount ?? 0} label="Variable Registry" sub="Known variables indexed"
          onClick={() => navigate('/embedded')} />
      </div>

      {/* ── Two-col layout ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
        {/* Activity feed */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight:600, fontSize:14 }}>Recent Activity</span>
            <Clock size={15} color="var(--text-muted)"/>
          </div>
          <div style={{ maxHeight:400, overflowY:'auto' }}>
            {activity.length === 0 ? (
              <div className="empty"><div>No activity yet</div></div>
            ) : activity.map(a => (
              <div key={a.id} style={{ padding:'11px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:11, alignItems:'flex-start' }}>
                <div style={{
                  width:28, height:28, borderRadius:8, flexShrink:0,
                  background:`color-mix(in srgb, ${ACTION_COLOR[a.action] ?? 'var(--accent)'} 14%, transparent)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, color:ACTION_COLOR[a.action] ?? 'var(--accent)',
                }}>{ACTION_ICON[a.action] ?? '○'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:'var(--text)', display:'flex', gap:5, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:600 }}>{a.performedBy}</span>
                    <span style={{ color:ACTION_COLOR[a.action] ?? 'var(--accent)', fontSize:11 }}>{a.action.replace(/_/g,' ')}</span>
                    <span className="tag">{a.entityType}</span>
                    <span style={{ color:'var(--text-muted)' }}>#{a.entityId}</span>
                  </div>
                  {a.comments && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, fontStyle:'italic' }}>"{a.comments}"</div>}
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                    {formatDistanceToNow(new Date(a.timestamp), { addSuffix:true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
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
                    <div style={{ fontSize:12, fontWeight:600 }}>{s.l}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.d}</div>
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
                    <div style={{ fontSize:12, fontWeight:600 }}>{s.l}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="card">
            <div className="card-header"><span style={{ fontWeight:600, fontSize:13 }}>Quick Actions</span></div>
            <div style={{ padding:'8px 12px' }}>
              {[
                {label:'📤 Upload Offer Config', to:'/offer-config', color:'var(--purple)'},
                {label:'🛠 Build Rules', to:'/rule-builder', color:'var(--accent)'},
                {label:'⚙ Cutoff Tracker', to:'/cutoff-tracker', color:'var(--warning)'},
                {label:'🔀 Review Queue', to:'/reviews', color:'var(--success)'},
                {label:'📦 Batch History', to:'/batch-history', color:'var(--cyan)'},
              ].map(q => (
                <div key={q.to} onClick={() => navigate(q.to)} style={{
                  padding:'8px 10px', borderRadius:7, marginBottom:4, cursor:'pointer',
                  fontSize:12, color:'var(--text-subtle)', display:'flex', alignItems:'center', gap:8,
                  transition:'all .1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background='var(--bg-hover)'; e.currentTarget.style.color='var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-subtle)' }}>
                  <span>{q.label}</span>
                  <span style={{ marginLeft:'auto', color:'var(--border-light)', fontSize:14 }}>›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon:Icon, iconBg, iconColor, value, label, sub, urgent, onClick }) {
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
      <div className="stat-value" style={{ color: urgent ? 'var(--warning)' : 'var(--text)' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}
