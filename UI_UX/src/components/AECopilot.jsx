import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, X, Send, Bot, User, ChevronRight, Sparkles, RotateCcw } from 'lucide-react'

// ─── Knowledge base ────────────────────────────────────────────────────────────
const ROUTES = {
  '/':                { label: 'Dashboard',              desc: 'Overview, KPIs, and quick actions' },
  '/analytics':       { label: 'Analytics',              desc: 'Charts, governance metrics, channel performance' },
  '/rules':           { label: 'Rules',                  desc: 'View and edit all AE decision rules' },
  '/rule-builder':    { label: 'Rule Builder',           desc: 'Build rules using 3-step guided popups' },
  '/states':          { label: 'State Config',           desc: 'FEB state eligibility and loan constraints' },
  '/channels':        { label: 'Channel Config',         desc: 'CMPQ, CKPQ, QS, LT, ML, MO settings' },
  '/reviews':         { label: 'Review Queue',           desc: 'Rules waiting for Approver sign-off' },
  '/promote':         { label: 'Promote to Prod',        desc: 'Push approved rules to production' },
  '/audit':           { label: 'Version History Log',    desc: 'Full audit trail of all changes' },
  '/uw-ingestion':    { label: 'UW Excel → Config',      desc: 'AI-powered Excel spec ingestion' },
  '/cutoff-tracker':  { label: 'Cutoff Tracker',         desc: 'Production cutoff table by grade/channel/state' },
  '/cutoff-builder':  { label: 'Cutoff Builder',         desc: 'Create multi-dimensional cutoff groups' },
  '/offer-config':    { label: 'Offer Config Loader',    desc: 'Load Excel offer config into the engine' },
  '/embedded':        { label: 'Engine API Tester',      desc: 'Test rule execution with custom fact sets' },
  '/config-versions': { label: 'Version Manager',        desc: 'Flyway-style semantic version history' },
  '/simulator':       { label: 'Rule Impact Simulator',  desc: 'Simulate applicant profiles against active rules' },
}

const CHANNEL_NAMES = {
  CMPQ:'Credit Match Pre-Qualify', CKPQ:'Credit Karma Pre-Qualify',
  QS:'Quin Street', LT:'Lending Tree', ML:'Money Lion', MO:'Monevo', CMACT:'Credit Match ACT',
}

// ─── Intent detection ─────────────────────────────────────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase()

  // Navigation intents
  const navMap = [
    { patterns:['dashboard','home','overview','kpi','summary'],         route:'/' },
    { patterns:['analytic','chart','metric','report','graph','intel'],  route:'/analytics' },
    { patterns:['rule builder','build rule','create rule','new rule','popup','clause'], route:'/rule-builder' },
    { patterns:['rules','decision rule','ae rule','all rule'],           route:'/rules' },
    { patterns:['state','feb state','eligib','state config'],            route:'/states' },
    { patterns:['channel','cmpq','ckpq','quin street','lending tree','money lion','monevo'], route:'/channels' },
    { patterns:['review','pending','approver','approve','reject','queue'], route:'/reviews' },
    { patterns:['promote','production','prod','deploy'],                  route:'/promote' },
    { patterns:['audit','history','version log','change log','trail'],   route:'/audit' },
    { patterns:['uw','excel','ingestion','yellow cell','spec','upload'],  route:'/uw-ingestion' },
    { patterns:['cutoff tracker','cutoff table','production cutoff','grade cutoff'], route:'/cutoff-tracker' },
    { patterns:['cutoff builder','cutoff group','add cutoff','new cutoff'], route:'/cutoff-builder' },
    { patterns:['offer config','offer logic','excel offer'],             route:'/offer-config' },
    { patterns:['engine','api tester','execute','simulate','test rule'], route:'/simulator' },
    { patterns:['version manager','flyway','semantic version','collision'], route:'/config-versions' },
    { patterns:['simulator','impact','applicant','profile','scenario'],  route:'/simulator' },
  ]

  for (const {patterns, route} of navMap) {
    if (patterns.some(p => t.includes(p))) return { type:'navigate', route }
  }

  // Question intents
  if (t.includes('what is') || t.includes('what are') || t.includes('explain') || t.includes('how does') || t.includes('what does')) {
    if (t.includes('ae rule') || t.includes('affiliate engine')) return { type:'explain', topic:'ae_engine' }
    if (t.includes('cutoff')) return { type:'explain', topic:'cutoff' }
    if (t.includes('flyway') || t.includes('version')) return { type:'explain', topic:'versioning' }
    if (t.includes('uw') || t.includes('excel')) return { type:'explain', topic:'uw_ingestion' }
    if (t.includes('rule builder') || t.includes('popup')) return { type:'explain', topic:'rule_builder' }
    if (t.includes('channel')) return { type:'explain', topic:'channels' }
    if (t.includes('approval') || t.includes('workflow')) return { type:'explain', topic:'workflow' }
    if (t.includes('simulator') || t.includes('impact')) return { type:'explain', topic:'simulator' }
  }

  if (t.includes('help') || t.includes('what can') || t.includes('guide')) return { type:'help' }

  return { type:'unknown' }
}

