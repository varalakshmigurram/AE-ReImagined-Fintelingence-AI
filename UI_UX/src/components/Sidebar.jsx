import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Shield, MapPin, Radio, GitPullRequest, Clock,
  Zap, Cpu, FileSpreadsheet, Sliders, Hammer, GitBranch,
  Microscope, BarChart3, TrendingUp, Database, Activity, PlayCircle,
  Calculator, Award, AlertTriangle, Grid, Lock, Percent, Share2, GitCommit
} from 'lucide-react'

const NAV = [
  {
    label: 'Config Management',
    items: [
      { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',icon: Activity,        label: 'Analytics' },
      { to: '/rules',    icon: Shield,           label: 'Rules' },
      { to: '/states',   icon: MapPin,           label: 'State Config' },
      { to: '/channels', icon: Radio,            label: 'Channel Config' },
      { to: '/reviews',  icon: GitPullRequest,   label: 'Review Queue', badge: true },
      { to: '/promote',  icon: Zap,              label: 'Promote to Prod' },
      { to: '/audit',    icon: Clock,            label: 'Version History Log' },
    ]
  },
  {
    label: 'AI Ingestion',
    items: [
      { to: '/uw-ingestion', icon: Microscope, label: 'UW Excel → Config', highlight: true },
    ]
  },
  {
    label: 'Embedded Rule Engine',
    items: [
      { to: '/rule-builder',    icon: Hammer,          label: 'Rule Builder' },
      { to: '/offer-config',    icon: FileSpreadsheet, label: 'Offer Config Loader' },
      { to: '/config-versions', icon: GitBranch,       label: 'Version Manager' },
    ]
  },
  {
    label: 'New Features',
    items: [
      { to: '/offer-calculator',  icon: Calculator,    label: 'Offer Calculator',    premium: true },
      { to: '/grade-calculator',  icon: Award,         label: 'Grade Engine',        premium: true },
      { to: '/conflict-detector', icon: AlertTriangle, label: 'Conflict Detector' },
      { to: '/segment-heatmap',   icon: Grid,          label: 'Segment Heatmap' },
      { to: '/bypass-manager',    icon: Lock,          label: 'Bypass Manager' },
      { to: '/apr-config',        icon: Percent,       label: 'APR Delta Editor' },
      { to: '/dedup-visualiser',  icon: Share2,        label: 'Dedup Visualiser' },
      { to: '/lineage-tracer',    icon: GitCommit,     label: 'Lineage Tracer' },
    ]
  },
]

export default function Sidebar({ pendingCount }) {
  return (
    <aside style={{ width:228, background:'#0F0F0F', display:'flex', flexDirection:'column', flexShrink:0, boxShadow:'2px 0 16px rgba(0,0,0,.4)', height:'100vh', overflowY:'auto' }}>
      {/* Logo */}
      <div style={{ padding:'16px 14px 14px', borderBottom:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', gap:11 }}>
        <img src="/src/assets/adf-logo.png" alt="ADF Logo" style={{ width:48, height:48, flexShrink:0, objectFit:'contain' }} />
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:'#FFFFFF', letterSpacing:'-0.02em', lineHeight:1.1 }}>AE Rule Engine</div>
          <div style={{ fontSize:10, color:'#D4AF37', marginTop:2, fontWeight:600 }}>Applied Data Finance</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'8px 8px', flex:1 }}>
        {NAV.map(group => (
          <div key={group.label} style={{ marginBottom:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#D4AF37', textTransform:'uppercase', letterSpacing:'.1em', padding:'10px 10px 4px', opacity:0.95 }}>
              {group.label}
            </div>
            {group.items.map(({ to, icon: Icon, label, badge, highlight, premium }) => (
              <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:9, padding:'9px 11px',
                borderRadius:8, marginBottom:2,
                color: isActive ? '#FFFFFF' : premium ? '#D4AF37' : '#C0C0C0',
                background: isActive ? 'rgba(212,175,55,.3)' : premium ? 'rgba(212,175,55,.15)' : 'transparent',
                textDecoration:'none', fontSize:14, fontWeight: isActive ? 600 : 500,
                transition:'all .15s',
                borderLeft: isActive ? '3px solid #D4AF37' : '3px solid transparent',
                animation: premium ? 'premium-glow 2s ease-in-out infinite' : 'none',
              })}>
                <Icon size={15}/>
                <span style={{ flex:1 }}>{label}</span>
                {badge && pendingCount > 0 && (
                  <span style={{ background:'#EF4444', color:'#fff', borderRadius:10, padding:'2px 7px', fontSize:10, fontWeight:700 }}>{pendingCount}</span>
                )}
                {premium && <span style={{ fontSize:9, background:'#D4AF37', color:'#0F0F0F', borderRadius:3, padding:'3px 6px', fontWeight:700, animation:'premium-pulse 1.5s ease-in-out infinite' }}>⭐</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ fontSize:11, color:'#D4AF37', lineHeight:1.7, opacity:0.9 }}>
          <div style={{ fontWeight:600 }}>v2.0.0 — ADF Hackathon</div>
          <div style={{ fontSize:10, color:'#B0B0B0' }}>Lead Analyst · Approver</div>
        </div>
      </div>
    </aside>
  )
}
