import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Shield, MapPin, Radio, GitPullRequest, Clock,
  Zap, Cpu, FileSpreadsheet, Sliders, Hammer, GitBranch,
  Microscope, BarChart3, TrendingUp, Database, Activity, PlayCircle
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
      { to: '/cutoff-tracker',  icon: Database,        label: 'Cutoff Tracker' },
      { to: '/cutoff-builder',  icon: Sliders,         label: 'Cutoff Builder' },
      { to: '/offer-config',    icon: FileSpreadsheet, label: 'Offer Config Loader' },
      { to: '/embedded',        icon: Cpu,             label: 'Engine API Tester' },
      { to: '/config-versions', icon: GitBranch,       label: 'Version Manager' },
      { to: '/simulator',       icon: PlayCircle,      label: 'Rule Simulator' },
    ]
  }
]

export default function Sidebar({ pendingCount }) {
  return (
    <aside style={{ width:228, background:'#1C2333', display:'flex', flexDirection:'column', flexShrink:0, boxShadow:'2px 0 12px rgba(0,0,0,.18)', height:'100vh', overflowY:'auto' }}>
      {/* Logo */}
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, background:'linear-gradient(135deg,#2563EB,#1D4ED8)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(37,99,235,.4)' }}>
          <BarChart3 size={19} color="#fff"/>
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:'#F1F5F9', letterSpacing:'-0.01em', lineHeight:1.2 }}>AE Rule Engine</div>
          <div style={{ fontSize:10, color:'rgba(148,163,184,.6)', marginTop:1 }}>Applied Data Finance</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'8px 8px', flex:1 }}>
        {NAV.map(group => (
          <div key={group.label} style={{ marginBottom:4 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(100,116,139,.7)', textTransform:'uppercase', letterSpacing:'.1em', padding:'10px 10px 4px' }}>
              {group.label}
            </div>
            {group.items.map(({ to, icon: Icon, label, badge, highlight }) => (
              <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:9, padding:'7px 10px',
                borderRadius:8, marginBottom:1,
                color: isActive ? '#FFFFFF' : highlight ? '#FCD34D' : 'rgba(148,163,184,.8)',
                background: isActive ? 'rgba(37,99,235,.25)' : highlight ? 'rgba(252,211,77,.07)' : 'transparent',
                textDecoration:'none', fontSize:12.5, fontWeight: isActive ? 600 : 450,
                transition:'all .1s',
                borderLeft: isActive ? '2px solid #60A5FA' : '2px solid transparent',
              })}>
                <Icon size={13.5}/>
                <span style={{ flex:1 }}>{label}</span>
                {badge && pendingCount > 0 && (
                  <span style={{ background:'#EF4444', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{pendingCount}</span>
                )}
                {highlight && <span style={{ fontSize:8, background:'#D97706', color:'#fff', borderRadius:3, padding:'1px 4px', fontWeight:700 }}>NEW</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontSize:10, color:'rgba(148,163,184,.45)', lineHeight:1.7 }}>
          <div style={{ fontWeight:600 }}>v1.4.0 — ADF Hackathon</div>
          <div>Lead Analyst · Approver</div>
        </div>
      </div>
    </aside>
  )
}