// ─── Response generator ────────────────────────────────────────────────────────
function generateResponse(intent, text, navigate) {
  const t = text.toLowerCase()

  if (intent.type === 'navigate') {
    const page = ROUTES[intent.route]
    return {
      text: `Navigating you to **${page.label}** — ${page.desc}.`,
      navigate: intent.route,
      chip: page.label,
    }
  }

  if (intent.type === 'explain') {
    const explanations = {
      ae_engine: `The **Affiliate Engine (AE)** is ADF's core loan decisioning system. It evaluates applicants from affiliate partners (Quin Street, Lending Tree, Money Lion, etc.) against a matrix of credit rules — checking vantage scores, income ratios, thin-file indicators, fraud scores, and state eligibility — to produce an offer, decline, or referral decision.\n\nThis platform manages all AE rules with version control, approval workflows, and AI-assisted configuration.`,
      cutoff: `**Cutoffs** are numeric thresholds used in AE rules. For example, "AE_TUSOFT_CV_SCORE: if CV score < 500, reject." Cutoffs are multi-dimensional — the threshold can vary by **creditGrade × channel × state**.\n\nThe **Cutoff Tracker** stores every cutoff as an individual DB row so you can query: "What is the cvScoreCutoff for grade A1, channel CKPQ, state TX right now?"`,
      versioning: `The **Version Manager** implements Flyway-style semantic versioning (x.y.z) for all config saves:\n• x = code deploy needed (new model, new field)\n• y = value-only change (safe to promote directly)\n• z = QA/test only\n\nIf two analysts try to save as version 1.2.0 for the same scope, the second save is immediately rejected with a suggestion to use 1.2.1.`,
      uw_ingestion: `The **UW Excel → Config** module is the AI flagship feature. It:\n1. Reads the UW Analytics Excel spec (AE_Sample_Spec.xlsx)\n2. Detects yellow-highlighted cells (FFFFFF00 fill) — the UW team's change annotations\n3. Cross-checks each highlighted rule against the ae_rules config table\n4. Generates typed AI suggestions: CUTOFF_CHANGE, OPERATOR_CHANGE, FIELD_RENAME, ADD_RULE, REMOVE_RULE, CHANNEL_EXTENSION\n5. Shows a before/after diff and lets you apply each change with one click.`,
      rule_builder: `The **Rule Builder** uses a 3-step guided popup system:\n• **Step ①** — Pick a variable from the typed registry (tu.vantageScore, de.creditGrade, contact.state…)\n• **Step ②** — Pick the condition operator (less than, greater than, between, is one of…)\n• **Step ③** — Enter the value — fixed number or a runtime-resolved cutoff reference\n\nNo code required. The builder compiles a human-readable sentence and the condition expression simultaneously. Popups use portal rendering to avoid clipping in overflow containers.`,
      channels: `ADF has 7 affiliate channels:\n• **CMPQ** — Credit Match Pre-Qualify\n• **CKPQ** — Credit Karma Pre-Qualify\n• **QS** — Quin Street\n• **LT** — Lending Tree\n• **ML** — Money Lion\n• **MO** — Monevo\n• **CMACT** — Credit Match ACT\n\nEach channel can have different loan constraints (min/max loan, APR, term) and channel-specific rule overrides.`,
      workflow: `The approval workflow is:\n1. **Lead Analyst** creates/edits a rule → status: DRAFT\n2. Lead Analyst submits for review → PENDING_REVIEW\n3. **Approver** sees field-level before/after diff, approves or rejects\n4. Approved rules can be promoted to PROD by the Approver\n5. Every step is logged in the Version History Log\n\nThe Review Queue shows all pending items with colour-coded diffs.`,
      simulator: `The **Rule Impact Simulator** lets you build a hypothetical applicant profile and see how the current AE rules would evaluate them:\n• Set credit score, income, state, channel, segment flags\n• Run against the active rule bundle\n• See which rules FIRE, which PASS, which are SKIPPED (missing provider)\n• Understand the decision path before deploying real changes.`,
    }
    const resp = explanations[intent.topic]
    return { text: resp || `I can explain that! Could you be a bit more specific about what aspect you'd like to understand?` }
  }

  if (intent.type === 'help') {
    return {
      text: `I'm the **AE Buddiee** — your AI guide to the AE Rule Engine. I can:\n\n• **Navigate** you to any page — just say "take me to the Review Queue" or "open Rule Builder"\n• **Explain** concepts — ask "What is a cutoff?" or "How does the UW ingestion work?"\n• **Guide** your workflow — ask "How do I approve a rule?" or "Where do I upload the Excel spec?"\n\nWhat would you like to do?`,
      suggestions: ['Show me the Analytics', 'How do I build a rule?', 'Take me to Review Queue', 'What is UW ingestion?', 'Open the Simulator'],
    }
  }

  // Fallback with suggestions
  const suggestions = Object.entries(ROUTES).slice(0, 5).map(([, v]) => v.label)
  return {
    text: `I'm not sure I understood that. I can help you navigate to any part of the AE Rule Engine, explain concepts, or guide you through workflows. Try asking:\n• "Take me to the Rule Builder"\n• "What is a cutoff?"\n• "How does approval work?"`,
    suggestions: ['Show Analytics', 'Open Rule Builder', 'UW Excel ingestion', 'Review Queue', 'Cutoff Tracker'],
  }
}

