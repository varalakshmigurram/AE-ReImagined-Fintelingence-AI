import { useEffect, useState } from 'react'
import { getRules, createRule, updateRule, submitRuleForReview } from '../services/api'
import { Plus, Search, Edit2, Send, Eye, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import RuleModal from '../components/RuleModal'
import RuleDetailModal from '../components/RuleDetailModal'

const PHASES = {
  BEFORE_DATA_PULL: { label: 'Before Data Pull', cls: 'phase-before', color: '#7C3AED' },
  TU_PULL:          { label: 'TU Pull',           cls: 'phase-tu',     color: '#0891B2' },
  CREDIT_GRADE:     { label: 'Credit Grade',      cls: 'phase-credit', color: '#D97706' },
  POST_CREDIT_GRADE:{ label: 'Post Credit Grade', cls: 'phase-credit', color: '#0891B2' },
}

const STATUS_MAP = {
  APPROVED:       { cls: 'approved', dot: '#059669' },
  PENDING_REVIEW: { cls: 'pending',  dot: '#D97706' },
  DRAFT:          { cls: 'draft',    dot: '#94A3B8' },
  REJECTED:       { cls: 'rejected', dot: '#DC2626' },
}

export default function Rules() {
  const [env, setEnv]           = useState('TEST')
  const [rules, setRules]       = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRule, setEditRule]   = useState(null)
  const [viewRule, setViewRule]   = useState(null)
  const [phaseFilter, setPhaseFilter] = useState('ALL')
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    getRules(env).then(data => { setRules(data); setFiltered(data) }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [env])

  useEffect(() => {
    let f = rules
    if (phaseFilter !== 'ALL') f = f.filter(r => r.phase === phaseFilter)
    if (search) f = f.filter(r =>
      r.ruleId?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.applicableSegment?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(f)
  }, [rules, search, phaseFilter])

  const handleSave = async (data, submitAfter = false) => {
    if (saving) {
      toast.error('Save in progress, please wait...')
      return
    }
    
    setSaving(true)
    try {
      let savedRule
      if (editRule) { 
        console.log('[Rules] Updating rule:', editRule.id, data)
        savedRule = await updateRule(editRule.id, data)
        if (!savedRule) {
          console.warn('[Rules] updateRule returned null, using optimistic merge')
          savedRule = { ...editRule, ...data }
        }
      } else { 
        console.log('[Rules] Creating new rule:', data)
        savedRule = await createRule(data)
      }
      
      console.log('[Rules] Save successful, savedRule:', savedRule)
      
      // Optimistic update
      if (editRule) {
        setRules(rules.map(r => r.id === editRule.id ? savedRule : r))
      } else {
        setRules([...rules, savedRule])
      }
      
      if (submitAfter && (savedRule.approvalStatus === 'DRAFT' || savedRule.approvalStatus === 'REJECTED')) {
        await submitRuleForReview(savedRule.id)
        toast.success(`${data.ruleId} saved and submitted for review`)
        setRules(r => r.map(rule => rule.id === savedRule.id ? { ...rule, approvalStatus: 'PENDING_REVIEW' } : rule))
      } else {
        toast.success(editRule ? 'Rule updated' : 'Rule created')
      }
      setShowModal(false)
      setEditRule(null)
    } catch (e) {
      console.error('[Rules] Save error:', e)
      const errorMsg = e.response?.data?.message || e.message || 'Error saving rule'
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (rule) => {
    try {
      await submitRuleForReview(rule.id)
      toast.success(`${rule.ruleId} submitted for Approver review`)
      setRules(rules.map(r => r.id === rule.id ? { ...r, approvalStatus: 'PENDING_REVIEW' } : r))
    } catch (e) { toast.error('Could not submit for review') }
  }

  // Phase counts for the filter bar
  const phaseCounts = rules.reduce((a, r) => { a[r.phase] = (a[r.phase]||0)+1; return a }, {})

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Rules</div>
          <div className="page-subtitle">
            {filtered.length} of {rules.length} rules — Affiliate Engine decision logic
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div className="env-selector">
            {['TEST','PROD'].map(e => (
              <button key={e} className={`env-btn ${e.toLowerCase()} ${env===e?'active':''}`} onClick={() => setEnv(e)}>{e}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { setEditRule(null); setShowModal(true) }}>
            <Plus size={13}/> New Rule
          </button>
        </div>
      </div>

      {/* Phase filter + search */}
      <div className="action-bar">
        <div className="tabs">
          <button className={`tab ${phaseFilter==='ALL'?'active':''}`} onClick={() => setPhaseFilter('ALL')}>
            All <span style={{ marginLeft:4, fontSize:10, background:'var(--border)', color:'var(--text-muted)', borderRadius:10, padding:'1px 6px' }}>{rules.length}</span>
          </button>
          {Object.entries(PHASES).map(([k, v]) => (
            <button key={k} className={`tab ${phaseFilter===k?'active':''}`} onClick={() => setPhaseFilter(k)}>
              {v.label}
              {phaseCounts[k] > 0 && <span style={{ marginLeft:4, fontSize:10, background:'var(--border)', color:'var(--text-muted)', borderRadius:10, padding:'1px 5px' }}>{phaseCounts[k]}</span>}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={13} className="search-icon"/>
          <input className="form-control" placeholder="Search by Rule ID, description…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding:48, display:'flex', justifyContent:'center' }}><div className="spinner"/></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width:48 }}>#</th>
                  <th>Rule ID</th>
                  <th>Description</th>
                  <th>Segment</th>
                  <th>Cutoffs</th>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Env</th>
                  <th style={{ width:100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
                    {search ? `No rules match "${search}"` : 'No rules found — click New Rule to create one'}
                  </td></tr>
                ) : filtered.map(rule => {
                  const sm = STATUS_MAP[rule.approvalStatus] || STATUS_MAP.DRAFT
                  return (
                    <tr key={rule.id}>
                      <td><span className="tag" style={{ fontFamily:'var(--mono)', fontSize:10 }}>{rule.ruleNumber}</span></td>

                      {/* Rule ID — highlighted as primary identifier */}
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ width:7, height:7, borderRadius:'50%', background:sm.dot, flexShrink:0 }}/>
                          <span style={{
                            fontFamily:'var(--mono)', fontWeight:700, fontSize:12,
                            color:'var(--accent)', background:'var(--accent-light)',
                            padding:'2px 8px', borderRadius:4,
                            border:'1px solid rgba(37,99,235,.15)',
                            display:'inline-block',
                          }}>{rule.ruleId}</span>
                        </div>
                      </td>

                      <td style={{ maxWidth:300, padding:'10px 14px' }}>
                        <div style={{ fontSize:13, fontWeight:700, lineHeight:1.4, color:'#000',
                          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                          {rule.description}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize:13, fontWeight:500, color:'#0891B2', fontFamily:'var(--sans)' }}>
                          {rule.applicableSegment || '—'}
                        </span>
                      </td>

                      <td>
                        {rule.cutoffs
                          ? <span style={{ fontSize:13, fontWeight:700, color:'#D97706', fontFamily:'var(--mono)' }}>{rule.cutoffs}</span>
                          : <span style={{ color:'var(--text-muted)', fontSize:13 }}>—</span>}
                      </td>

                      <td>
                        {PHASES[rule.phase] && (
                          <span className={`badge ${PHASES[rule.phase].cls}`} style={{ fontSize:10 }}>
                            {PHASES[rule.phase].label}
                          </span>
                        )}
                      </td>

                      <td><span className={`badge badge-${sm.cls}`}>{rule.approvalStatus?.replace(/_/g,' ')}</span></td>
                      <td><span className={`badge badge-${rule.environment?.toLowerCase()}`}>{rule.environment}</span></td>

                      <td>
                        <div className="row-actions" style={{ opacity:1 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" title="View detail" onClick={() => setViewRule(rule)}>
                            <Eye size={12}/>
                          </button>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => { setEditRule(rule); setShowModal(true) }}>
                            <Edit2 size={12}/>
                          </button>
                          {(rule.approvalStatus==='DRAFT' || rule.approvalStatus==='REJECTED') && (
                            <button className="btn btn-sm btn-icon"
                              style={{ background:'var(--purple-light)', color:'var(--purple)', border:'1px solid rgba(124,58,237,.2)' }}
                              title="Submit for Approver review" onClick={() => handleSubmit(rule)}>
                              <Send size={12}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-muted)', background:'var(--bg-card2)' }}>
            <Shield size={12}/>
            Showing {filtered.length} rule{filtered.length!==1?'s':''}{search?` matching "${search}"`:''}
            {phaseFilter !== 'ALL' && ` in ${PHASES[phaseFilter]?.label}`}
            <span style={{ marginLeft:'auto' }}>Submit to Lead Analyst → Approver workflow</span>
          </div>
        )}
      </div>

      {showModal && <RuleModal rule={editRule} onSave={handleSave} onClose={() => { setShowModal(false); setEditRule(null) }}/>}
      {viewRule && <RuleDetailModal rule={viewRule} onClose={() => setViewRule(null)}/>}
    </div>
  )
}