// ─── Message renderer ─────────────────────────────────────────────────────────
function MessageText({ text }) {
  // Simple bold rendering for **text**
  const parts = text.split(/(\*\*[^*]+\*\*|\n•[^\n]+|\n\d+\.[^\n]+|\n)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/^\*\*[^*]+\*\*$/)) return <strong key={i}>{part.slice(2,-2)}</strong>
        if (part === '\n') return <br key={i}/>
        if (part.match(/^\n•/)) return <span key={i}><br/>{'• '+part.slice(2)}</span>
        if (part.match(/^\n\d+\./)) return <span key={i}><br/>{part.slice(1)}</span>
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

// ─── Chatbot component ────────────────────────────────────────────────────────
export default function AECopilot() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [typing, setTyping]     = useState(false)
  const [pulse, setPulse]       = useState(true)
  const bottomRef               = useRef()
  const inputRef                = useRef()
  const navigate                = useNavigate()

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'bot', id: Date.now(),
        text: `👋 Hi! I'm **AE Buddiee** — your AI assistant for the AE Rule Engine.\n\nI can navigate you to any page, explain concepts, and guide you through workflows.\n\nWhat would you like to do?`,
        suggestions: ['Show me Analytics', 'How do I build a rule?', 'Open Review Queue', 'What is UW ingestion?', 'Run the Simulator'],
      }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, typing])

  useEffect(() => { const t = setTimeout(() => setPulse(false), 4000); return () => clearTimeout(t) }, [])

  const send = async (text) => {
    const userText = (text || input).trim()
    if (!userText) return
    setInput('')
    setPulse(false)

    const userMsg = { role:'user', id:Date.now(), text:userText }
    setMessages(m => [...m, userMsg])
    setTyping(true)

    await new Promise(r => setTimeout(r, 600 + Math.random()*400))

    const intent  = detectIntent(userText)
    const response = generateResponse(intent, userText, navigate)

    if (response.navigate) {
      setTimeout(() => navigate(response.navigate), 400)
    }

    setMessages(m => [...m, { role:'bot', id:Date.now()+1, ...response }])
    setTyping(false)
  }

  const reset = () => { setMessages([]); setOpen(false); setTimeout(() => setOpen(true), 100) }

  return (
    <>
      {/* ── Floating button ── */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:10000 }}>
        {!open && pulse && (
          <div style={{ position:'absolute', bottom:'100%', right:0, marginBottom:8, background:'#1C2333', color:'#F1F5F9', borderRadius:8, padding:'8px 12px', fontSize:12, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,.2)', border:'1px solid rgba(255,255,255,.1)' }}>
            <span style={{ color:'#60A5FA', fontWeight:600 }}>AE Buddiee</span> — Ask me anything!
            <div style={{ position:'absolute', bottom:-6, right:18, width:12, height:12, background:'#1C2333', transform:'rotate(45deg)', borderRight:'1px solid rgba(255,255,255,.1)', borderBottom:'1px solid rgba(255,255,255,.1)' }}/>
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width:54, height:54, borderRadius:'50%',
            background: open ? '#DC2626' : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
            border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: open ? '0 4px 12px rgba(220,38,38,.4)' : '0 4px 16px rgba(37,99,235,.5)',
            transition:'all .2s',
            position:'relative',
          }}>
          {open ? <X size={22} color="#fff"/> : <MessageSquare size={22} color="#fff"/>}
          {!open && (
            <span style={{ position:'absolute', top:2, right:2, width:12, height:12, background:'#059669', borderRadius:'50%', border:'2px solid #fff', animation:'pulse-dot 2s infinite' }}/>
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:'fixed', bottom:90, right:24, width:380, height:540, zIndex:9999,
          background:'#fff', borderRadius:16, border:'1px solid #E2E8F0',
          boxShadow:'0 20px 60px rgba(0,0,0,.15)', display:'flex', flexDirection:'column',
          overflow:'hidden', animation:'slideUp .2s ease',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#1C2333,#2563EB)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Sparkles size={18} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#fff' }}>AE Buddiee</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#34D399' }}/>
                AI-powered guide · Always online
              </div>
            </div>
            <button onClick={reset} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.6)', padding:4 }} title="Reset conversation">
              <RotateCcw size={14}/>
            </button>
            <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.6)', padding:4 }}>
              <X size={16}/>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', background:'#F7F9FC' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom:12, display:'flex', gap:8, alignItems:'flex-start', flexDirection: msg.role==='user' ? 'row-reverse' : 'row' }}>
                {/* Avatar */}
                <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                  background: msg.role==='bot' ? '#EFF6FF' : '#1C2333', border:`1.5px solid ${msg.role==='bot'?'rgba(37,99,235,.2)':'transparent'}` }}>
                  {msg.role==='bot' ? <Bot size={14} color="#2563EB"/> : <User size={14} color="#fff"/>}
                </div>

                <div style={{ maxWidth:'82%' }}>
                  <div style={{
                    padding:'10px 12px', borderRadius: msg.role==='bot' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    background: msg.role==='bot' ? '#fff' : '#2563EB',
                    color: msg.role==='bot' ? '#0F172A' : '#fff',
                    fontSize:13, lineHeight:1.55,
                    border: msg.role==='bot' ? '1px solid #E2E8F0' : 'none',
                    boxShadow:'0 1px 3px rgba(0,0,0,.06)',
                  }}>
                    <MessageText text={msg.text}/>
                  </div>

                  {/* Navigation chip */}
                  {msg.navigate && (
                    <button onClick={() => navigate(msg.navigate)} style={{
                      marginTop:6, display:'flex', alignItems:'center', gap:6, background:'#EFF6FF',
                      border:'1px solid rgba(37,99,235,.25)', borderRadius:20, padding:'5px 12px',
                      fontSize:12, color:'#2563EB', cursor:'pointer', fontWeight:600, transition:'all .1s',
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#DBEAFE'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#EFF6FF'}}>
                      <ChevronRight size={12}/> {ROUTES[msg.navigate]?.label || 'Navigate'}
                    </button>
                  )}

                  {/* Suggestion chips */}
                  {msg.suggestions && (
                    <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
                      {msg.suggestions.map(s=>[
                        <button key={s} onClick={()=>send(s)} style={{
                          padding:'4px 10px', borderRadius:20, background:'#fff',
                          border:'1px solid #CBD5E0', fontSize:11, color:'#475569', cursor:'pointer', transition:'all .1s',
                        }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor='#2563EB';e.currentTarget.style.color='#2563EB'}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='#CBD5E0';e.currentTarget.style.color='#475569'}}>
                          {s}
                        </button>
                      ])}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#EFF6FF', border:'1.5px solid rgba(37,99,235,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Bot size={14} color="#2563EB"/>
                </div>
                <div style={{ padding:'10px 14px', borderRadius:'4px 12px 12px 12px', background:'#fff', border:'1px solid #E2E8F0', display:'flex', gap:5, alignItems:'center' }}>
                  {[0,1,2].map(i=>[
                    <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#94A3B8', animation:`bounce-dot .8s ${i*0.15}s infinite` }}/>
                  ])}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:'10px 14px', background:'#fff', borderTop:'1px solid #F0F2F5', display:'flex', gap:8, alignItems:'center' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder="Ask me anything about AE Rule Engine…"
              style={{ flex:1, border:'1px solid #E2E8F0', borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'Inter,sans-serif', color:'#0F172A', outline:'none', transition:'border .12s' }}
              onFocus={e=>e.target.style.borderColor='#2563EB'}
              onBlur={e=>e.target.style.borderColor='#E2E8F0'}
            />
            <button onClick={()=>send()} disabled={!input.trim()} style={{
              width:36, height:36, borderRadius:8, background: input.trim() ? '#2563EB' : '#E2E8F0',
              border:'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .12s',
            }}>
              <Send size={15} color={input.trim() ? '#fff' : '#94A3B8'}/>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.7} }
        @keyframes bounce-dot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}
